-- ============================================================================
-- AUCTION PLATFORM — COMPLETE DATABASE SCHEMA
-- Migration 001: All tables, enums, functions, triggers, RLS policies
-- ============================================================================

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

CREATE TYPE public.profile_role AS ENUM (
  'super_admin',
  'auctioneer',
  'verified_bidder',
  'casual_visitor',
  'escrow_manager'
);

CREATE TYPE public.listing_status AS ENUM (
  'draft',
  'pending',
  'approved',
  'rejected',
  'live',
  'sold'
);

CREATE TYPE public.auction_type AS ENUM (
  'english',
  'dutch',
  'sealed'
);

CREATE TYPE public.auction_status AS ENUM (
  'scheduled',
  'live',
  'extended',
  'closed',
  'cancelled'
);

CREATE TYPE public.bid_status AS ENUM (
  'active',
  'outbid',
  'retracted',
  'winning'
);

CREATE TYPE public.escrow_status AS ENUM (
  'pending',
  'held',
  'released',
  'frozen',
  'refunded'
);

CREATE TYPE public.dispute_status AS ENUM (
  'open',
  'under_review',
  'resolved',
  'appealed',
  'closed'
);

CREATE TYPE public.condition_type AS ENUM (
  'new',
  'like_new',
  'excellent',
  'good',
  'fair',
  'poor'
);

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- ── profiles (extends Supabase auth.users) ──
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.profile_role NOT NULL DEFAULT 'casual_visitor',
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  identity_verified BOOLEAN NOT NULL DEFAULT FALSE,
  identity_document_url TEXT,
  identity_verified_at TIMESTAMPTZ,
  reputation_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  bid_limit INTEGER NOT NULL DEFAULT 10,
  deposit_paid BOOLEAN NOT NULL DEFAULT FALSE,
  suspended BOOLEAN NOT NULL DEFAULT FALSE,
  suspended_at TIMESTAMPTZ,
  suspended_reason TEXT,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  bio TEXT,
  location TEXT,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── roles ──
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── permissions ──
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(resource, action)
);

-- ── role_permissions ──
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- ── categories ──
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url TEXT,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── listings ──
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category_id UUID NOT NULL REFERENCES public.categories(id),
  condition public.condition_type NOT NULL DEFAULT 'good',
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  starting_price NUMERIC(12,2) NOT NULL CHECK (starting_price >= 0),
  reserve_price NUMERIC(12,2) CHECK (reserve_price >= 0),
  buy_it_now_price NUMERIC(12,2) CHECK (buy_it_now_price >= 0),
  status public.listing_status NOT NULL DEFAULT 'draft',
  rejection_reason TEXT,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── auctions ──
CREATE TABLE public.auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  type public.auction_type NOT NULL DEFAULT 'english',
  status public.auction_status NOT NULL DEFAULT 'scheduled',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  original_end_time TIMESTAMPTZ NOT NULL,
  current_price NUMERIC(12,2) NOT NULL CHECK (current_price >= 0),
  bid_increment NUMERIC(10,2) NOT NULL DEFAULT 1.00 CHECK (bid_increment > 0),
  bid_increment_percent NUMERIC(5,2),
  anti_shill_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  shill_sensitivity TEXT NOT NULL DEFAULT 'medium',
  timer_extension_minutes INTEGER NOT NULL DEFAULT 5,
  timer_extension_threshold_seconds INTEGER NOT NULL DEFAULT 180,
  reserve_met BOOLEAN NOT NULL DEFAULT FALSE,
  winner_id UUID REFERENCES public.profiles(id),
  closed_by UUID REFERENCES public.profiles(id),
  closure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time > start_time)
);

-- ── bids ──
CREATE TABLE public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  proxy_max_amount NUMERIC(12,2) CHECK (proxy_max_amount > 0),
  is_proxy BOOLEAN NOT NULL DEFAULT FALSE,
  proxy_of_bid_id UUID REFERENCES public.bids(id),
  status public.bid_status NOT NULL DEFAULT 'active',
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT
);

-- ── escrow_transactions ──
CREATE TABLE public.escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id),
  seller_id UUID NOT NULL REFERENCES public.profiles(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  status public.escrow_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  frozen_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  released_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  CHECK (buyer_id <> seller_id)
);

-- ── disputes ──
CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id),
  filer_id UUID NOT NULL REFERENCES public.profiles(id),
  respondent_id UUID NOT NULL REFERENCES public.profiles(id),
  reason TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  status public.dispute_status NOT NULL DEFAULT 'open',
  arbitrator_id UUID REFERENCES public.profiles(id),
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  appeal_deadline TIMESTAMPTZ,
  CHECK (filer_id <> respondent_id)
);

