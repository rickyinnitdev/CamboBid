import { supabase } from "./supabase";

export const auctionService = {
  async getAuctions({ status, type, category, sort, page = 1, limit = 12 } = {}) {
    let query = supabase
      .from("auctions")
      .select(`
        *,
        listings!inner(
          id, title, description, images, category_id, condition, seller_id, starting_price,
          categories(id, name, slug),
          profiles!seller_id(display_name, avatar_url)
        )
      `, { count: "exact" });

    if (status) {
      query = query.eq("status", status);
    } else {
      query = query.in("status", ["scheduled", "live", "extended"]);
    }

    if (type) {
      query = query.eq("type", type);
    }

    if (category) {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", category)
        .single();

      if (cat) {
        query = query.eq("listings.category_id", cat.id);
      }
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    switch (sort) {
      case "ending_soon":
        query = query.order("end_time", { ascending: true });
        break;
      case "newest":
        query = query.order("created_at", { ascending: false });
        break;
      case "price_asc":
        query = query.order("current_price", { ascending: true });
        break;
      case "price_desc":
        query = query.order("current_price", { ascending: false });
        break;
      default:
        query = query.order("end_time", { ascending: true });
    }

    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return { auctions: data, total: count, page, limit };
  },

  async getAuctionById(id) {
    const { data, error } = await supabase
      .from("auctions")
      .select(`
        *,
        listings!inner(*, profiles!seller_id(id, display_name, avatar_url, reputation_score))
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async getUpcomingAuctions() {
    const { data, error } = await supabase
      .from("auctions")
      .select(`
        *,
        listings!inner(id, title, images, starting_price, categories(name, slug))
      `)
      .eq("status", "scheduled")
      .order("start_time", { ascending: true })
      .limit(20);

    if (error) throw error;
    return data;
  },

  async getLiveAuctions() {
    const { data, error } = await supabase
      .from("auctions")
      .select(`
        *,
        listings!inner(id, title, images, starting_price, categories(name, slug))
      `)
      .in("status", ["live", "extended"])
      .order("end_time", { ascending: true });

    if (error) throw error;
    return data;
  },

  async getAuctionBids(auctionId) {
    const { data, error } = await supabase
      .from("bids")
      .select("id, amount, is_proxy, status, placed_at, bidder_id, profiles(display_name, avatar_url)")
      .eq("auction_id", auctionId)
      .order("amount", { ascending: false });

    if (error) throw error;
    return data;
  },

  async getAuctionCalendar(year, month) {
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    const { data, error } = await supabase
      .from("auctions")
      .select(`
        id, type, status, start_time, end_time, current_price,
        listings!inner(id, title, images)
      `)
      .gte("start_time", startDate)
      .lte("end_time", endDate)
      .order("start_time", { ascending: true });

    if (error) throw error;
    return data;
  },

  async subscribeToAuction(auctionId, callback) {
    const channel = supabase
      .channel(`auction:${auctionId}`)
      .on("broadcast", { event: "new_bid" }, (payload) => {
        callback("new_bid", payload.payload);
      })
      .on("broadcast", { event: "auction_closed" }, (payload) => {
        callback("auction_closed", payload.payload);
      })
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "auctions",
          filter: `id=eq.${auctionId}`,
        },
        (payload) => {
          callback("auction_update", payload.new);
        }
      )
      .subscribe();

    return channel;
  },

  async unsubscribeFromAuction(channel) {
    if (channel) {
      await supabase.removeChannel(channel);
    }
  },
};

export default auctionService;
