import { secureServe } from "../shared/http.ts";
// ============================================================================
// send-notification Edge Function
// Sends in-app and email notifications for various events
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

secureServe(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    // Verify JWT
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: staff, error: staffError } =
      await supabase.rpc("staff_session");
    if (staffError || !staff)
      return new Response(
        JSON.stringify({ error: "Staff with MFA required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    const { data: allowed, error: budgetError } = await adminClient.rpc(
      "claim_api_action",
      {
        p_user: user.id,
        p_action: "notification_send",
        p_limit: 30,
        p_window: 60,
      },
    );
    if (budgetError) throw budgetError;
    if (!allowed)
      return new Response(
        JSON.stringify({ error: "Notification limit reached" }),
        { status: 429, headers: corsHeaders },
      );
    const { user_id, type, title, body, auction_id, send_email } =
      await req.json();

    if (
      !user_id ||
      typeof type !== "string" ||
      type.length > 100 ||
      typeof title !== "string" ||
      !title ||
      title.length > 200 ||
      (body && (typeof body !== "string" || body.length > 4000))
    ) {
      return new Response(
        JSON.stringify({ error: "user_id, type, and title are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Insert in-app notification
    const { data: notification, error: notifError } = await adminClient
      .from("notifications")
      .insert({
        user_id,
        type,
        title,
        body: body || "",
        auction_id: auction_id || null,
      })
      .select()
      .single();

    if (notifError) {
      return new Response(
        JSON.stringify({ error: "Failed to create notification" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Send email if requested
    let emailSent = false;
    if (send_email) {
      try {
        const { data: recipientProfile } = await adminClient
          .from("profiles")
          .select("email, display_name")
          .eq("id", user_id)
          .single();

        if (recipientProfile?.email) {
          // Log that email would be sent (actual email service integration happens here)
          await adminClient.from("activity_logs").insert({
            actor_id: user.id,
            action: "notification_email_requested",
            resource_type: "notification",
            resource_id: notification.id,
            metadata: {
              recipient_email: recipientProfile.email,
              notification_type: type,
              email_subject: title,
            },
          });

          emailSent = false; // No email transport is configured.
        }
      } catch (emailErr) {
        console.error("Email sending failed:", emailErr);
        // Don't fail the whole request for email errors
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notification,
        email_sent: emailSent,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("send-notification error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