-- ── activity_logs (IMMUTABLE) ──
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  before_snapshot JSONB,
  after_snapshot JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── notifications ──
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  auction_id UUID REFERENCES public.auctions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── cms_translations ──
CREATE TABLE public.cms_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locale TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(locale, key)
);

-- ── platform_settings ──
CREATE TABLE public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_suspended ON public.profiles(suspended);
CREATE INDEX idx_profiles_email ON public.profiles(email);

CREATE INDEX idx_role_permissions_role ON public.role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON public.role_permissions(permission_id);

CREATE INDEX idx_categories_parent ON public.categories(parent_id);
CREATE INDEX idx_categories_slug ON public.categories(slug);

CREATE INDEX idx_listings_seller ON public.listings(seller_id);
CREATE INDEX idx_listings_status ON public.listings(status);
CREATE INDEX idx_listings_category ON public.listings(category_id);
CREATE INDEX idx_listings_created ON public.listings(created_at DESC);

CREATE INDEX idx_auctions_listing ON public.auctions(listing_id);
CREATE INDEX idx_auctions_status ON public.auctions(status);
CREATE INDEX idx_auctions_times ON public.auctions(start_time, end_time);
CREATE INDEX idx_auctions_winner ON public.auctions(winner_id);

CREATE INDEX idx_bids_auction ON public.bids(auction_id);
CREATE INDEX idx_bids_bidder ON public.bids(bidder_id);
CREATE INDEX idx_bids_amount ON public.bids(amount DESC);
CREATE INDEX idx_bids_status ON public.bids(status);
CREATE INDEX idx_bids_placed ON public.bids(placed_at DESC);

CREATE INDEX idx_escrow_auction ON public.escrow_transactions(auction_id);
CREATE INDEX idx_escrow_buyer ON public.escrow_transactions(buyer_id);
CREATE INDEX idx_escrow_seller ON public.escrow_transactions(seller_id);
CREATE INDEX idx_escrow_status ON public.escrow_transactions(status);

CREATE INDEX idx_disputes_auction ON public.disputes(auction_id);
CREATE INDEX idx_disputes_filer ON public.disputes(filer_id);
CREATE INDEX idx_disputes_status ON public.disputes(status);
CREATE INDEX idx_disputes_arbitrator ON public.disputes(arbitrator_id);

CREATE INDEX idx_logs_actor ON public.activity_logs(actor_id);
CREATE INDEX idx_logs_resource ON public.activity_logs(resource_type, resource_id);
CREATE INDEX idx_logs_action ON public.activity_logs(action);
CREATE INDEX idx_logs_created ON public.activity_logs(created_at DESC);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

CREATE INDEX idx_cms_locale ON public.cms_translations(locale);
CREATE INDEX idx_cms_key ON public.cms_translations(key);
CREATE INDEX idx_cms_locale_key ON public.cms_translations(locale, key);
CREATE INDEX idx_platform_settings_updated ON public.platform_settings(updated_at DESC);

-- Full-text search on listings
CREATE INDEX idx_listings_search ON public.listings USING GIN (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
);

-- ============================================================================
-- 4. HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Get current user's profile role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.profile_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'casual_visitor'::public.profile_role
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.profile_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.get_user_role();
$$;

-- Check if current user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin' AND suspended = FALSE
  );
$$;

-- Check if current user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(role_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text = role_name AND suspended = FALSE
  );
$$;

-- Check if current user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(action_name TEXT, resource_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.role_permissions rp ON rp.role_id = (
      SELECT id FROM public.roles WHERE name = p.role::text
    )
    JOIN public.permissions perm ON perm.id = rp.permission_id
    WHERE p.id = auth.uid()
      AND perm.action = action_name
      AND perm.resource = resource_name
      AND p.suspended = FALSE
  );
$$;

-- Check if current user is escrow manager
CREATE OR REPLACE FUNCTION public.is_escrow_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.has_role('escrow_manager') OR public.is_super_admin();
$$;

-- Check if current user is auctioneer
CREATE OR REPLACE FUNCTION public.is_auctioneer()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.has_role('auctioneer') OR public.is_super_admin();
$$;

-- Check if current user is verified bidder
CREATE OR REPLACE FUNCTION public.is_verified_bidder()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.has_role('verified_bidder')
    AND NOT public.get_user_role() IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND identity_verified = TRUE
        AND suspended = FALSE
    );
$$;

-- Check if current user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

