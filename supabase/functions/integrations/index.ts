import {
  createAdminClient,
  createAuthClient,
  corsHeaders,
  corsResponse,
  errorResponse,
} from "../shared/utils.ts";
import {
  encryptConfig,
  readConfig,
  paymentConfig,
  deliverDocuments,
} from "../shared/integrations.ts";
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
    if (!staff || profile?.role !== "super_admin")
      return errorResponse("Super admin with MFA required", 403);
    const body = await req.json();
    if (body.action === "save") {
      if (!["bakong", "resend"].includes(body.provider))
        return errorResponse("Unknown provider");
      const previous = await readConfig(admin, body.provider),
        input = body.config || {},
        next: Record<string, string> = { ...previous };
      if (body.provider === "bakong") {
        const effective = await paymentConfig(admin);
        for (const field of [
          "receiver",
          "token",
          "merchantName",
          "merchantCity",
        ] as const)
          if (!next[field]) next[field] = effective[field];
      }
      const fields =
        body.provider === "bakong"
          ? ["receiver", "token", "merchantName", "merchantCity"]
          : ["apiKey", "from"];
      for (const field of fields)
        if (typeof input[field] === "string" && input[field].trim())
          next[field] = input[field].trim();
      if (Object.values(next).some((v) => v.length > 6000 || /[\r\n]/.test(v)))
        return errorResponse("Invalid integration value");
      if (
        body.provider === "bakong" &&
        (!/^[^\s@]+@[^\s@]+$/.test(next.receiver || "") ||
          !next.token ||
          !next.merchantName ||
          !next.merchantCity ||
          next.merchantName.length > 25 ||
          next.merchantCity.length > 15)
      )
        return errorResponse(
          "Provide Bakong account ID, API token, merchant name and city",
        );
      if (
        body.provider === "resend" &&
        (!next.apiKey?.startsWith("re_") ||
          !/^([^<>]+<)?[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>?$/.test(next.from || ""))
      )
        return errorResponse(
          "Provide a Resend API key and verified sender email",
        );
      const { error: saveError } = await admin
        .from("integration_secrets")
        .upsert({
          provider: body.provider,
          ciphertext: await encryptConfig(body.provider, next),
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        });
      if (saveError) throw saveError;
      await admin.from("activity_logs").insert({
        actor_id: user.id,
        action: "integration_updated",
        resource_type: "integration",
        metadata: { provider: body.provider },
      });
    } else if (body.action === "live_toggle") {
      if (typeof body.enabled !== "boolean")
        return errorResponse("Choose enabled or disabled");
      const config = await paymentConfig(admin);
      if (
        body.enabled &&
        (!config.receiver ||
          !config.token ||
          body.confirm !== "ENABLE REAL PAYMENTS")
      )
        return errorResponse(
          "Configure Bakong and confirm real payments first",
        );
      const { error } = await auth.rpc("set_live_payments", {
        p_enabled: body.enabled,
      });
      if (error) return errorResponse(error.message, 403);
    } else if (body.action === "mode") {
      if (!["live", "demo"].includes(body.mode))
        return errorResponse("Invalid environment");
      const config = await paymentConfig(admin);
      if (
        body.mode === "live" &&
        (!config.receiver ||
          !config.token ||
          body.confirm !== "ENABLE REAL PAYMENTS")
      )
        return errorResponse(
          "Configure Bakong and confirm real payments first",
        );
      const { error: saveError } = await admin
        .from("payment_settings")
        .update({ mode: body.mode, updated_at: new Date().toISOString() })
        .eq("id", true);
      if (saveError) throw saveError;
      await admin.from("activity_logs").insert({
        actor_id: user.id,
        action: "payment_mode_changed",
        resource_type: "integration",
        metadata: { mode: body.mode },
      });
    } else if (body.action === "send_pending")
      return corsResponse(await deliverDocuments(admin));
    else if (body.action !== "get") return errorResponse("Unknown action");
    const bakong = await paymentConfig(admin),
      email = await readConfig(admin, "resend");
    return corsResponse({
      mode: bakong.mode,
      live_enabled: bakong.liveEnabled,
      bakong: {
        configured: !!(bakong.receiver && bakong.token),
        receiver: bakong.receiver,
        merchantName: bakong.merchantName,
        merchantCity: bakong.merchantCity,
      },
      email: {
        configured: !!(email.apiKey && email.from),
        from: email.from || "",
      },
    });
  } catch {
    return errorResponse("Integration settings could not be processed", 400);
  }
});
