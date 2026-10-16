import {
  createAdminClient,
  createAuthClient,
  corsHeaders,
  corsResponse,
  errorResponse,
} from "../shared/utils.ts";
Deno.serve(async (req) => {
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
    const { data: staff } = await auth.rpc("staff_session");
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!staff || !["super_admin", "auctioneer"].includes(profile?.role))
      return errorResponse("Identity reviewer with MFA required", 403);
    const { user_id } = await req.json();
    const { data: subject } = await admin
      .from("profiles")
      .select("identity_document_path")
      .eq("id", user_id)
      .single();
    if (!subject?.identity_document_path)
      return errorResponse("No document uploaded", 404);
    const { error: logError } = await admin
      .from("activity_logs")
      .insert({
        actor_id: user.id,
        action: "identity_document_accessed",
        resource_type: "profile",
        resource_id: user_id,
      });
    if (logError) throw logError;
    const { data, error: urlError } = await admin.storage
      .from("identity-documents")
      .createSignedUrl(subject.identity_document_path, 60);
    if (urlError) throw urlError;
    return corsResponse({ url: data.signedUrl });
  } catch {
    return errorResponse("Document unavailable", 400);
  }
});