-- Get current user ID
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT auth.uid();
$$;

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_permissions_updated_at
  BEFORE UPDATE ON public.permissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_auctions_updated_at
  BEFORE UPDATE ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_escrow_updated_at
  BEFORE UPDATE ON public.escrow_transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'casual_visitor'::public.profile_role
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update last_active_at on profile activity
CREATE OR REPLACE FUNCTION public.update_last_active()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles SET last_active_at = NOW() WHERE id = auth.uid();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- ── profiles RLS ──

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can view other non-suspended profiles"
  ON public.profiles FOR SELECT
  USING (suspended = FALSE OR auth.uid() = id);

CREATE POLICY "Users can update own profile (limited fields)"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Super admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_super_admin());

CREATE POLICY "Super admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.is_super_admin());

CREATE POLICY "Auctioneers can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_auctioneer());

CREATE POLICY "Escrow managers can view buyer/seller profiles"
  ON public.profiles FOR SELECT
  USING (public.is_escrow_manager());

-- ── roles RLS ──

CREATE POLICY "Authenticated users can read roles"
  ON public.roles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can manage roles"
  ON public.roles FOR ALL
  USING (public.is_super_admin());

-- ── permissions RLS ──

CREATE POLICY "Authenticated users can read permissions"
  ON public.permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can manage permissions"
  ON public.permissions FOR ALL
  USING (public.is_super_admin());

-- ── role_permissions RLS ──

CREATE POLICY "Authenticated users can read role permissions"
  ON public.role_permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can manage role permissions"
  ON public.role_permissions FOR ALL
  USING (public.is_super_admin());

-- ── categories RLS ──

CREATE POLICY "Everyone can read categories"
  ON public.categories FOR SELECT
  USING (TRUE);

CREATE POLICY "Super admins can manage categories"
  ON public.categories FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Auctioneers can manage categories"
  ON public.categories FOR ALL
  USING (public.is_auctioneer());

-- ── listings RLS ──

CREATE POLICY "Public can view approved/live/sold listings"
  ON public.listings FOR SELECT
  USING (status IN ('approved', 'live', 'sold'));

CREATE POLICY "Sellers can view own listings"
  ON public.listings FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can create listings"
  ON public.listings FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update own draft/pending listings"
  ON public.listings FOR UPDATE
  USING (auth.uid() = seller_id AND status IN ('draft', 'pending', 'rejected'))
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete own draft listings"
  ON public.listings FOR DELETE
  USING (auth.uid() = seller_id AND status IN ('draft', 'rejected'));

CREATE POLICY "Super admins can manage all listings"
  ON public.listings FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Auctioneers can view and update all listings"
  ON public.listings FOR SELECT
  USING (public.is_auctioneer());

CREATE POLICY "Auctioneers can update listings"
  ON public.listings FOR UPDATE
  USING (public.is_auctioneer());

-- ── auctions RLS ──

CREATE POLICY "Public can view scheduled/live/closed auctions"
  ON public.auctions FOR SELECT
  USING (status IN ('scheduled', 'live', 'extended', 'closed'));

CREATE POLICY "Sellers can view own auctions"
  ON public.auctions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = auctions.listing_id AND listings.seller_id = auth.uid()
    )
  );

CREATE POLICY "Bidders can view live/extended auctions"
  ON public.auctions FOR SELECT
  USING (status IN ('live', 'extended'));

CREATE POLICY "Super admins can manage all auctions"
  ON public.auctions FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Auctioneers can manage auctions"
  ON public.auctions FOR ALL
  USING (public.is_auctioneer());

-- ── bids RLS ──

CREATE POLICY "Bidders can insert own bids"
  ON public.bids FOR INSERT
  WITH CHECK (auth.uid() = bidder_id);

CREATE POLICY "Bidders can read own bids"
  ON public.bids FOR SELECT
  USING (auth.uid() = bidder_id);

CREATE POLICY "Auction owners can see bids on their auctions"
  ON public.bids FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.auctions a
      JOIN public.listings l ON l.id = a.listing_id
      WHERE a.id = bids.auction_id AND l.seller_id = auth.uid()
    )
  );

CREATE POLICY "Auctioneers can view all bids"
  ON public.bids FOR SELECT
  USING (public.is_auctioneer());

CREATE POLICY "Super admins can view all bids"
  ON public.bids FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Escrow managers can view bids related to escrow"
  ON public.bids FOR SELECT
  USING (public.is_escrow_manager());

-- ── escrow_transactions RLS ──

CREATE POLICY "Buyers can view own escrow"
  ON public.escrow_transactions FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view own escrow"
  ON public.escrow_transactions FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Escrow managers can view all escrow"
  ON public.escrow_transactions FOR SELECT
  USING (public.is_escrow_manager());

