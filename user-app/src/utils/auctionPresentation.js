/**
 * Central frontend mapping for auction status.
 *
 * Backend values (public.auction_status): scheduled | live | extended | closed | cancelled.
 * The presentation layer never assumes a status is biddable: it also checks the
 * start and end timestamps so a stale row can never show "Place bid" after close.
 */

const STATE = {
  upcoming: {
    key: "upcoming",
    label: "Upcoming",
    tone: "bg-navy-50 text-navy-800",
    dot: "bg-navy-500",
    priceLabel: "Starting bid",
    actionLabel: "View lot",
    canBid: false,
    isEnded: false,
  },
  live: {
    key: "live",
    label: "Live",
    tone: "bg-emerald-50 text-emerald-800",
    dot: "bg-emerald-600",
    priceLabel: "Current bid",
    actionLabel: "Place bid",
    canBid: true,
    isEnded: false,
  },
  ending_soon: {
    key: "ending_soon",
    label: "Ending soon",
    tone: "bg-amber-50 text-amber-800",
    dot: "bg-amber-500",
    priceLabel: "Current bid",
    actionLabel: "Place bid",
    canBid: true,
    isEnded: false,
  },
  ended: {
    key: "ended",
    label: "Ended",
    tone: "bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
    priceLabel: "Final bid",
    actionLabel: "View results",
    canBid: false,
    isEnded: true,
  },
  cancelled: {
    key: "cancelled",
    label: "Cancelled",
    tone: "bg-red-50 text-red-700",
    dot: "bg-red-500",
    priceLabel: "Final bid",
    actionLabel: "View lot",
    canBid: false,
    isEnded: true,
  },
};

const ENDING_SOON_WINDOW_MS = 60 * 60 * 1000;

function parseTime(value) {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(time) ? time : null;
}

export function getAuctionState(auction, now = Date.now()) {
  if (!auction) return STATE.upcoming;

  const status = String(auction.status || "").toLowerCase();
  const start = parseTime(auction.start_time);
  const end = parseTime(auction.end_time);

  if (status === "cancelled") return STATE.cancelled;
  if (status === "closed") return STATE.ended;
  if (status === "scheduled") return STATE.upcoming;
  if (start && now < start) return STATE.upcoming;

  if (end && now >= end) return STATE.ended;

  if (status === "live" || status === "extended") {
    if (end && end - now <= ENDING_SOON_WINDOW_MS) return STATE.ending_soon;
    return STATE.live;
  }

  return STATE.ended;
}

export function getBidCount(auction) {
  if (!auction) return 0;
  if (typeof auction.bid_count === "number") return auction.bid_count;
  if (Array.isArray(auction.bids)) return Number(auction.bids[0]?.count || 0);
  return 0;
}

export function getListing(auction) {
  return auction?.listings || {};
}

export function getImages(listing) {
  const images = listing?.images;
  if (!Array.isArray(images)) return [];
  return images
    .map((image) => (typeof image === "string" ? image : image?.url))
    .filter(Boolean);
}

export function getPrimaryImage(listing) {
  return getImages(listing)[0] || null;
}

export function getSellerName(auction) {
  return auction?.listings?.seller?.display_name || "CamboBid seller";
}

/** "Reserve not met" is only shown when the data actually carries a reserve. */
export function getReserveLabel(auction) {
  const listing = getListing(auction);
  if (listing.reserve_price == null) return "";
  const state = getAuctionState(auction);
  if (state.key === "upcoming") return "Reserve set";
  if (auction?.reserve_met) return "Reserve met";
  return "Reserve not met";
}

export function getNextMinimumBid(auction) {
  const current = Number(auction?.current_price || 0);
  const increment = Number(auction?.bid_increment || 1);
  const hasBids = getBidCount(auction) > 0 || !!auction?.winner_id;
  return Math.round((current + (hasBids ? increment : 0)) * 100) / 100;
}

export { STATE as AUCTION_STATES };
