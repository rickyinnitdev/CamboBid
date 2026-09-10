// ============================================================================
// proxy-bid Edge Function
// Auto-bids on behalf of proxy bidder up to their max amount
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

    const { auction_id } = await req.json();

    if (!auction_id) {
      return new Response(
        JSON.stringify({ error: "auction_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get auction
    const { data: auction } = await adminClient
      .from("auctions")
      .select("*, listings(*)")
      .eq("id", auction_id)
      .single();

    if (!auction || (auction.status !== "live" && auction.status !== "extended")) {
      return new Response(
        JSON.stringify({ error: "Auction not active" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check auction hasn't ended
    if (new Date(auction.end_time) <= new Date()) {
      return new Response(
        JSON.stringify({ error: "Auction has ended" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find all active proxy bids for this auction, highest max first
    const { data: proxyBids } = await adminClient
      .from("bids")
      .select("*, bidder:profiles!bids_bidder_id_fkey(display_name)")
      .eq("auction_id", auction_id)
      .eq("is_proxy", true)
      .neq("status", "retracted")
      .not("proxy_max_amount", "is", null)
      .order("proxy_max_amount", { ascending: false })
      .limit(10);

    if (!proxyBids || proxyBids.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No proxy bids to process" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the latest non-proxy bid to outbid
    const { data: latestBid } = await adminClient
      .from("bids")
      .select("*")
      .eq("auction_id", auction_id)
      .eq("status", "winning")
      .order("amount", { ascending: false })
      .single();

    if (!latestBid) {
      return new Response(
        JSON.stringify({ success: true, message: "No bids to proxy against" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processedCount = 0;

    for (const proxyBid of proxyBids) {
      // Don't proxy against yourself
      if (proxyBid.bidder_id === latestBid.bidder_id) continue;

      const currentPrice = Number(auction.current_price);
      const increment = Number(auction.bid_increment);
      const proxyMax = Number(proxyBid.proxy_max_amount);

      // Calculate the next bid amount
      const nextBidAmount = currentPrice + increment;

      // Only proxy if the next bid is within the max
      if (nextBidAmount > proxyMax) continue;

      // Place the proxy bid
      const clientIp = req.headers.get("x-forwarded-for") || "unknown";

      const { data: newBid, error: bidError } = await adminClient
        .from("bids")
        .insert({
          auction_id,
          bidder_id: proxyBid.bidder_id,
          amount: nextBidAmount,
          proxy_max_amount: proxyMax,
          is_proxy: true,
          proxy_of_bid_id: latestBid.id,
          status: "winning",
          ip_address: clientIp,
        })
        .select()
        .single();

      if (bidError) {
        console.error("Failed to place proxy bid:", bidError);
        continue;
      }

      // Mark the previous winning bid as outbid
      await adminClient
        .from("bids")
        .update({ status: "outbid" })
        .eq("id", latestBid.id);

      // Update auction current price
      await adminClient
        .from("auctions")
        .update({
          current_price: nextBidAmount,
          winner_id: proxyBid.bidder_id,
        })
        .eq("id", auction_id);

      // Check timer extension
      const timeRemaining = new Date(auction.end_time).getTime() - Date.now();
      const thresholdMs = auction.timer_extension_threshold_seconds * 1000;
      let timerExtended = false;
      let newEndTime = auction.end_time;

      if (timeRemaining <= thresholdMs && timeRemaining > 0) {
        newEndTime = new Date(
          new Date(auction.end_time).getTime() + auction.timer_extension_minutes * 60000
        ).toISOString();

        await adminClient
          .from("auctions")
          .update({
            end_time: newEndTime,
            status: "extended",
          })
          .eq("id", auction_id);

        timerExtended = true;
      }

      // Log activity
      await adminClient.from("activity_logs").insert({
        actor_id: proxyBid.bidder_id,
        action: "proxy_bid_placed",
        resource_type: "bid",
        resource_id: newBid.id,
        before_snapshot: { current_price: auction.current_price, winner_id: latestBid.bidder_id },
        after_snapshot: { current_price: nextBidAmount, winner_id: proxyBid.bidder_id, timer_extended: timerExtended },
        metadata: {
          auction_id,
          proxy_bid_id: newBid.id,
          against_bid_id: latestBid.id,
          amount: nextBidAmount,
          timer_extended: timerExtended,
        },
      });

      // Notify the outbid bidder
      if (latestBid.bidder_id !== proxyBid.bidder_id) {
        await adminClient.from("notifications").insert({
          user_id: latestBid.bidder_id,
          type: "outbid",
          title: "You have been outbid!",
          body: `A proxy bid placed a higher bid of ${nextBidAmount}.`,
          auction_id,
        });
      }

      // Broadcast
      const channel = adminClient.channel(`auction:${auction_id}`);
      await channel.send({
        type: "broadcast",
        event: "new_bid",
        payload: {
          bid_id: newBid.id,
          bidder_id: proxyBid.bidder_id,
          bidder_name: proxyBid.bidder?.display_name || "Proxy Bidder",
          amount: nextBidAmount,
          auction_id,
          current_price: nextBidAmount,
          timer_extended: timerExtended,
          new_end_time: newEndTime,
          placed_at: newBid.placed_at,
          is_proxy: true,
        },
      });

      processedCount++;

      // Update latest bid reference for next iteration
      latestBid.id = newBid.id;
      latestBid.bidder_id = proxyBid.bidder_id;
      auction.current_price = nextBidAmount;
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        current_price: auction.current_price,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("proxy-bid error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