CREATE POLICY "Escrow managers can update all escrow"
  ON public.escrow_transactions FOR UPDATE
  USING (public.is_escrow_manager());

CREATE POLICY "Super admins can manage all escrow"
  ON public.escrow_transactions FOR ALL
  USING (public.is_super_admin());

-- ── disputes RLS ──

CREATE POLICY "Filers can view own disputes"
  ON public.disputes FOR SELECT
  USING (auth.uid() = filer_id);

CREATE POLICY "Respondents can view own disputes"
  ON public.disputes FOR SELECT
  USING (auth.uid() = respondent_id);

CREATE POLICY "Filers can create disputes"
  ON public.disputes FOR INSERT
  WITH CHECK (auth.uid() = filer_id);

CREATE POLICY "Filers can add evidence to own disputes"
  ON public.disputes FOR UPDATE
  USING (auth.uid() = filer_id AND status IN ('open', 'appealed'))
  WITH CHECK (auth.uid() = filer_id);

CREATE POLICY "Auctioneers can manage all disputes"
  ON public.disputes FOR ALL
  USING (public.is_auctioneer());

CREATE POLICY "Super admins can manage all disputes"
  ON public.disputes FOR ALL
  USING (public.is_super_admin());

-- ── activity_logs RLS (IMMUTABLE) ──

CREATE POLICY "Authenticated users can insert logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can read all logs"
  ON public.activity_logs FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Auctioneers can read all logs"
  ON public.activity_logs FOR SELECT
  USING (public.is_auctioneer());

CREATE POLICY "Users can read logs about own activity"
  ON public.activity_logs FOR SELECT
  USING (auth.uid() = actor_id);

CREATE POLICY "Users can read logs about own resources"
  ON public.activity_logs FOR SELECT
  USING (
    resource_type = 'profile' AND resource_id = auth.uid()
  );

-- NO UPDATE or DELETE policies for activity_logs — immutable by design

-- ── notifications RLS ──

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all notifications"
  ON public.notifications FOR SELECT
  USING (public.is_super_admin());

-- ── cms_translations RLS ──

CREATE POLICY "Everyone can read translations"
  ON public.cms_translations FOR SELECT
  USING (TRUE);

CREATE POLICY "Super admins can manage translations"
  ON public.cms_translations FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Auctioneers can manage translations"
  ON public.cms_translations FOR ALL
  USING (public.is_auctioneer());

-- ── platform_settings RLS ──

CREATE POLICY "Everyone can read platform settings"
  ON public.platform_settings FOR SELECT
  USING (TRUE);

CREATE POLICY "Super admins can manage platform settings"
  ON public.platform_settings FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Auctioneers can manage platform settings"
  ON public.platform_settings FOR ALL
  USING (public.is_auctioneer());

-- ============================================================================
-- 7. REALTIME (enable for specific tables only to stay within free tier)
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.auctions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================================================
-- 8. STORAGE BUCKETS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('listing-images', 'listing-images', TRUE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('identity-documents', 'identity-documents', FALSE, 20971520, ARRAY['image/jpeg', 'image/png', 'application/pdf']),
  ('dispute-evidence', 'dispute-evidence', FALSE, 20971520, ARRAY['image/jpeg', 'image/png', 'application/pdf']);

-- ── listing-images policies (public read, owner/admin write) ──

CREATE POLICY "Public can view listing images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-images');

CREATE POLICY "Authenticated users can upload listing images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'listing-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Owners can delete own listing images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Super admins can manage all listing images"
  ON storage.objects FOR ALL
  USING (bucket_id = 'listing-images' AND public.is_super_admin());

-- ── identity-documents policies (private, owner upload, admin read) ──

CREATE POLICY "Owners can read own identity documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'identity-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Super admins can read all identity documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'identity-documents' AND public.is_super_admin());

CREATE POLICY "Auctioneers can read all identity documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'identity-documents' AND public.is_auctioneer());

CREATE POLICY "Authenticated users can upload own identity documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'identity-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Owners can delete own identity documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'identity-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── dispute-evidence policies (private) ──

CREATE POLICY "Dispute filers can read own evidence"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'dispute-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Super admins can read all dispute evidence"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dispute-evidence' AND public.is_super_admin());

CREATE POLICY "Auctioneers can read all dispute evidence"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dispute-evidence' AND public.is_auctioneer());

CREATE POLICY "Authenticated users can upload dispute evidence"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'dispute-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Owners can delete own dispute evidence"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'dispute-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- END OF MIGRATION 001
-- ============================================================================
