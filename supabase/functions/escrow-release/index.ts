import { deliverDocuments } from "../shared/integrations.ts";
import {
  createAuthClient,
  createAdminClient,
  corsHeaders,
  corsResponse,
  errorResponse,
} from "../shared/utils.ts";
Deno.serve(async (req) => {
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

    const { data, error } = await auth.rpc("settle_order", {
      p_order: body.escrow_id,
      p_action: body.action,
      p_notes: body.notes || null,
    });
    if (error) return errorResponse(error.message, 400);

    try {
      const admin = createAdminClient();
      const { data: order } = await admin
        .from("escrow_transactions")
        .select("buyer_id")
        .eq("id", body.escrow_id)
        .single();
      if (order) await deliverDocuments(admin, order.buyer_id);
    } catch {
      /* Documents stay in the durable queue for retry. */
    }

    return corsResponse(data);
  } catch {
    return errorResponse("Request could not be processed", 400);
  }
});
