import { supabase } from "./supabase";
import { invoke } from "./securityService";
export const walletService = {
  config: () => invoke("payments", { action: "config" }),
  async overview() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Sign in first");
    const results = await Promise.all([
      supabase.from("wallet_accounts").select("*").eq("user_id", user.id),
      supabase
        .from("wallet_ledger")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("payment_checkouts")
        .select(
          "id,mode,amount_minor,currency,order_id,status,qr,created_at,expires_at,paid_at,auction_id,purchased_order_id,purchase_note,bid_auction_id,submitted_bid_id",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    for (const result of results) if (result.error) throw result.error;
    return {
      accounts: results[0].data,
      ledger: results[1].data,
      payments: results[2].data,
    };
  },
  create: (amountMinor, orderId, auctionId) =>
    invoke("payments", {
      action: "create",
      amount_minor: amountMinor,
      order_id: orderId,
      auction_id: auctionId,
    }),
  createBid: (amountMinor, auctionId, signal) =>
    invoke(
      "payments",
      {
        action: "create",
        amount_minor: amountMinor,
        bid_auction_id: auctionId,
      },
      signal,
    ),
  createPurchase: (amountMinor, auctionId, signal) =>
    invoke(
      "payments",
      { action: "create", amount_minor: amountMinor, auction_id: auctionId },
      signal,
    ),
  check: (id, signal) => invoke("payments", { action: "check", id }, signal),
  simulate: (id) => invoke("payments", { action: "simulate", id }),
};
