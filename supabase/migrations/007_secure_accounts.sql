-- Sensitive account state is writable only through reviewed server functions.
ALTER TABLE public.profiles
  ADD COLUMN identity_status text NOT NULL DEFAULT 'not_submitted'
    CHECK (identity_status IN ('not_submitted','pending','approved','rejected')),
  ADD COLUMN identity_document_path text,
  ADD COLUMN identity_submitted_at timestamptz,
  ADD COLUMN identity_reviewed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN identity_reviewed_at timestamptz,
  ADD COLUMN identity_rejection_reason text;
UPDATE public.profiles SET identity_status = CASE WHEN identity_verified THEN 'approved' ELSE 'not_submitted' END,
  identity_document_url = NULL;

CREATE FUNCTION public.staff_session() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND NOT suspended
   AND role IN ('super_admin','auctioneer','escrow_manager')) AND coalesce(auth.jwt()->>'aal','') = 'aal2';
$$;
DROP POLICY "Users can view other non-suspended profiles" ON public.profiles;
DROP POLICY "Super admins can view all profiles" ON public.profiles;
DROP POLICY "Auctioneers can view all profiles" ON public.profiles;
DROP POLICY "Escrow managers can view buyer/seller profiles" ON public.profiles;
CREATE POLICY "Verified staff read private profiles" ON public.profiles FOR SELECT USING (public.staff_session());
CREATE VIEW public.public_profiles WITH (security_barrier = true) AS
 SELECT id, display_name, avatar_url, reputation_score FROM public.profiles WHERE NOT suspended;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

CREATE FUNCTION public.guard_profile_update() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF current_user IN ('authenticated','anon') AND
   (to_jsonb(NEW) - ARRAY['display_name','avatar_url','phone','bio','location','updated_at']) IS DISTINCT FROM
   (to_jsonb(OLD) - ARRAY['display_name','avatar_url','phone','bio','location','updated_at']) THEN
   RAISE EXCEPTION 'Sensitive account fields require a secure server action';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER guard_profile_update BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile_update();

CREATE TABLE public.policy_documents (
 kind text NOT NULL CHECK (kind IN ('terms','privacy')), version text NOT NULL,
 title text NOT NULL, content text NOT NULL, published_at timestamptz NOT NULL DEFAULT now(),
 current boolean NOT NULL DEFAULT true, PRIMARY KEY(kind,version)
);
CREATE UNIQUE INDEX one_current_policy ON public.policy_documents(kind) WHERE current;
CREATE TABLE public.policy_acceptances (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id),
 kind text NOT NULL, version text NOT NULL, accepted_at timestamptz NOT NULL DEFAULT now(),
 source text NOT NULL DEFAULT 'onboarding', FOREIGN KEY(kind,version) REFERENCES public.policy_documents(kind,version),
 UNIQUE(user_id,kind,version)
);
ALTER TABLE public.policy_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_acceptances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published policies" ON public.policy_documents FOR SELECT USING (true);
CREATE POLICY "Own acceptance history" ON public.policy_acceptances FOR SELECT USING (user_id=auth.uid() OR public.staff_session());
GRANT SELECT ON public.policy_documents TO anon,authenticated;
GRANT SELECT ON public.policy_acceptances TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.policy_acceptances, public.policy_documents FROM anon,authenticated;

