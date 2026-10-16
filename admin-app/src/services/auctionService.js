import { supabase } from "./supabase";

async function throwFunctionError(error) {
  if (!error) return;
  let message = error.message;
  try {
    const payload = await error.context?.json?.();
    message = payload?.details || payload?.error || payload?.message || message;
  } catch {
    /* Preserve transport errors when no JSON response is available. */
  }
  throw new Error(message);
}

export const auctionService = {
  async getAuctions({ status, type, page = 1, limit = 20 } = {}) {
    let query = supabase.from("auctions").select(
      `
        *, listings!inner(id, title, images, seller_id, starting_price, seller:profiles!listings_seller_id_fkey(display_name))
      `,
      { count: "exact" },
    );

    if (status) query = query.eq("status", status);
    if (type) query = query.eq("type", type);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    await throwFunctionError(error);
    return { auctions: data, total: count };
  },

  async getAuctionById(id) {
    const { data, error } = await supabase
      .from("auctions")
      .select(
        `
        *, listings!inner(*, seller:profiles!listings_seller_id_fkey(display_name, avatar_url))
      `,
      )
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async createAuction(form) {
    const { data, error } = await supabase.rpc("start_approved_auction", {
      p_listing: form.listing_id,
      p_starting: Number(form.starting_price),
      p_reserve: form.reserve_price === "" ? null : Number(form.reserve_price),
      p_increment: Number(form.bid_increment),
      p_minutes: Number(form.duration_minutes),
      p_extension: Number(form.auto_extend_minutes),
      p_max: Number(form.max_extensions),
      p_mode: form.payment_mode,
    });
    if (error) throw error;
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
    await throwFunctionError(error);
    return data;
  },

  async updateAuctionSettings(id, settings) {
    const { data, error } = await supabase.rpc("configure_auction", {
      p_auction: id,
      p_increment: Number(settings.bid_increment),
      p_reserve:
        settings.reserve_price === "" ? null : Number(settings.reserve_price),
      p_extension: Number(settings.auto_extend_minutes),
      p_max:
        settings.max_extensions === "" || settings.max_extensions == null
          ? null
          : Number(settings.max_extensions),
    });
    if (error) throw error;
    return data;
  },

  async getApprovedListings() {
    const { data, error } = await supabase
      .from("listings")
      .select("id, title, images, starting_price, reserve_price, seller_id")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
};

export default auctionService;
