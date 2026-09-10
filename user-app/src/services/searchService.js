import { supabase } from "./supabase";

export const searchService = {
  async search(query, { category, type, minPrice, maxPrice, sort, page = 1, limit = 12 } = {}) {
    if (!query || query.trim().length === 0) {
      return { results: [], total: 0 };
    }

    let dbQuery = supabase
      .from("listings")
      .select(`
        id, title, description, images, starting_price, status, created_at,
        categories!inner(id, name, slug),
        seller:profiles!listings_seller_id_fkey(id, display_name, avatar_url)
      `, { count: "exact" })
      .textSearch("title", query, { type: "websearch" })
      .in("status", ["approved", "live", "sold"]);

    if (category) {
      dbQuery = dbQuery.eq("categories.slug", category);
    }

    if (minPrice) {
      dbQuery = dbQuery.gte("starting_price", minPrice);
    }

    if (maxPrice) {
      dbQuery = dbQuery.lte("starting_price", maxPrice);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    switch (sort) {
      case "price_asc":
        dbQuery = dbQuery.order("starting_price", { ascending: true });
        break;
      case "price_desc":
        dbQuery = dbQuery.order("starting_price", { ascending: false });
        break;
      case "newest":
        dbQuery = dbQuery.order("created_at", { ascending: false });
        break;
      default:
        dbQuery = dbQuery.order("created_at", { ascending: false });
    }

    dbQuery = dbQuery.range(from, to);

    const { data, error, count } = await dbQuery;
    if (error) throw error;

    return { results: data, total: count, page, limit };
  },

  async searchAuctions(query, { status, type, page = 1, limit = 12 } = {}) {
    let dbQuery = supabase
      .from("auctions")
      .select(`
        id, type, status, start_time, end_time, current_price, bid_increment,
        listings!inner(id, title, description, images, starting_price, condition, categories(id, name, slug))
      `, { count: "exact" })
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`, { referencedTable: "listings" });

    if (status) {
      dbQuery = dbQuery.eq("status", status);
    } else {
      dbQuery = dbQuery.in("status", ["live", "extended", "scheduled"]);
    }

    if (type) {
      dbQuery = dbQuery.eq("type", type);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    dbQuery = dbQuery
      .order("end_time", { ascending: true })
      .range(from, to);

    const { data, error, count } = await dbQuery;
    if (error) throw error;

    return { results: data, total: count, page, limit };
  },

  async getPopularSearches() {
    return [
      "watches",
      "jewelry",
      "art",
      "electronics",
      "vehicles",
      "collectibles",
    ];
  },

  async getCategories() {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, image_url")
      .is("parent_id", null)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return data;
  },
};

export default searchService;
