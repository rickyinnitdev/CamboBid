// ============================================================================
// process-bid Edge Function
// Validates bidder, processes bid, detects shill, extends timer, broadcasts
// ============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BidRequest {
  auction_id: string;
  amount: number;
  proxy_max_amount?: number;
  is_proxy?: boolean;
  device_fingerprint?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth client (uses user JWT)
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service client (for admin operations)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: BidRequest = await req.json();
    const { auction_id, amount, proxy_max_amount, is_proxy = false, device_fingerprint } = body;

    // Validate input
    if (!auction_id || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid bid parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (is_proxy && proxy_max_amount && proxy_max_amount <= amount) {
      return new Response(
        JSON.stringify({ error: "Proxy max amount must be higher than bid amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get bidder profile
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check bidder is verified and not suspended
    if (profile.suspended) {
      return new Response(
        JSON.stringify({ error: "Your account has been suspended" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile.identity_verified) {
      return new Response(
        JSON.stringify({ error: "You must verify your identity to place bids" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check bid limit (max 10 per minute)
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { count: recentBids } = await adminClient
      .from("bids")
      .select("*", { count: "exact", head: true })
      .eq("bidder_id", user.id)
      .gte("placed_at", oneMinuteAgo);

    if (recentBids && recentBids >= profile.bid_limit) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Maximum 10 bids per minute." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get auction with listing
    const { data: auction, error: auctionError } = await adminClient
      .from("auctions")
      .select("*, listings(*)")
      .eq("id", auction_id)
      .single();

    if (auctionError || !auction) {
      return new Response(
        JSON.stringify({ error: "Auction not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check auction is live
    if (auction.status !== "live" && auction.status !== "extended") {
      return new Response(
        JSON.stringify({ error: "This auction is not currently accepting bids" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check auction hasn't ended
    const now = new Date();
    if (new Date(auction.end_time) <= now) {
      return new Response(
        JSON.stringify({ error: "This auction has ended" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check bidder is not the seller
    if (auction.listings.seller_id === user.id) {
      return new Response(
        JSON.stringify({ error: "You cannot bid on your own item" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Shill bid detection
    if (auction.anti_shill_enabled) {
      // Same user as seller
      if (auction.listings.seller_id === user.id) {
        return new Response(
          JSON.stringify({ error: "Shill bidding detected: same user" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Same IP as seller (flagged but not blocked, logged for review)
      const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

      // Check if seller has same IP in recent activity
      const { data: sellerLogs } = await adminClient
        .from("activity_logs")
        .select("metadata")
        .eq("resource_type", "bid")
        .eq("actor_id", auction.listings.seller_id)
        .gte("created_at", new Date(Date.now() - 86400000).toISOString())
        .limit(10);

      if (sellerLogs) {
        for (const log of sellerLogs) {
          if (log.metadata?.ip_address === clientIp) {
            // Log the suspicious activity but don't block
            await adminClient.from("activity_logs").insert({
              actor_id: user.id,
              action: "shill_suspected",
              resource_type: "bid",
              metadata: {
                reason: "matching_ip",
                auction_id,
                seller_id: auction.listings.seller_id,
                ip_address: clientIp,
              },
            });
          }
        }
      }

      // Same device fingerprint
      if (device_fingerprint) {
        const { data: sellerBids } = await adminClient
          .from("bids")
          .select("device_fingerprint")
          .eq("auction_id", auction_id)
          .eq("bidder_id", auction.listings.seller_id)
          .limit(5);

        if (sellerBids) {
          for (const bid of sellerBids) {
            if (bid.device_fingerprint && bid.device_fingerprint === device_fingerprint) {
              await adminClient.from("activity_logs").insert({
                actor_id: user.id,
                action: "shill_suspected",
                resource_type: "bid",
                metadata: {
                  reason: "matching_device_fingerprint",
                  auction_id,
                  seller_id: auction.listings.seller_id,
                },
              });
            }
          }
        }
      }
    }

    // Validate bid amount meets minimum increment
    const minimumBid = Number(auction.current_price) + Number(auction.bid_increment);
    if (amount < minimumBid) {
      return new Response(
        JSON.stringify({
          error: `Bid must be at least ${minimumBid}. Current price: ${auction.current_price}, increment: ${auction.bid_increment}`,
          minimum_bid: minimumBid,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get previous winning bid for outbid notification
    const { data: previousWinningBid } = await adminClient
      .from("bids")
      .select("id, bidder_id, amount")
      .eq("auction_id", auction_id)
      .eq("status", "winning")
      .single();

    // Insert the bid
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "";

    const { data: newBid, error: bidError } = await adminClient
      .from("bids")
      .insert({
        auction_id,
        bidder_id: user.id,
        amount,
        proxy_max_amount: is_proxy ? proxy_max_amount : null,
        is_proxy,
        status: "winning",
        ip_address: clientIp,
        user_agent: userAgent,
        device_fingerprint: device_fingerprint || null,
      })
      .select()
      .single();

    if (bidError) {
      return new Response(
        JSON.stringify({ error: "Failed to place bid" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update previous winning bid to outbid
    if (previousWinningBid) {
      await adminClient
        .from("bids")
        .update({ status: "outbid" })
        .eq("id", previousWinningBid.id);
    }

    // Check reserve price
    const reserveMet = amount >= Number(auction.listings.reserve_price || 0);

    // Update auction current price and reserve status
    const { error: updateError } = await adminClient
      .from("auctions")
      .update({
        current_price: amount,
        reserve_met: reserveMet,
        winner_id: user.id,
      })
      .eq("id", auction_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to update auction" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Timer extension logic
    const timeRemaining = new Date(auction.end_time).getTime() - now.getTime();
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

    // Log the activity
    const beforeSnapshot = {
      current_price: auction.current_price,
      winner_id: auction.winner_id,
      reserve_met: auction.reserve_met,
      end_time: auction.end_time,
    };

    const afterSnapshot = {
      current_price: amount,
      winner_id: user.id,
      reserve_met: reserveMet,
      end_time: newEndTime,
    };

    await adminClient.from("activity_logs").insert({
      actor_id: user.id,
      action: "bid_placed",
      resource_type: "bid",
      resource_id: newBid.id,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      metadata: {
        auction_id,
        amount,
        is_proxy,
        timer_extended: timerExtended,
        previous_bidder_id: previousWinningBid?.bidder_id,
        ip_address: clientIp,
      },
    });

    // Send outbid notification to previous bidder
    if (previousWinningBid && previousWinningBid.bidder_id !== user.id) {
      await adminClient.from("notifications").insert({
        user_id: previousWinningBid.bidder_id,
        type: "outbid",
        title: "You have been outbid!",
        body: `Someone placed a higher bid of ${amount} on this auction.`,
        auction_id,
      });
    }

    // Send ending soon notification if timer was extended
    if (timerExtended) {
      // Notify all bidders on this auction about the extension
      const { data: auctionBidders } = await adminClient
        .from("bids")
        .select("bidder_id")
        .eq("auction_id", auction_id)
        .neq("bidder_id", user.id);

      const uniqueBidderIds = [...new Set(auctionBidders?.map((b) => b.bidder_id) || [])];
      for (const bidderId of uniqueBidderIds) {
        await adminClient.from("notifications").insert({
          user_id: bidderId,
          type: "auction_extended",
          title: "Auction Extended!",
          body: `The auction has been extended to ${new Date(newEndTime).toLocaleString()}.`,
          auction_id,
        });
      }
    }

    // Trigger proxy bidding after the incoming bid is committed. Proxy errors are
    // logged but do not invalidate the already-accepted bid.
    try {
      await fetch(`${supabaseUrl}/functions/v1/proxy-bid`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ auction_id }),
      });
    } catch (proxyError) {
      await adminClient.from("activity_logs").insert({
        actor_id: user.id,
        action: "proxy_bid_check_failed",
        resource_type: "auction",
        resource_id: auction_id,
        metadata: { error: String(proxyError) },
      });
    }

    // Broadcast via Supabase Realtime
    const channel = adminClient.channel(`auction:${auction_id}`);
    await channel.send({
      type: "broadcast",
      event: "new_bid",
      payload: {
        bid_id: newBid.id,
        bidder_id: user.id,
        bidder_name: profile.display_name,
        amount,
        auction_id,
        current_price: amount,
        reserve_met: reserveMet,
        timer_extended: timerExtended,
        new_end_time: newEndTime,
        placed_at: newBid.placed_at,
        is_proxy,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        bid: newBid,
        current_price: amount,
        reserve_met: reserveMet,
        timer_extended: timerExtended,
        new_end_time: newEndTime,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("process-bid error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
