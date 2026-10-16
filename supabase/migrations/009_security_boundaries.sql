-- All staff mutations require a non-suspended AAL2 session, even via REST.
DO $$ DECLARE t text;op text; BEGIN
 FOREACH t IN ARRAY ARRAY['profiles','roles','permissions','role_permissions','categories','listings','auctions','disputes','cms_translations','platform_settings'] LOOP
 FOREACH op IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
 EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR %s TO authenticated %s',
 'staff_mfa_'||lower(op),t,op,
 CASE WHEN op='INSERT' THEN 'WITH CHECK (public.get_user_role() NOT IN (''super_admin'',''auctioneer'',''escrow_manager'') OR public.staff_session())'
 WHEN op='DELETE' THEN 'USING (public.get_user_role() NOT IN (''super_admin'',''auctioneer'',''escrow_manager'') OR public.staff_session())'
 ELSE 'USING (public.get_user_role() NOT IN (''super_admin'',''auctioneer'',''escrow_manager'') OR public.staff_session()) WITH CHECK (public.get_user_role() NOT IN (''super_admin'',''auctioneer'',''escrow_manager'') OR public.staff_session())' END);
 END LOOP; END LOOP;
END $$;
CREATE POLICY "Private bid metadata" ON public.bids AS RESTRICTIVE FOR SELECT TO authenticated USING(bidder_id=auth.uid() OR public.staff_session());
CREATE POLICY "Private audit access" ON public.activity_logs AS RESTRICTIVE FOR SELECT TO authenticated USING(actor_id=auth.uid() OR public.staff_session());
CREATE POLICY "Private order access" ON public.escrow_transactions AS RESTRICTIVE FOR SELECT TO authenticated USING(buyer_id=auth.uid() OR seller_id=auth.uid() OR public.staff_session());
CREATE POLICY "Private dispute access" ON public.disputes AS RESTRICTIVE FOR SELECT TO authenticated USING(filer_id=auth.uid() OR respondent_id=auth.uid() OR public.staff_session());
DROP POLICY "Owners can delete own identity documents" ON storage.objects;
CREATE POLICY "Identity uploads require verified session" ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK(bucket_id<>'identity-documents' OR (coalesce(auth.jwt()->>'aal','')='aal2' AND EXISTS(
 SELECT 1 FROM public.profiles WHERE id=auth.uid() AND NOT suspended)));
CREATE FUNCTION public.guard_listing_state() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF current_user='authenticated' AND NOT public.staff_session() THEN
 IF TG_OP='INSERT' AND (NEW.status NOT IN ('draft','pending') OR NEW.seller_id<>auth.uid()) THEN RAISE EXCEPTION 'Invalid listing state'; END IF;
 IF TG_OP='UPDATE' AND (NEW.status NOT IN ('draft','pending') OR NEW.seller_id<>OLD.seller_id) THEN RAISE EXCEPTION 'Only staff can approve listings'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER guard_listing_state BEFORE INSERT OR UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.guard_listing_state();
-- Staff dispute decisions already use RLS. Prevent a filer resolving their own case.
CREATE FUNCTION public.guard_dispute_state() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF current_user='authenticated' AND NOT public.staff_session() THEN
 IF TG_OP='INSERT' AND (NEW.status<>'open' OR NEW.filer_id<>auth.uid() OR NEW.arbitrator_id IS NOT NULL OR NEW.resolution IS NOT NULL) THEN RAISE EXCEPTION 'Invalid dispute'; END IF;
 IF TG_OP='UPDATE' AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.resolution IS DISTINCT FROM OLD.resolution OR NEW.arbitrator_id IS DISTINCT FROM OLD.arbitrator_id
 OR NEW.auction_id<>OLD.auction_id OR NEW.respondent_id<>OLD.respondent_id OR NEW.filer_id<>OLD.filer_id) THEN RAISE EXCEPTION 'Staff must decide disputes'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER guard_dispute_state BEFORE INSERT OR UPDATE ON public.disputes FOR EACH ROW EXECUTE FUNCTION public.guard_dispute_state();

