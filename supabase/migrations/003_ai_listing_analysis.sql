-- ============================================================================
-- AI LISTING ANALYSIS
-- Stores Gemini-generated listing quality, risk, category, and pricing insights.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_listing_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES public.profiles(id),
  provider TEXT NOT NULL DEFAULT 'gemini',
  model TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
  suggested_category_slug TEXT,
  estimated_low NUMERIC(12,2),
  estimated_high NUMERIC(12,2),
  authenticity_risk_score INTEGER CHECK (authenticity_risk_score BETWEEN 0 AND 100),
  listing_quality_score INTEGER CHECK (listing_quality_score BETWEEN 0 AND 100),
  bidder_excitement_score INTEGER CHECK (bidder_excitement_score BETWEEN 0 AND 100),
  seo_title TEXT,
  summary TEXT,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_listing_analyses_listing ON public.ai_listing_analyses(listing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_listing_analyses_requested_by ON public.ai_listing_analyses(requested_by);
CREATE INDEX IF NOT EXISTS idx_ai_listing_analyses_risk ON public.ai_listing_analyses(authenticity_risk_score DESC);

ALTER TABLE public.ai_listing_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read AI analysis for own listings" ON public.ai_listing_analyses;
CREATE POLICY "Owners can read AI analysis for own listings"
  ON public.ai_listing_analyses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = ai_listing_analyses.listing_id
        AND listings.seller_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Auctioneers can read AI analyses" ON public.ai_listing_analyses;
CREATE POLICY "Auctioneers can read AI analyses"
  ON public.ai_listing_analyses FOR SELECT
  USING (public.is_auctioneer());

DROP POLICY IF EXISTS "Super admins can manage AI analyses" ON public.ai_listing_analyses;
CREATE POLICY "Super admins can manage AI analyses"
  ON public.ai_listing_analyses FOR ALL
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Auctioneers can insert AI analyses" ON public.ai_listing_analyses;
CREATE POLICY "Auctioneers can insert AI analyses"
  ON public.ai_listing_analyses FOR INSERT
  WITH CHECK (public.is_auctioneer());

DROP POLICY IF EXISTS "Sellers can insert AI analysis for own listings" ON public.ai_listing_analyses;
CREATE POLICY "Sellers can insert AI analysis for own listings"
  ON public.ai_listing_analyses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = ai_listing_analyses.listing_id
        AND listings.seller_id = auth.uid()
    )
  );
