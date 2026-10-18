import { secureServe } from "../shared/http.ts";
import {
  createAdminClient,
  createAuthClient,
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
    const auth = createAuthClient(req),
      admin = createAdminClient();
    const {
      data: { user },
      error,
    } = await auth.auth.getUser();
    if (error || !user) return errorResponse("Unauthorized", 401);
    const { data: security, error: statusError } =
      await auth.rpc("account_security");
    if (statusError || security.suspended || !security.session_verified)
      return errorResponse("Verified authenticator session required", 403);
    const body = await req.json();
    return corsResponse(
      await deliverDocuments(admin, user.id, body.document_id),
    );
  } catch {
    return errorResponse("Email processing unavailable", 400);
  }
});
