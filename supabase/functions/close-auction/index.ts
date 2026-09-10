// ============================================================================
// close-auction Edge Function
// Closes auction, determines winner, creates escrow, notifies
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

    const { auction_id, reason } = await req.json();

    if (!auction_id) {
      return new Response(
        JSON.stringify({ error: "auction_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get profile to check role
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // Only auctioneer or super_admin can close
    if (profile?.role !== "super_admin" && profile?.role !== "auctioneer") {
      return new Response(
        JSON.stringify({ error: "Only auctioneers can close auctions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get auction
    const { data: auction } = await adminClient
      .from("auctions")
      .select("*, listings(*)")
      .eq("id", auction_id)
      .single();

    if (!auction) {
      return new Response(
        JSON.stringify({ error: "Auction not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (auction.status === "closed" || auction.status === "cancelled") {
      return new Response(
        JSON.stringify({ error: "Auction is already closed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get winning bid
    const { data: winningBid } = await adminClient
      .from("bids")
      .select("*, profiles!bidder_id(display_name, email)")
      .eq("auction_id", auction_id)
      .eq("status", "winning")
      .order("amount", { ascending: false })
      .limit(1)
      .single();

    // Determine reserve met
    const reserveMet = winningBid
      ? Number(winningBid.amount) >= Number(auction.listings.reserve_price || 0)
      : false;

    // Capture before state
    const beforeSnapshot = {
      status: auction.status,
      current_price: auction.current_price,
      winner_id: auction.winner_id,
    };

    // Update auction status
    const { error: updateError } = await adminClient
      .from("auctions")
      .update({
        status: "closed",
        closed_by: user.id,
        closure_reason: reason || null,
        reserve_met: reserveMet,
        winner_id: winningBid ? winningBid.bidder_id : null,
      })
      .eq("id", auction_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to close auction" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update listing status to sold if there's a winner and reserve met
    if (winningBid && reserveMet) {
      await adminClient
        .from("listings")
        .update({ status: "sold" })
        .eq("id", auction.listing_id);
    }

    // Create escrow transaction if there's a winner
    let escrowId = null;
    if (winningBid && reserveMet) {
      const { data: escrow, error: escrowError } = await adminClient
        .from("escrow_transactions")
        .insert({
          auction_id,
          buyer_id: winningBid.bidder_id,
          seller_id: auction.listings.seller_id,
          amount: winningBid.amount,
          status: "pending",
        })
        .select()
        .single();

      if (!escrowError && escrow) {
        escrowId = escrow.id;
      }
    }

    // Log activity
    const afterSnapshot = {
      status: "closed",
      current_price: winningBid ? winningBid.amount : auction.current_price,
      winner_id: winningBid ? winningBid.bidder_id : null,
      reserve_met: reserveMet,
    };

    await adminClient.from("activity_logs").insert({
      actor_id: user.id,
      action: "auction_closed",
      resource_type: "auction",
      resource_id: auction_id,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      metadata: {
        winning_bid_id: winningBid?.id,
        winning_bid_amount: winningBid?.amount,
        reserve_met: reserveMet,
        escrow_id: escrowId,
        reason: reason,
      },
    });

    // Send notifications
    if (winningBid) {
      // Winner notification
      await adminClient.from("notifications").insert({
        user_id: winningBid.bidder_id,
        type: "auction_won",
        title: "Congratulations! You won the auction!",
        body: `You won the auction for "${auction.listings.title}" with a bid of ${winningBid.amount}.`,
        auction_id,
      });

      // Notify all other bidders
      const { data: allBidders } = await adminClient
        .from("bids")
        .select("bidder_id")
        .eq("auction_id", auction_id)
        .neq("bidder_id", winningBid.bidder_id);

      const uniqueBidderIds = [...new Set(allBidders?.map((b) => b.bidder_id) || [])];
      for (const bidderId of uniqueBidderIds) {
        await adminClient.from("notifications").insert({
          user_id: bidderId,
          type: "auction_ended",
          title: "Auction Ended",
          body: `The auction for "${auction.listings.title}" has ended. You did not win.`,
          auction_id,
        });
      }
    } else {
      // No winner - notify seller
      await adminClient.from("notifications").insert({
        user_id: auction.listings.seller_id,
        type: "auction_closed_no_winner",
        title: "Auction Closed - No Winner",
        body: `The auction for "${auction.listings.title}" has closed without a winner.`,
        auction_id,
      });
    }

    // Broadcast auction closed
    const channel = adminClient.channel(`auction:${auction_id}`);
    await channel.send({
      type: "broadcast",
      event: "auction_closed",
      payload: {
        auction_id,
        winner_id: winningBid?.bidder_id,
        winning_amount: winningBid?.amount,
        reserve_met: reserveMet,
        escrow_id: escrowId,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        winner_id: winningBid?.bidder_id,
        winning_amount: winningBid?.amount,
        reserve_met: reserveMet,
        escrow_id: escrowId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("close-auction error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
