import { secureServe } from "../shared/http.ts";
import { deliverDocuments } from "../shared/integrations.ts";
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

    const { data, error } = await auth.rpc("close_funded_auction", {
      p_auction: body.auction_id,
      p_reason: body.reason || null,
    });
    if (error) return errorResponse(error.message, 400);
    try {
      const admin = createAdminClient();
      try {
        if (data.winner_id) await deliverDocuments(admin, data.winner_id);
      } catch {
        /* Documents remain queued. */
      }
      const channel = admin.channel(`auction:${body.auction_id}`);
      await channel.send({
        type: "broadcast",
        event: "auction_closed",
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
