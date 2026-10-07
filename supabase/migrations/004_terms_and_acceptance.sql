-- ============================================================================
-- Migration 004: Terms & Conditions content and registration acceptance
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_version TEXT,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    display_name,
    email,
    role,
    terms_accepted_version,
    terms_accepted_at
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      NEW.raw_user_meta_data ->> 'full_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    'casual_visitor'::public.profile_role,
    NULLIF(NEW.raw_user_meta_data ->> 'terms_accepted_version', ''),
    CASE
      WHEN NULLIF(NEW.raw_user_meta_data ->> 'terms_accepted_version', '') IS NULL THEN NULL
      ELSE NOW()
    END
  );
  RETURN NEW;
END;
$$;

INSERT INTO public.platform_settings (key, value, description)
VALUES (
  'terms',
  '{
    "title": "Terms & Conditions",
    "version": "draft-1",
    "effective_date": "",
    "contact_email": "",
    "published": false,
    "content": "This Terms & Conditions document is a draft and must be replaced with the final text before production use.\\n\\nPlease provide and publish the approved terms for account use, bidding, selling, payments, delivery, disputes, prohibited conduct, limitation of liability, and contact information."
  }'::jsonb,
  'Public Terms & Conditions document and registration consent version'
)
ON CONFLICT (key) DO NOTHING;
