import { secureServe } from "../shared/http.ts";
import {
  createAuthClient,
  createAdminClient,
  corsHeaders,
  corsResponse,
  errorResponse,
} from "../shared/utils.ts";
import {
  encryptConfig,
  decryptConfig,
  protectFingerprint,
  protectLegacyFingerprints,
} from "../shared/integrations.ts";
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
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
    if (!uuid.test(String(body.id || "")))
      return errorResponse("Invalid request ID");
    if (body.action === "create") {
      if (
        !["demo", "live"].includes(body.mode) ||
        !Number.isSafeInteger(body.amount_minor) ||
        body.amount_minor < 1 ||
        body.amount_minor > 100000
      )
        return errorResponse("Enter $0.01–$1,000 in USD");
      const input = body.destination || {};
      const destination = {
        bank: String(input.bank || "").trim(),
        holder: String(input.holder || "").trim(),
        account: String(input.account || "").replace(/[\s-]/g, ""),
      };
      if (
        destination.bank.length < 2 ||
        destination.bank.length > 80 ||
        destination.holder.length < 2 ||
        destination.holder.length > 100 ||
        !/^\d{4,34}$/.test(destination.account) ||
        /[\u0000-\u001f\u007f]/.test(destination.bank + destination.holder)
      )
        return errorResponse(
          "Provide a bank name, account holder and valid account number",
        );
      const { error: eligible } = await auth.rpc("require_eligible");
      if (eligible) return errorResponse(eligible.message, 403);
      await protectLegacyFingerprints(admin);
      const serialized = JSON.stringify(destination);
      const fingerprint = Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(body.id + ":" + serialized),
          ),
        ),
      )
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const { data, error } = await auth.rpc("request_withdrawal", {
        p_id: body.id,
        p_mode: body.mode,
        p_amount: body.amount_minor,
        p_summary: destination.bank + " · ••••" + destination.account.slice(-4),
        p_ciphertext: await encryptConfig("withdrawal:" + body.id, destination),
        p_fingerprint: await protectFingerprint(fingerprint),
      });
      if (error) return errorResponse(error.message, 400);
      // The full destination is never returned on create or normal history reads.
      return corsResponse(data);
    }
    if (body.action === "destination") {
      const { data: staff } = await auth.rpc("payout_staff_session");
      if (!staff) return errorResponse("Finance staff with MFA required", 403);
      const { data: request, error: readError } = await admin
        .from("withdrawal_requests")
        .select("id,reviewed_by")
        .eq("id", body.id)
        .single();
      if (readError || !request)
        return errorResponse("Withdrawal not found", 404);
      const { data: profile } = await admin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role !== "super_admin" && request.reviewed_by !== user.id)
        return errorResponse(
          "Claim this request before opening its bank details",
          403,
        );
      const { data: privateRow, error } = await admin
        .from("withdrawal_destinations")
        .select("ciphertext")
        .eq("request_id", body.id)
        .single();
      if (error || !privateRow) throw new Error("Destination unavailable");
      const destination = await decryptConfig(
        "withdrawal:" + body.id,
        privateRow.ciphertext,
      );
      const { error: auditError } = await admin.from("activity_logs").insert({
        actor_id: user.id,
        action: "withdrawal_destination_viewed",
        resource_type: "withdrawal",
        resource_id: body.id,
      });
      if (auditError) throw auditError;
      return corsResponse(destination);
    }
    return errorResponse("Unknown action");
  } catch {
    return errorResponse(
      "Withdrawal could not be processed. Refresh your history before retrying.",
      400,
    );
  }
});