INSERT INTO public.policy_documents(kind,version,title,content) VALUES
('terms','demo-2.0','Terms & Conditions', $terms$
CamboBid university demonstration — effective October 16, 2026.

This educational marketplace uses clearly labelled demo funds by default. Demo balances cannot be withdrawn, redeemed, or exchanged for money. Do not submit genuine identity documents during demonstrations.

You must be at least 18 to participate. Keep account details accurate. Email confirmation, manual identity approval, current policy acceptance and authenticator verification are required before bidding or payments. Staff may suspend accounts for misuse.

Bids authorize a reservation of the bid amount. Proxy bids reserve the maximum authorized amount. Outbid manual reservations are released; a proxy authorization remains reserved while it can still compete. Winning bids transfer the final bid amount to held order funds; excess reservations are released. This demo charges no additional platform fee or shipping fee.

Late bids may extend the auction. Sellers cannot bid on their own items. Bids cannot be withdrawn through the demo. Sellers must describe items accurately.

Held funds are application bookkeeping, not a representation of a regulated escrow service. Buyer delivery confirmation releases held funds to the seller wallet. Open disputes block buyer release and require staff resolution. Staff can freeze funded orders, refund buyers or release funds after review. Demo refunds return demo wallet funds.

KHQR checkout expires after five minutes. The backend must confirm receiver, amount, currency and unique transaction before crediting funds. Late transfers require reconciliation. Live payment operation requires separate configuration and operational review.

Material policy changes require acceptance of the new version. Use the course/project administrator contact provided by your instructor for support or privacy requests. No real-money auction or payout service is offered by this university demo.
$terms$),
('privacy','demo-1.0','Privacy Policy', $privacy$
CamboBid university demonstration — effective October 16, 2026.

We process account identifiers, email, display name, optional contact/profile details, authentication provider information, verification status, policy acceptance history, bids, orders, wallet ledger entries, and payment status to operate this demonstration.

Use fictional identity documents. Uploaded samples are stored in a private Supabase bucket for manual review by authorized staff. Review checks readability and consistency only; it does not query government records or certify document authenticity. Document access and decisions are audited. Identity files are retained until the project administrator removes them, and should be removed at the end of assessment. Verification metadata and transaction history remain for assessment and audit until the project is deleted.

Supabase supplies database, authentication and storage. Google processes authentication when you choose Google sign-in. In live mode, Bakong processes payment information; the demo does not collect bank passwords, PINs or OTPs. Authenticator secrets are managed by Supabase Auth and are not exposed in the admin user list.

Public listings show display names, avatars and reputation only. Email, identity documents, balances and private security details are restricted to the account owner and authorized staff. We store policy version and server acceptance time. Essential browser session storage supports sign-in; no marketing consent is bundled with registration.

Ask your project/course administrator to access, correct or delete your demonstration data, or report a security concern. No configured support mailbox is implied. Before any public launch, publish the actual operator/contact, retention schedule and reviewed production policies.
$privacy$);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 INSERT INTO public.profiles(id,display_name,email) VALUES(NEW.id,
 coalesce(NEW.raw_user_meta_data->>'display_name',NEW.raw_user_meta_data->>'full_name',split_part(NEW.email,'@',1)),coalesce(NEW.email,''));
 RETURN NEW;
END; $$;

CREATE FUNCTION public.accept_policies(p_terms text,p_privacy text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.policy_documents WHERE kind='terms' AND version=p_terms AND current)
 OR NOT EXISTS(SELECT 1 FROM public.policy_documents WHERE kind='privacy' AND version=p_privacy AND current) THEN
 RAISE EXCEPTION 'Policies changed. Reload and review the current versions'; END IF;
 INSERT INTO public.policy_acceptances(user_id,kind,version) VALUES(auth.uid(),'terms',p_terms),(auth.uid(),'privacy',p_privacy) ON CONFLICT DO NOTHING;
 UPDATE public.profiles SET terms_accepted_version=p_terms,terms_accepted_at=now() WHERE id=auth.uid();
END; $$;

