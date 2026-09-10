// ============================================================================
// escrow-release Edge Function
// Release, refund, or freeze escrow transactions (escrow manager only)
// ============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EscrowAction = "release" | "refund" | "freeze";

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

    // Check role
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "super_admin" && profile?.role !== "escrow_manager") {
      return new Response(
        JSON.stringify({ error: "Only escrow managers can perform this action" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { escrow_id, action, notes } = await req.json() as {
      escrow_id: string;
      action: EscrowAction;
      notes?: string;
    };

    if (!escrow_id || !action) {
      return new Response(
        JSON.stringify({ error: "escrow_id and action required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validActions: EscrowAction[] = ["release", "refund", "freeze"];
    if (!validActions.includes(action)) {
      return new Response(
        JSON.stringify({ error: `Invalid action. Must be: ${validActions.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get escrow transaction
    const { data: escrow, error: escrowError } = await adminClient
      .from("escrow_transactions")
      .select("*, auctions(*, listings(title, seller_id)), profiles!buyer_id(display_name)")
      .eq("id", escrow_id)
      .single();

    if (escrowError || !escrow) {
      return new Response(
        JSON.stringify({ error: "Escrow transaction not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate state transitions
    const validTransitions: Record<string, string[]> = {
      pending: ["frozen"],
      held: ["released", "refunded", "frozen"],
      frozen: ["released", "refunded", "held"],
      released: [],
      refunded: [],
    };

    const targetStatusByAction: Record<EscrowAction, string> = {
      release: "released",
      refund: "refunded",
      freeze: "frozen",
    };
    const targetStatus = targetStatusByAction[action];

    if (!validTransitions[escrow.status]?.includes(targetStatus)) {
      return new Response(
        JSON.stringify({
          error: `Cannot ${action} escrow in ${escrow.status} status`,
          current_status: escrow.status,
          allowed_transitions: validTransitions[escrow.status],
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Capture before state
    const beforeSnapshot = {
      status: escrow.status,
      amount: escrow.amount,
      notes: escrow.notes,
    };

    // Build update
    const now = new Date().toISOString();
    let newStatus = targetStatus;
    const updateData: Record<string, any> = {
      released_by: user.id,
      notes: notes || escrow.notes,
    };

    switch (action) {
      case "release":
        updateData.released_at = now;
        break;
      case "refund":
        updateData.refunded_at = now;
        break;
      case "freeze":
        updateData.frozen_at = now;
        break;
    }

    updateData.status = newStatus;

    // Update escrow
    const { error: updateError } = await adminClient
      .from("escrow_transactions")
      .update(updateData)
      .eq("id", escrow_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to update escrow" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log activity
    await adminClient.from("activity_logs").insert({
      actor_id: user.id,
      action: `escrow_${action}`,
      resource_type: "escrow",
      resource_id: escrow_id,
      before_snapshot: beforeSnapshot,
      after_snapshot: {
        status: newStatus,
        amount: escrow.amount,
        notes: notes || escrow.notes,
      },
      metadata: {
        auction_id: escrow.auction_id,
        buyer_id: escrow.buyer_id,
        seller_id: escrow.seller_id,
        amount: escrow.amount,
      },
    });

    // Send notifications
    const auction = escrow.auctions;
    const title = auction?.listings?.title || "Unknown Auction";

    if (action === "release") {
      // Notify seller
      await adminClient.from("notifications").insert({
        user_id: escrow.seller_id,
        type: "escrow_released",
        title: "Escrow Released",
        body: `Funds of ${escrow.amount} have been released for "${title}".`,
        auction_id: escrow.auction_id,
      });
    } else if (action === "refund") {
      // Notify buyer
      await adminClient.from("notifications").insert({
        user_id: escrow.buyer_id,
        type: "escrow_refunded",
        title: "Escrow Refunded",
        body: `Your payment of ${escrow.amount} for "${title}" has been refunded.`,
        auction_id: escrow.auction_id,
      });
    } else if (action === "freeze") {
      // Notify both parties
      await adminClient.from("notifications").insert({
        user_id: escrow.buyer_id,
        type: "escrow_frozen",
        title: "Escrow Frozen",
        body: `The escrow for "${title}" has been frozen pending review.`,
        auction_id: escrow.auction_id,
      });
      await adminClient.from("notifications").insert({
        user_id: escrow.seller_id,
        type: "escrow_frozen",
        title: "Escrow Frozen",
        body: `The escrow for "${title}" has been frozen pending review.`,
        auction_id: escrow.auction_id,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        escrow_id,
        previous_status: beforeSnapshot.status,
        new_status: newStatus,
        amount: escrow.amount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("escrow-release error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
