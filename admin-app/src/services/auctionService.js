import { supabase } from "./supabase";

export const auctionService = {
  async getAuctions({ status, type, page = 1, limit = 20 } = {}) {
    let query = supabase
      .from("auctions")
      .select(`
        *, listings!inner(id, title, images, seller_id, starting_price, seller:profiles!listings_seller_id_fkey(display_name))
      `, { count: "exact" });

    if (status) query = query.eq("status", status);
    if (type) query = query.eq("type", type);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return { auctions: data, total: count };
  },

  async getAuctionById(id) {
    const { data, error } = await supabase
      .from("auctions")
      .select(`
        *, listings!inner(*, seller:profiles!listings_seller_id_fkey(display_name, avatar_url))
      `)
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async createAuction(auctionData) {
    const { data, error } = await supabase
      .from("auctions")
      .insert({
        ...auctionData,
        original_end_time: auctionData.end_time,
        current_price: auctionData.starting_price || 0,
      })
      .select()
      .single();
    if (error) throw error;

    // Update listing status
    await supabase
      .from("listings")
      .update({ status: "live" })
      .eq("id", auctionData.listing_id);

    // Log activity
    await supabase.from("activity_logs").insert({
      action: "auction_created",
      resource_type: "auction",
      resource_id: data.id,
      after_snapshot: auctionData,
    });

    return data;
  },

  async updateAuction(id, updates) {
    const { data: old } = await supabase
      .from("auctions")
      .select("*")
      .eq("id", id)
      .single();

    const { data, error } = await supabase
      .from("auctions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    await supabase.from("activity_logs").insert({
      action: "auction_updated",
      resource_type: "auction",
      resource_id: id,
      before_snapshot: old,
      after_snapshot: updates,
    });

    return data;
  },

  async closeAuction(auctionId, reason, closedBy) {
    const { data, error } = await supabase.functions.invoke("close-auction", {
      body: { auction_id: auctionId, reason },
    });
    if (error) throw error;
    return data;
  },

  async updateAuctionSettings(id, settings) {
    const { data, error } = await supabase
      .from("auctions")
      .update(settings)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getApprovedListings() {
    const { data, error } = await supabase
      .from("listings")
      .select("id, title, images, starting_price, seller_id")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
};

export default auctionService;