CREATE FUNCTION public.account_security(p_user uuid DEFAULT auth.uid()) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR (p_user <> auth.uid() AND NOT public.staff_session()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 SELECT jsonb_build_object('email_confirmed_at',u.email_confirmed_at,'last_sign_in_at',u.last_sign_in_at,
 'providers',u.raw_app_meta_data->'providers','mfa_enabled',EXISTS(SELECT 1 FROM auth.mfa_factors f WHERE f.user_id=u.id AND f.status='verified'),
 'session_verified',p_user=auth.uid() AND coalesce(auth.jwt()->>'aal','')='aal2',
 'policies_current',NOT EXISTS(SELECT 1 FROM public.policy_documents d WHERE d.current AND NOT EXISTS
 (SELECT 1 FROM public.policy_acceptances a WHERE a.user_id=u.id AND a.kind=d.kind AND a.version=d.version)),
 'identity_status',p.identity_status,'suspended',p.suspended) INTO result FROM auth.users u JOIN public.profiles p ON p.id=u.id WHERE u.id=p_user;
 RETURN result;
END; $$;

CREATE FUNCTION public.require_eligible(p_user uuid DEFAULT auth.uid()) RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF p_user IS NULL OR p_user IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 IF coalesce(auth.jwt()->>'aal','') <> 'aal2' THEN RAISE EXCEPTION 'Verify your authenticator code in Account security'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles p JOIN auth.users u ON u.id=p.id
 WHERE p.id=p_user AND NOT p.suspended AND p.identity_verified AND p.identity_status='approved' AND u.email_confirmed_at IS NOT NULL)
 THEN RAISE EXCEPTION 'Confirmed email and approved identity are required; suspended accounts cannot transact'; END IF;
 IF EXISTS(SELECT 1 FROM public.policy_documents d WHERE d.current AND NOT EXISTS
 (SELECT 1 FROM public.policy_acceptances a WHERE a.user_id=p_user AND a.kind=d.kind AND a.version=d.version))
 THEN RAISE EXCEPTION 'Accept the current Terms and Privacy Policy in Account security'; END IF;
END; $$;

CREATE FUNCTION public.submit_identity(p_path text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF auth.uid() IS NULL OR coalesce(auth.jwt()->>'aal','')<>'aal2' OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL)
 THEN RAISE EXCEPTION 'Confirm email and verify your authenticator first'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND NOT suspended AND identity_status<>'approved') THEN RAISE EXCEPTION 'Identity submission unavailable'; END IF;
 IF EXISTS(SELECT 1 FROM public.policy_documents d WHERE d.current AND NOT EXISTS(
 SELECT 1 FROM public.policy_acceptances a WHERE a.user_id=auth.uid() AND a.kind=d.kind AND a.version=d.version)) THEN RAISE EXCEPTION 'Accept current policies before submitting identity'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='identity-documents' AND name=p_path AND (storage.foldername(name))[1]=auth.uid()::text)
 THEN RAISE EXCEPTION 'Upload your document first'; END IF;
 UPDATE public.profiles SET identity_document_path=p_path,identity_status='pending',identity_verified=false,
 identity_submitted_at=now(),identity_reviewed_by=NULL,identity_reviewed_at=NULL,identity_rejection_reason=NULL WHERE id=auth.uid();
 INSERT INTO public.activity_logs(actor_id,action,resource_type,resource_id) VALUES(auth.uid(),'identity_submitted','profile',auth.uid());
END; $$;

CREATE TABLE public.identity_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES public.profiles(id),
 reviewer_id uuid NOT NULL REFERENCES public.profiles(id), decision text NOT NULL CHECK(decision IN ('approved','rejected')),
 reason text, reviewed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.identity_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Review history" ON public.identity_reviews FOR SELECT USING(user_id=auth.uid() OR public.staff_session());
