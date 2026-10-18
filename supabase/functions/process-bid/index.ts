import { secureServe } from "../shared/http.ts";
import {
  createAuthClient,
  createAdminClient,
  corsHeaders,
  corsResponse,
  errorResponse,
} from "../shared/utils.ts";
secureServe(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);
  try {
    const auth = createAuthClient(req);
    const {
      data: { user },
      error: authError,
    } = await auth.auth.getUser();
    if (authError || !user) return errorResponse("Unauthorized", 401);
    const body = await req.json();
    if (
      !Number.isFinite(body.amount) ||
      body.amount <= 0 ||
      Math.abs(body.amount * 100 - Math.round(body.amount * 100)) > 0.00001 ||
      (body.is_proxy &&
        (!Number.isFinite(body.proxy_max_amount) ||
          Math.abs(
            body.proxy_max_amount * 100 -
              Math.round(body.proxy_max_amount * 100),
          ) > 0.00001))
    )
      return errorResponse("Use a valid amount with at most two decimals");
    const { data, error } = await auth.rpc("place_funded_bid", {
      p_auction: body.auction_id,
      p_amount: Math.round(body.amount * 100),
      p_cap: body.is_proxy ? Math.round(body.proxy_max_amount * 100) : null,
      p_device: body.device_fingerprint || null,
    });
    if (error) return errorResponse(error.message, 400);
    try {
      const admin = createAdminClient();
      const channel = admin.channel(`auction:${body.auction_id}`);
      await channel.send({
        type: "broadcast",
        event: "new_bid",
        payload: data,
      });
      await admin.removeChannel(channel);
    } catch {
      console.warn("Broadcast unavailable; database settlement succeeded");
    }
    return corsResponse(data);
  } catch {
    return errorResponse("Request could not be processed", 400);
  }
});
