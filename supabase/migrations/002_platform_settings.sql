CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_settings_updated ON public.platform_settings(updated_at DESC);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can read platform settings" ON public.platform_settings;
CREATE POLICY "Everyone can read platform settings"
  ON public.platform_settings FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Super admins can manage platform settings" ON public.platform_settings;
CREATE POLICY "Super admins can manage platform settings"
  ON public.platform_settings FOR ALL
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Auctioneers can manage platform settings" ON public.platform_settings;
CREATE POLICY "Auctioneers can manage platform settings"
  ON public.platform_settings FOR ALL
  USING (public.is_auctioneer());

INSERT INTO public.platform_settings (key, value, description) VALUES
  ('brand', '{"name":"BidHaus","tagline":"Curated auctions for rare finds","trust_score":"Excellent","review_count":"140,724","review_source":"Trustpilot","primary_cta":"Explore auctions","secondary_cta":"Start selling"}'::jsonb, 'Public brand and trust banner copy'),
  ('homepage', '{"hero_eyebrow":"Live this week","hero_title":"Bid on extraordinary objects, verified by experts","hero_subtitle":"Discover watches, art, jewellery, interiors and collectibles in timed auctions with secure escrow and real-time bidding.","hero_promo":"New bidder credit for every verified winner","featured_title":"Ending soon","category_title":"Explore specialist auctions","trust_title":"Auction-grade protection from bid to delivery"}'::jsonb, 'Homepage editorial and merchandising content'),
  ('auction_rules', '{"platform_fee":5,"min_bid_increment":1,"max_auction_duration_hours":168,"auto_extend_minutes":5,"extension_threshold_seconds":180,"dispute_window_hours":48,"escrow_release_hours":24,"min_deposit":50}'::jsonb, 'Default auction and escrow business rules'),
  ('auth', '{"email_confirm_required":true,"google_login_enabled":true,"user_mfa_required":false,"admin_mfa_required":true,"verified_bidder_mfa_required":false}'::jsonb, 'Frontend authentication and security defaults')
ON CONFLICT (key) DO UPDATE SET
  value = public.platform_settings.value || EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();
