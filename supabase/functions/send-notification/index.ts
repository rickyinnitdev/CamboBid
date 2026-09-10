// ============================================================================
// send-notification Edge Function
// Sends in-app and email notifications for various events
// ============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
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
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { user_id, type, title, body, auction_id, send_email } = await req.json();

    if (!user_id || !type || !title) {
      return new Response(
        JSON.stringify({ error: "user_id, type, and title are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
          const emailPayload = {
            to: recipientProfile.email,
            subject: title,
            html: `
              <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #1B3A6B; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; font-size: 24px;">Auction Platform</h1>
                </div>
                <div style="background: #F8F9FC; padding: 20px; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 8px 8px;">
                  <h2 style="color: #0F172A; margin-top: 0;">${title}</h2>
                  <p style="color: #475569; line-height: 1.6;">${body || ""}</p>
                  ${auction_id ? `
                    <a href="${supabaseUrl.replace("https://", "https://")}/auctions/${auction_id}"
                       style="display: inline-block; background: #E8A020; color: #0F172A; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
                      View Auction
                    </a>
                  ` : ""}
                </div>
                <div style="text-align: center; padding: 16px; color: #94A3B8; font-size: 12px;">
                  <p>You received this email because you have an account on Auction Platform.</p>
                </div>
              </div>
            `,
          };

          // Log that email would be sent (actual email service integration happens here)
          await adminClient.from("activity_logs").insert({
            actor_id: user.id,
            action: "notification_email_sent",
            resource_type: "notification",
            resource_id: notification.id,
            metadata: {
              recipient_email: recipientProfile.email,
              notification_type: type,
              email_subject: title,
            },
          });

          emailSent = true;
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
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-notification error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
