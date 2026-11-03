/**
 * Presentation data source.
 *
 * Components call this module instead of reaching into Supabase directly. In
 * Components call this module instead of reaching into Supabase directly.
 */
import { auctionService } from "@/services/auctionService";
import { searchService } from "@/services/searchService";
import {
  getAuctionState,
  getImages,
  getListing,
} from "@/utils/auctionPresentation";

function stateRank(auction) {
  const key = getAuctionState(auction).key;
  if (key === "ending_soon") return 0;
  if (key === "live") return 1;
  if (key === "upcoming") return 2;
  return 3;
}

function sortAuctions(list, sort = "ending_soon") {
  const items = [...list];
  if (sort === "price_asc") return items.sort((a, b) => Number(a.current_price) - Number(b.current_price));
  if (sort === "price_desc") return items.sort((a, b) => Number(b.current_price) - Number(a.current_price));
  if (sort === "newest")
    return items.sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
    );

  return items.sort((a, b) => {
    const rank = stateRank(a) - stateRank(b);
    if (rank !== 0) return rank;
    const aState = getAuctionState(a).key;
    const bState = getAuctionState(b).key;
    if (aState === "ended" && bState === "ended")
      return new Date(b.end_time || 0) - new Date(a.end_time || 0);
    if (aState === "upcoming" && bState === "upcoming")
      return new Date(a.start_time || 0) - new Date(b.start_time || 0);
    return new Date(a.end_time || 0) - new Date(b.end_time || 0);
  });
}

function paginate(list, page = 1, limit = 12) {
  const start = (page - 1) * limit;
  return {
    auctions: list.slice(start, start + limit),
    total: list.length,
    page,
    limit,
  };
}

export const marketplace = {
  async getAuctions({ status, type, category, sort, page = 1, limit = 12, query } = {}) {
    if (query) {
      return this.searchAuctions(query, { status, type, category, sort, page, limit });
    }

    if (status === "active" || status === "ending_soon") {
      const [live, upcoming] = await Promise.all([
        auctionService.getAuctions({
          status: "live",
          type,
          category,
          sort,
          page: 1,
          limit: 100,
        }),
        auctionService.getAuctions({
          status: "scheduled",
          type,
          category,
          sort,
          page: 1,
          limit: 100,
        }),
      ]);
      const merged = sortAuctions(
        [...live.auctions, ...upcoming.auctions].filter((auction) =>
          status === "ending_soon"
            ? getAuctionState(auction).key === "ending_soon"
            : true,
        ),
        sort,
      );
      return paginate(merged, page, limit);
    }

    const result = await auctionService.getAuctions({
      status: status && status !== "all" ? status : undefined,
      type,
      category,
      sort,
      page,
      limit,
    });
    return { ...result, auctions: sortAuctions(result.auctions, sort) };
  },

  async getAuctionById(id) {
    return auctionService.getAuctionById(id);
  },

  async getAuctionBids(id) {
    return auctionService.getAuctionBids(id);
  },

  async getLiveAuctions() {
    return auctionService.getLiveAuctions();
  },

  async getEndingSoon(limit = 4) {
    const live = await this.getLiveAuctions();
    return live
      .filter((auction) => getAuctionState(auction).key === "ending_soon")
      .sort((a, b) => new Date(a.end_time) - new Date(b.end_time))
      .slice(0, limit);
  },

  async getUpcomingAuctions() {
    return auctionService.getUpcomingAuctions();
  },

  async getCategories() {
    return searchService.getCategories();
  },

  async searchAuctions(query, { status, type, category, sort, page = 1, limit = 12 } = {}) {
    const result = await searchService.searchAuctions(query, {
      status: status && !["all", "active", "ending_soon"].includes(status) ? status : undefined,
      type,
      category,
      page,
      limit,
    });
    return {
      ...result,
      results: sortAuctions(result.results || [], sort),
    };
  },

  async search(query, { category, type, minPrice, maxPrice, sort, page = 1, limit = 12 } = {}) {
    return searchService.search(query, { category, type, minPrice, maxPrice, sort, page, limit });
  },

  async getAuctionCalendar(year, month) {
    return auctionService.getAuctionCalendar(year, month);
  },

  /** Kept for components that need the primary image without importing helpers. */
  getPrimaryImage(auction) {
    return getImages(getListing(auction))[0] || null;
  },
};

export default marketplace;
