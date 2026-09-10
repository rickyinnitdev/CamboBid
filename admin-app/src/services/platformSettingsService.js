import { supabase } from "./supabase";

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
};

export const platformSettingsService = {
  async getAll() {
    try {
      const { data, error } = await supabase.from("platform_settings").select("key, value");
      if (error) throw error;

      return (data || []).reduce(
        (settings, row) => ({ ...settings, [row.key]: { ...settings[row.key], ...row.value } }),
        structuredClone(defaultPlatformSettings)
      );
    } catch {
      return structuredClone(defaultPlatformSettings);
    }
  },

  async saveSection(key, value) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("platform_settings")
      .upsert(
        {
          key,
          value,
          updated_by: user?.id || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

export default platformSettingsService;
