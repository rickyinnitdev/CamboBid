import { supabase } from "./supabase";

const CACHE_KEY = "cambobid-platform-settings";

export const defaultPlatformSettings = {
  brand: {
    name: "BidHaus",
    tagline: "Curated auctions for rare finds",
    trust_score: "Excellent",
    review_count: "140,724",
    review_source: "Trustpilot",
    primary_cta: "Explore auctions",
    secondary_cta: "Start selling",
  },
  homepage: {
    hero_eyebrow: "Live this week",
    hero_title: "Bid on extraordinary objects, verified by experts",
    hero_subtitle:
      "Discover watches, art, jewellery, interiors and collectibles in timed auctions with secure escrow and real-time bidding.",
    hero_promo: "New bidder credit for every verified winner",
    featured_title: "Ending soon",
    category_title: "Explore specialist auctions",
    trust_title: "Auction-grade protection from bid to delivery",
  },
  auction_rules: {
    platform_fee: 5,
    min_bid_increment: 1,
    max_auction_duration_hours: 168,
    auto_extend_minutes: 5,
    extension_threshold_seconds: 180,
    dispute_window_hours: 48,
    escrow_release_hours: 24,
    min_deposit: 50,
  },
  auth: {
    email_confirm_required: true,
    google_login_enabled: true,
    user_mfa_required: false,
    admin_mfa_required: true,
    verified_bidder_mfa_required: false,
  },
  brand_logo_url: "",
};

export const platformSettingsService = {
  getCached() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return structuredClone(defaultPlatformSettings);
      return this.mergeSettings(JSON.parse(cached));
    } catch {
      return structuredClone(defaultPlatformSettings);
    }
  },

  async getAll() {
    try {
      const { data, error } = await supabase.from("platform_settings").select("key, value");
      if (error) throw error;

      // Section keys (brand, homepage, etc.) are JSONB objects — spread them into nested shape
      const SECTION_KEYS = ["brand", "homepage", "auction_rules", "auth"];
      const settings = (data || []).reduce(
        (settings, row) => {
          if (SECTION_KEYS.includes(row.key)) {
            return { ...settings, [row.key]: { ...settings[row.key], ...row.value } };
          }
          return settings;
        },
        structuredClone(defaultPlatformSettings)
      );

      // brand_logo_url is stored as a flat JSONB string — Supabase parses it to a JS string already
      const logoRow = (data || []).find((r) => r.key === "brand_logo_url");
      if (logoRow?.value) {
        settings.brand_logo_url = typeof logoRow.value === "string" ? logoRow.value : String(logoRow.value);
      }

      localStorage.setItem(CACHE_KEY, JSON.stringify(settings));
      window.dispatchEvent(new CustomEvent("platform-settings-updated", { detail: settings }));
      return settings;
    } catch {
      return this.getCached();
    }
  },

  mergeSettings(settings) {
    return Object.entries(settings || {}).reduce(
      (merged, [key, value]) => ({ ...merged, [key]: { ...merged[key], ...value } }),
      structuredClone(defaultPlatformSettings)
    );
  },
};

export default platformSettingsService;
