-- Pin the remaining project-owned authorization helpers.
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('get_user_role','current_user_role','is_super_admin','has_role','has_permission','is_escrow_manager','is_auctioneer','is_verified_bidder','is_authenticated','current_user_id','update_last_active') LOOP
 EXECUTE format('ALTER FUNCTION %s SET search_path = %L',f.signature,'');
 END LOOP;
 -- Trigger functions are invoked by PostgreSQL, never by a client RPC.
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.prorettype='trigger'::regtype LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
 END LOOP;
END $$;
-- Configuration, financial state and generated AI results use vetted RPC/Edge paths.
REVOKE INSERT,UPDATE,DELETE ON public.auctions,public.ai_listing_analyses FROM anon,authenticated;
CREATE POLICY ai_staff_mfa ON public.ai_listing_analyses AS RESTRICTIVE FOR SELECT TO authenticated
 USING(requested_by=auth.uid() OR NOT (public.is_super_admin() OR public.is_auctioneer()) OR public.staff_session());
CREATE POLICY notification_staff_mfa ON public.notifications AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(public.staff_session());

CREATE FUNCTION public.safe_object_path(p_name text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT p_name IS NOT NULL AND length(p_name) BETWEEN 3 AND 300 AND p_name!~'(^|/)\.{1,2}(/|$)' AND strpos(p_name,chr(92))=0 AND p_name!~'[[:cntrl:]]';
$$;
GRANT EXECUTE ON FUNCTION public.safe_object_path(text) TO anon,authenticated;
CREATE POLICY secure_upload_boundary ON storage.objects AS RESTRICTIVE FOR INSERT TO anon,authenticated WITH CHECK(
 public.safe_object_path(name) AND
 CASE WHEN bucket_id='platform-assets' THEN public.staff_session() AND public.is_super_admin() AND name~*'\.(jpg|jpeg|png|webp|gif)$'
 WHEN bucket_id IN ('listing-images','identity-documents','dispute-evidence') THEN public.identity_session()
 AND ((storage.foldername(name))[1]=auth.uid()::text OR (bucket_id='listing-images' AND public.staff_session() AND public.is_super_admin()))
 AND CASE WHEN bucket_id='listing-images' THEN name~*'\.(jpg|jpeg|png|webp|gif)$' ELSE name~*'\.(jpg|jpeg|png|pdf)$' END
 ELSE false END);
CREATE POLICY secure_storage_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon,authenticated
 USING(public.identity_session() AND ((storage.foldername(name))[1]=auth.uid()::text OR (public.staff_session() AND public.is_super_admin())))
 WITH CHECK(public.safe_object_path(name) AND public.identity_session() AND ((storage.foldername(name))[1]=auth.uid()::text OR (public.staff_session() AND public.is_super_admin())));
CREATE POLICY private_evidence_mfa ON storage.objects AS RESTRICTIVE FOR SELECT TO anon,authenticated
 USING(bucket_id<>'dispute-evidence' OR public.identity_session() OR public.staff_session());
CREATE POLICY private_delete_mfa ON storage.objects AS RESTRICTIVE FOR DELETE TO anon,authenticated
 USING(public.identity_session() OR public.staff_session());
CREATE POLICY legacy_listing_image_owner_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='listing-images' AND EXISTS(
 SELECT 1 FROM public.listings l WHERE l.id::text=(storage.foldername(name))[1] AND l.seller_id=auth.uid()));
UPDATE storage.buckets SET file_size_limit=5242880,allowed_mime_types=ARRAY['image/jpeg','image/png','application/pdf'] WHERE id IN ('identity-documents','dispute-evidence');
UPDATE storage.buckets SET file_size_limit=5242880,allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp','image/gif'] WHERE id='platform-assets';

-- Bound user text at the database boundary, including direct PostgREST requests.
ALTER TABLE public.profiles ADD CONSTRAINT profile_text_limits CHECK(length(display_name)<=100 AND length(coalesce(phone,''))<=40 AND length(coalesce(bio,''))<=4000 AND length(coalesce(location,''))<=200 AND length(coalesce(avatar_url,''))<=2048) NOT VALID;
ALTER TABLE public.listings ADD CONSTRAINT listing_text_limits CHECK(length(title) BETWEEN 1 AND 200 AND length(description)<=20000 AND jsonb_typeof(images)='array' AND jsonb_array_length(images)<=20) NOT VALID;
ALTER TABLE public.disputes ADD CONSTRAINT dispute_text_limits CHECK(length(reason) BETWEEN 1 AND 500 AND length(description)<=20000 AND jsonb_typeof(evidence)='array' AND jsonb_array_length(evidence)<=20) NOT VALID;

-- Atomic server-only request budget. It is not an authentication substitute.
CREATE TABLE public.api_rate_limits(user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,action text NOT NULL,window_start timestamptz NOT NULL,count integer NOT NULL CHECK(count>0),PRIMARY KEY(user_id,action,window_start));
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_rate_limits FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.api_rate_limits TO service_role;
CREATE INDEX api_rate_limits_cleanup ON public.api_rate_limits(window_start);
CREATE FUNCTION public.claim_api_action(p_user uuid,p_action text,p_limit integer,p_window integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE bucket timestamptz;used integer; BEGIN
 IF p_user IS NULL OR p_action NOT IN ('checkout_create','listing_analysis','notification_send','document_view') OR p_limit NOT BETWEEN 1 AND 1000 OR p_window NOT BETWEEN 1 AND 86400 THEN RAISE EXCEPTION 'Invalid request budget'; END IF;
 bucket:=to_timestamp(floor(extract(epoch FROM clock_timestamp())/p_window)*p_window);
 INSERT INTO public.api_rate_limits(user_id,action,window_start,count) VALUES(p_user,p_action,bucket,1)
 ON CONFLICT(user_id,action,window_start) DO UPDATE SET count=public.api_rate_limits.count+1 WHERE public.api_rate_limits.count<p_limit RETURNING count INTO used;
 DELETE FROM public.api_rate_limits WHERE window_start<now()-interval '2 days';
 RETURN used IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.claim_api_action(uuid,text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_api_action(uuid,text,integer,integer) TO service_role;

CREATE INDEX IF NOT EXISTS payment_checkout_owner_recent ON public.payment_checkouts(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS wallet_ledger_owner_recent ON public.wallet_ledger(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS funded_expiry_candidates ON public.auctions(end_time) WHERE status IN ('live','extended');
