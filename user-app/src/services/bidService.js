import { supabase } from "./supabase";

async function throwFunctionError(error) {
  if (!error) return;
  try {
    const payload = await error.context?.json?.();
    throw new Error(payload?.details || payload?.error || error.message);
  } catch (readError) {
    if (readError instanceof Error && readError.message !== error.message) throw readError;
    throw error;
  }
}

export const bidService = {
  async placeBid({ auctionId, amount, proxyMaxAmount, isProxy, deviceFingerprint }) {
    const { data, error } = await supabase.functions.invoke("process-bid", {
      body: {
        auction_id: auctionId,
        amount,
        proxy_max_amount: proxyMaxAmount || null,
        is_proxy: isProxy || false,
        device_fingerprint: deviceFingerprint || null,
      },
    });

    await throwFunctionError(error);
    return data;
  },

  async placeProxyBid({ auctionId }) {
    const { data, error } = await supabase.functions.invoke("proxy-bid", {
      body: { auction_id: auctionId },
    });

    await throwFunctionError(error);
    return data;
  },

  async getMyBids() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("bids")
      .select(`
        id, amount, is_proxy, proxy_max_amount, status, placed_at,
        auctions!inner(
          id, status, end_time, current_price, winner_id,
          listings!inner(id, title, images)
        )
      `)
      .eq("bidder_id", user.id)
      .order("placed_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async getBidHistory(auctionId) {
    const { data, error } = await supabase
      .from("bids")
      .select(`
        id, amount, is_proxy, status, placed_at, bidder_id,
        bidder:profiles!bids_bidder_id_fkey(display_name, avatar_url)
      `)
      .eq("auction_id", auctionId)
      .order("amount", { ascending: false });

    if (error) throw error;
    return data;
  },

  async getHighestBid(auctionId) {
    const { data, error } = await supabase
      .from("bids")
      .select("id, amount, bidder_id, bidder:profiles!bids_bidder_id_fkey(display_name)")
      .eq("auction_id", auctionId)
      .eq("status", "winning")
      .order("amount", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  async getMyHighestBid(auctionId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("bids")
      .select("id, amount, proxy_max_amount, is_proxy, status")
      .eq("auction_id", auctionId)
      .eq("bidder_id", user.id)
      .order("amount", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  async calculateMinimumBid(currentPrice, bidIncrement) {
    return Number(currentPrice) + Number(bidIncrement);
  },

  async generateDeviceFingerprint() {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.colorDepth,
      screen.width + "x" + screen.height,
      new Date().getTimezoneOffset(),
    ];

    const fingerprint = components.join("|");
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return "fp_" + Math.abs(hash).toString(36);
  },
};

export default bidService;
