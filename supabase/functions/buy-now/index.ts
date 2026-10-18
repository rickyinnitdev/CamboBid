import { secureServe } from "../shared/http.ts";
import {
  createAuthClient,
  createAdminClient,
  corsHeaders,
  corsResponse,
  errorResponse,
} from "../shared/utils.ts";
import { deliverDocuments } from "../shared/integrations.ts";
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
    const { data, error } = await auth.rpc("buy_funded_auction", {
      p_auction: body.auction_id,
      p_expected_minor: body.expected_minor,
    });
    if (error) return errorResponse(error.message, 400);
    try {
      const admin = createAdminClient(),
        channel = admin.channel(`auction:${body.auction_id}`);
      await channel.send({
        type: "broadcast",
        event: "auction_closed",
        payload: {
          auction_id: body.auction_id,
          winner_id: user.id,
          order_id: data.order_id,
        },
      });
      await admin.removeChannel(channel);
      await deliverDocuments(admin, user.id);
    } catch {
      /* Purchase committed; documents stay queued if delivery is unavailable. */
    }
    return corsResponse(data);
  } catch {
    return errorResponse(
      "Purchase could not be processed. Refresh your orders before retrying.",
      400,
    );
  }
});