GRANT SELECT ON public.identity_reviews TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.identity_reviews FROM anon,authenticated;
CREATE FUNCTION public.review_identity(p_user uuid,p_approve boolean,p_reason text DEFAULT NULL,p_path text DEFAULT NULL) RETURNS public.profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE p public.profiles;
BEGIN
 IF NOT public.staff_session() OR NOT public.has_role('super_admin') AND NOT public.has_role('auctioneer') THEN RAISE EXCEPTION 'Authorized staff with MFA required'; END IF;
 IF p_user=auth.uid() THEN RAISE EXCEPTION 'A different reviewer must review your identity'; END IF;
 SELECT * INTO p FROM public.profiles WHERE id=p_user FOR UPDATE;
 IF p.identity_status<>'pending' OR p.identity_document_path IS NULL THEN RAISE EXCEPTION 'No pending document'; END IF;
 IF p.identity_document_path IS DISTINCT FROM p_path THEN RAISE EXCEPTION 'Document changed. Reload and review the latest submission'; END IF;
 IF NOT p_approve AND length(trim(coalesce(p_reason,'')))<3 THEN RAISE EXCEPTION 'Provide a rejection reason'; END IF;
 UPDATE public.profiles SET identity_status=CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
 identity_verified=p_approve,identity_verified_at=CASE WHEN p_approve THEN now() END,
 identity_reviewed_by=auth.uid(),identity_reviewed_at=now(),identity_rejection_reason=CASE WHEN NOT p_approve THEN p_reason END,
 role=CASE WHEN p_approve AND role='casual_visitor' THEN 'verified_bidder'::public.profile_role ELSE role END WHERE id=p_user RETURNING * INTO p;
 INSERT INTO public.identity_reviews(user_id,reviewer_id,decision,reason) VALUES(p_user,auth.uid(),p.identity_status,p_reason);
 INSERT INTO public.activity_logs(actor_id,action,resource_type,resource_id,metadata) VALUES(auth.uid(),'identity_reviewed','profile',p_user,jsonb_build_object('decision',p.identity_status,'reason',p_reason));
 RETURN p;
END; $$;

CREATE FUNCTION public.manage_account(p_user uuid,p_action text,p_value text DEFAULT NULL) RETURNS public.profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE p public.profiles;
BEGIN
 IF NOT public.staff_session() OR NOT public.is_super_admin() THEN RAISE EXCEPTION 'Super admin with MFA required'; END IF;
 IF p_user=auth.uid() THEN RAISE EXCEPTION 'Ask another administrator to change your account'; END IF;
 IF p_action='suspend' THEN
   IF length(trim(coalesce(p_value,'')))<3 THEN RAISE EXCEPTION 'Suspension reason required'; END IF;
   UPDATE public.profiles SET suspended=true,suspended_at=now(),suspended_reason=p_value WHERE id=p_user;
 ELSIF p_action='unsuspend' THEN UPDATE public.profiles SET suspended=false,suspended_at=NULL,suspended_reason=NULL WHERE id=p_user;
 ELSIF p_action='role' THEN UPDATE public.profiles SET role=p_value::public.profile_role WHERE id=p_user;
 ELSIF p_action='bid_limit' THEN
   IF p_value::integer NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Bid limit must be 1–100'; END IF;
   UPDATE public.profiles SET bid_limit=p_value::integer WHERE id=p_user;
 ELSE RAISE EXCEPTION 'Unsupported account action'; END IF;
 SELECT * INTO p FROM public.profiles WHERE id=p_user;
 INSERT INTO public.activity_logs(actor_id,action,resource_type,resource_id,metadata) VALUES(auth.uid(),'account_'||p_action,'profile',p_user,jsonb_build_object('value',p_value));
 RETURN p;
END; $$;

-- Documents are readable by owner. Reviewers receive URLs through an audited function only.
DROP POLICY "Super admins can read all identity documents" ON storage.objects;
DROP POLICY "Auctioneers can read all identity documents" ON storage.objects;

REVOKE INSERT,UPDATE,DELETE ON public.bids,public.escrow_transactions FROM anon,authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.activity_logs FROM anon,authenticated;
-- Existing helper was SECURITY DEFINER and otherwise allowed arbitrary direct invocation.
REVOKE EXECUTE ON FUNCTION public.handle_new_user(),public.update_last_active() FROM PUBLIC;
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('staff_session','accept_policies','account_security','require_eligible','submit_identity','review_identity','manage_account') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon',f.signature);
 EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role',f.signature);
 END LOOP;
END $$;