CREATE FUNCTION public.identity_session() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT coalesce(auth.jwt()->>'aal','')='aal2' AND EXISTS(
 SELECT 1 FROM public.profiles p JOIN auth.users u ON u.id=p.id WHERE p.id=auth.uid() AND NOT p.suspended AND u.email_confirmed_at IS NOT NULL)
 AND NOT EXISTS(SELECT 1 FROM public.policy_documents d WHERE d.current AND NOT EXISTS(
 SELECT 1 FROM public.policy_acceptances a WHERE a.user_id=auth.uid() AND a.kind=d.kind AND a.version=d.version));
$$;
REVOKE ALL ON FUNCTION public.identity_session() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.identity_session() TO authenticated;
DROP POLICY "Identity uploads require verified session" ON storage.objects;
CREATE POLICY "Identity uploads require verified session" ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK(bucket_id<>'identity-documents' OR public.identity_session());
CREATE POLICY "Identity reads require verified session" ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated
 USING(bucket_id<>'identity-documents' OR public.identity_session());

-- Filing a dispute and freezing its held payment share the settlement lock.
CREATE FUNCTION public.secure_dispute() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE e public.escrow_transactions;
BEGIN
 PERFORM pg_advisory_xact_lock(771024);
 SELECT * INTO e FROM public.escrow_transactions WHERE auction_id=NEW.auction_id ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND OR NEW.filer_id NOT IN (e.buyer_id,e.seller_id) OR NEW.respondent_id<>(CASE WHEN NEW.filer_id=e.buyer_id THEN e.seller_id ELSE e.buyer_id END)
 OR e.status NOT IN ('held','frozen') THEN RAISE EXCEPTION 'Only parties to a funded, unreleased order can file a dispute'; END IF;
 IF EXISTS(SELECT 1 FROM public.disputes WHERE auction_id=NEW.auction_id AND status IN ('open','under_review','appealed')) THEN RAISE EXCEPTION 'An active dispute already exists'; END IF;
 UPDATE public.escrow_transactions SET status='frozen',frozen_at=now() WHERE id=e.id;
 INSERT INTO public.activity_logs(actor_id,action,resource_type,resource_id,metadata) VALUES(NEW.filer_id,'dispute_opened','escrow',e.id,jsonb_build_object('dispute_id',NEW.id));
 RETURN NEW;
END; $$;
CREATE TRIGGER secure_dispute BEFORE INSERT ON public.disputes FOR EACH ROW EXECUTE FUNCTION public.secure_dispute();

CREATE FUNCTION public.admin_user_directory(p_search text DEFAULT '',p_role text DEFAULT NULL,p_page integer DEFAULT 1,p_limit integer DEFAULT 20) RETURNS jsonb
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
 IF NOT public.staff_session() THEN RAISE EXCEPTION 'Staff session with MFA required'; END IF;
 SELECT jsonb_build_object('total',(SELECT count(*) FROM public.profiles p WHERE (p_role IS NULL OR p.role::text=p_role) AND
 (p.display_name ILIKE '%'||p_search||'%' OR p.email ILIKE '%'||p_search||'%')),
 'users',coalesce((SELECT jsonb_agg(to_jsonb(selected)||public.account_security(selected.id)) FROM (
 SELECT p.* FROM public.profiles p WHERE (p_role IS NULL OR p.role::text=p_role) AND
 (p.display_name ILIKE '%'||p_search||'%' OR p.email ILIKE '%'||p_search||'%')
 ORDER BY p.created_at DESC LIMIT least(greatest(p_limit,1),100) OFFSET (greatest(p_page,1)-1)*least(greatest(p_limit,1),100)
 ) selected),'[]'::jsonb)) INTO result;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.admin_user_directory(text,text,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_user_directory(text,text,integer,integer) TO authenticated;
