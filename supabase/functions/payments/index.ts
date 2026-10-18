import { secureServe } from "../shared/http.ts";
// Adapted from NetView's KHQR starter: server-generated QR and verified receipts.
// Database completion owns idempotency; no browser callback can credit money.
import { createKhqr, verifiedReceiptHash } from "../shared/payment-provider.ts";
import {
  createAdminClient,
  createAuthClient,
  corsHeaders,
  corsResponse,
  errorResponse,
} from "../shared/utils.ts";

import { paymentConfig, deliverDocuments } from "../shared/integrations.ts";
const publicFields =
  "id,mode,amount_minor,currency,order_id,status,qr,created_at,expires_at,paid_at,auction_id,purchased_order_id,purchase_note,bid_auction_id,submitted_bid_id";

secureServe(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);
  try {
    const auth = createAuthClient(req),
      admin = createAdminClient();
    const {
      data: { user },
      error: authError,
    } = await auth.auth.getUser();
    if (authError || !user) return errorResponse("Unauthorized", 401);
    const body = await req.json();
    const config = await paymentConfig(admin),
      mode = config.mode;
    if (body.action === "config")
      return corsResponse({
        mode,
        live_enabled: config.liveEnabled,
        live_ready: !!(config.receiver && config.token),
      });
    const inspecting = body.action === "inspect";
    if (inspecting) {
      const { data: staff } = await auth.rpc("staff_session");
      const { data: profile } = await admin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (!staff || profile?.role !== "super_admin")
        return errorResponse("Super admin with MFA required", 403);
    } else {
      const { error: eligible } = await auth.rpc("require_eligible");
      if (eligible) return errorResponse(eligible.message, 403);
    }
    if (body.action === "create") {
      if (mode === "live" && !config.liveEnabled)
        return errorResponse(
          "Real payments are paused by the administrator",
          403,
        );
      let amount = body.amount_minor;
      if (body.bid_auction_id) {
        if (body.auction_id || body.order_id || mode !== "live")
          return errorResponse("Choose one live checkout purpose", 409);
        const { data: existing } = await admin
          .from("payment_checkouts")
          .select(publicFields)
          .eq("user_id", user.id)
          .eq("bid_auction_id", body.bid_auction_id)
          .eq("amount_minor", amount)
          .eq("status", "pending")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existing) return corsResponse(existing);
      }
      if (body.auction_id) {
        if (body.order_id || mode !== "live")
          return errorResponse(
            "Direct KHQR purchases require a live auction",
            409,
          );
        const { data: auction } = await admin
          .from("auctions")
          .select("payment_mode,listings!inner(buy_it_now_price)")
          .eq("id", body.auction_id)
          .single();
        const listing = Array.isArray(auction?.listings)
          ? auction.listings[0]
          : auction?.listings;
        const price = Math.round(Number(listing?.buy_it_now_price) * 100);
        if (
          !auction ||
          auction.payment_mode !== "live" ||
          !price ||
          body.amount_minor !== price
        )
          return errorResponse(
            "Buy Now price changed. Return to the item and review it again",
            409,
          );
        amount = price;
        const { data: existing } = await admin
          .from("payment_checkouts")
          .select(publicFields)
          .eq("auction_id", body.auction_id)
          .eq("user_id", user.id)
          .eq("status", "pending")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existing) return corsResponse(existing);
      }
      if (body.order_id) {
        const { data: order, error } = await admin
          .from("escrow_transactions")
          .select("*")
          .eq("id", body.order_id)
          .eq("buyer_id", user.id)
          .single();
        if (
          error ||
          !order ||
          order.status !== "pending" ||
          order.payment_mode !== mode
        )
          return errorResponse("Order is not payable in this environment", 409);
        amount = Math.round(Number(order.amount) * 100);
        const { error: expireError } = await admin
          .from("payment_checkouts")
          .update({ status: "expired" })
          .eq("order_id", order.id)
          .eq("status", "pending")
          .lte("expires_at", new Date().toISOString());
        if (expireError) throw expireError;
        const { data: existing } = await admin
          .from("payment_checkouts")
          .select(publicFields)
          .eq("order_id", order.id)
          .eq("status", "pending")
          .maybeSingle();
        if (existing) return corsResponse(existing);
      }
      if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100000)
        return errorResponse("Checkout must be $0.01–$1,000 in integer cents");
      const { data: permitted, error: budgetError } = await admin.rpc(
        "claim_api_action",
        {
          p_user: user.id,
          p_action: "checkout_create",
          p_limit: 20,
          p_window: 3600,
        },
      );
      if (budgetError) throw budgetError;
      if (!permitted)
        return errorResponse("Checkout limit reached. Try again later", 429);
      const id = crypto.randomUUID(),
        expires = new Date(Date.now() + 300000).toISOString();
      let qr = null,
        md5 = null,
        receiver = null;
      if (mode === "live") {
        receiver = config.receiver;
        if (!receiver || !config.token)
          throw new Error("Live payments are not configured");
        ({ qr, md5 } = createKhqr({
          receiver,
          merchantName: config.merchantName,
          merchantCity: config.merchantCity,
          id,
          amountMinor: amount,
          expiresAt: Date.parse(expires),
        }));
      }
      const { data, error } = await admin
        .from("payment_checkouts")
        .insert({
          id,
          user_id: user.id,
          mode,
          amount_minor: amount,
          order_id: body.order_id || null,
          auction_id: body.auction_id || null,
          bid_auction_id: body.bid_auction_id || null,
          qr,
          md5,
          receiver,
          expires_at: expires,
        })
        .select(publicFields)
        .single();
      if (error) throw error;
      return corsResponse(data);
    }
    if (!["check", "simulate", "inspect"].includes(body.action))
      return errorResponse("Unknown action");
    let query = admin.from("payment_checkouts").select("*").eq("id", body.id);
    if (!inspecting) query = query.eq("user_id", user.id);
    const { data: p, error } = await query.single();
    if (error || !p) return errorResponse("Payment not found", 404);
    // Existing receipts must remain checkable after an environment switch or pause.
    const checkoutMode = p.mode;
    if (body.action === "simulate" && checkoutMode !== "demo")
      return errorResponse("Simulation is disabled for live payments", 403);
    if (!["pending", "expired"].includes(p.status))
      return corsResponse(
        Object.fromEntries(publicFields.split(",").map((k) => [k, p[k]])),
      );
    let hash: string | null = null;
    if (body.action === "simulate") hash = `demo-${p.id}`;
    else if (checkoutMode === "live") {
      const { data: claimed, error: claimError } = await admin.rpc(
        "claim_payment_check",
        { p_id: p.id },
      );
      if (claimError) throw claimError;
      if (!claimed)
        return corsResponse(
          Object.fromEntries(publicFields.split(",").map((k) => [k, p[k]])),
        );
      const token = config.token;
      if (!token) throw new Error("Live payments are not configured");
      const response = await fetch(
        "https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5",
        {
          method: "POST",
          redirect: "error",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ md5: p.md5 }),
          signal: AbortSignal.timeout(20000),
        },
      );
      if (!response.ok)
        return errorResponse(
          "Bakong verification unavailable. Retry later",
          502,
        );
      const result = await response.json();
      if (result.responseCode === 0) {
        try {
          hash = verifiedReceiptHash(
            result.data,
            p.receiver,
            Number(p.amount_minor),
          );
        } catch {
          return errorResponse("Receipt does not match checkout", 409);
        }
      } else if (result.errorCode !== 1)
        return errorResponse("Bakong did not confirm this transaction", 502);
    }
    if (hash) {
      const { error: completeError } = await admin.rpc("complete_checkout", {
        p_id: p.id,
        p_hash: hash,
      });
      if (completeError) throw completeError;
      try {
        // Email delivery must never delay receipt confirmation or navigation.
        const job = deliverDocuments(admin, user.id).catch(() => {});
        const runtime = (
          globalThis as unknown as {
            EdgeRuntime?: { waitUntil(p: Promise<unknown>): void };
          }
        ).EdgeRuntime;
        if (runtime) runtime.waitUntil(job);
      } catch {
        /* Durable queue remains retryable. */
      }
    } else if (Date.parse(p.expires_at) <= Date.now()) {
      const { error: expiryError } = await admin
        .from("payment_checkouts")
        .update({ status: "expired" })
        .eq("id", p.id)
        .eq("status", "pending");
      if (expiryError) throw expiryError;
    }
    const { data: updated, error: readError } = await admin
      .from("payment_checkouts")
      .select(publicFields)
      .eq("id", p.id)
      .single();
    if (readError) throw readError;
    return corsResponse(updated);
  } catch (error) {
    console.error(
      "Payment action failed",
      error instanceof Error ? error.message : "unknown",
    );
    return errorResponse(
      "Payment verification is temporarily unavailable. Your checkout is saved; retry checking it without paying again.",
      503,
    );
  }
});
