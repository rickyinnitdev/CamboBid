import { supabase } from "./supabase";

export const analyticsService = {
  async getDashboardStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [totalAuctions, activeAuctions, totalBids, totalUsers, disputes, escrow] = await Promise.all([
      supabase.from("auctions").select("id", { count: "exact", head: true }),
      supabase.from("auctions").select("id", { count: "exact", head: true }).in("status", ["live", "extended"]),
      supabase.from("bids").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("disputes").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
      supabase.from("escrow_transactions").select("amount, status"),
    ]);

    const totalGMV = escrow.data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const releasedAmount = escrow.data?.filter((t) => t.status === "released").reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    return {
      totalAuctions: totalAuctions.count || 0,
      activeAuctions: activeAuctions.count || 0,
      totalBids: totalBids.count || 0,
      totalUsers: totalUsers.count || 0,
      disputeCount: disputes.count || 0,
      totalGMV,
      platformRevenue: releasedAmount * 0.05,
      activeBidders: totalUsers.count || 0,
    };
  },

  async getBidToCloseRate(startDate, endDate) {
    let query = supabase
      .from("auctions")
      .select("id, status, created_at");

    if (startDate) query = query.gte("created_at", startDate);
    if (endDate) query = query.lte("created_at", endDate);

    const { data } = await query;

    const closedAuctions = data?.filter((a) => a.status === "closed") || [];
    const totalAuctions = data?.length || 0;

    return {
      rate: totalAuctions > 0 ? (closedAuctions.length / totalAuctions) * 100 : 0,
      closed: closedAuctions.length,
      total: totalAuctions,
    };
  },

  async getHammerPriceVsEstimated() {
    const { data, error } = await supabase
      .from("auctions")
      .select(`
        current_price,
        listings!inner(starting_price, category_id, categories!inner(name))
      `)
      .eq("status", "closed");

    if (error) throw error;

    const byCategory = {};
    for (const auction of data || []) {
      const catName = auction.listings?.categories?.name || "Unknown";
      if (!byCategory[catName]) {
        byCategory[catName] = { estimated: 0, actual: 0, count: 0 };
      }
      byCategory[catName].estimated += Number(auction.listings?.starting_price || 0);
      byCategory[catName].actual += Number(auction.current_price || 0);
      byCategory[catName].count++;
    }

    return Object.entries(byCategory).map(([category, values]) => ({
      category,
      estimated: values.estimated / values.count,
      actual: values.actual / values.count,
    }));
  },

  async getSellerSuccessRate() {
    const { data: sellers } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("role", "verified_bidder");

    const results = [];
    for (const seller of sellers || []) {
      const { count: totalListings } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", seller.id);

      const { count: soldListings } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", seller.id)
        .eq("status", "sold");

      results.push({
        seller: seller.display_name,
        successRate: totalListings > 0 ? (soldListings / totalListings) * 100 : 0,
        total: totalListings,
        sold: soldListings,
      });
    }

    return results;
  },

  async getBidderEngagement() {
    const { data } = await supabase
      .from("bids")
      .select("bidder_id, placed_at");

    const heatmap = {};
    for (const bid of data || []) {
      const date = new Date(bid.placed_at);
      const day = date.getDay();
      const hour = date.getHours();
      const key = `${day}-${hour}`;
      heatmap[key] = (heatmap[key] || 0) + 1;
    }

    return heatmap;
  },

  async getRevenueByMonth() {
    const { data } = await supabase
      .from("escrow_transactions")
      .select("amount, status, released_at")
      .eq("status", "released");

    const monthly = {};
    for (const t of data || []) {
      if (!t.released_at) continue;
      const date = new Date(t.released_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthly[key]) monthly[key] = 0;
      monthly[key] += Number(t.amount) * 0.05;
    }

    return Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenue]) => ({ month, revenue }));
  },

  async getCategoryPerformance() {
    const { data } = await supabase
      .from("auctions")
      .select(`
        current_price, status,
        listings!inner(category_id, categories!inner(name, slug))
      `);

    const categories = {};
    for (const auction of data || []) {
      const catName = auction.listings?.categories?.name || "Unknown";
      const catSlug = auction.listings?.categories?.slug || "unknown";
      if (!categories[catSlug]) {
        categories[catSlug] = { name: catName, totalRevenue: 0, count: 0, closed: 0 };
      }
      categories[catSlug].count++;
      if (auction.status === "closed") {
        categories[catSlug].totalRevenue += Number(auction.current_price || 0);
        categories[catSlug].closed++;
      }
    }

    return Object.values(categories).map((cat) => ({
      ...cat,
      avgPrice: cat.count > 0 ? cat.totalRevenue / cat.closed || 0 : 0,
    }));
  },

  async getEscrowSummary() {
    const { data } = await supabase
      .from("escrow_transactions")
      .select("status, amount");

    const summary = { pending: 0, held: 0, released: 0, frozen: 0, refunded: 0 };
    for (const t of data || []) {
      summary[t.status] = (summary[t.status] || 0) + Number(t.amount);
    }
    return summary;
  },
};

export default analyticsService;
