CREATE FUNCTION public.audit_platform_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE row_data jsonb;rid uuid;
BEGIN
 IF TG_OP='DELETE' THEN row_data:=to_jsonb(OLD); ELSE row_data:=to_jsonb(NEW); END IF;
 rid:=(row_data->>'id')::uuid;
 IF auth.uid() IS NOT NULL THEN
 INSERT INTO public.activity_logs(actor_id,action,resource_type,resource_id,metadata)
 VALUES(auth.uid(),lower(TG_OP)||'_'||TG_TABLE_NAME,TG_TABLE_NAME,rid,
 jsonb_build_object('record_key',coalesce(row_data->>'id',row_data->>'key'),'changed_fields',
 CASE WHEN TG_OP='UPDATE' THEN (SELECT jsonb_agg(k) FROM jsonb_object_keys(row_data) k WHERE row_data->k IS DISTINCT FROM to_jsonb(OLD)->k)
 ELSE NULL END));
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;RETURN NEW;
END; $$;
DO $$ DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['profiles','roles','permissions','role_permissions','categories','listings','auctions','disputes','cms_translations','platform_settings'] LOOP
 EXECUTE format('CREATE TRIGGER audit_platform_change AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_platform_change()',t);
 END LOOP;
END $$;
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon,authenticated;
UPDATE storage.buckets SET file_size_limit=5242880 WHERE id='identity-documents';

-- A low-value, short auction makes the professor presentation reproducible.
CREATE FUNCTION public.create_presentation_auction() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE c uuid;l uuid;a uuid;
BEGIN
 IF NOT public.staff_session() OR NOT(public.is_super_admin() OR public.is_auctioneer()) THEN RAISE EXCEPTION 'Auction staff with MFA required'; END IF;
 SELECT id INTO c FROM public.categories ORDER BY sort_order LIMIT 1;
 IF c IS NULL THEN INSERT INTO public.categories(name,slug) VALUES('Presentation','presentation') RETURNING id INTO c; END IF;
 INSERT INTO public.listings(seller_id,title,description,category_id,starting_price,reserve_price,status,approved_by,approved_at)
 VALUES(auth.uid(),'Demo bidding battle — sample collectible','University demonstration item. Demo funds only; no physical sale.',c,10,10,'live',auth.uid(),now()) RETURNING id INTO l;
 INSERT INTO public.auctions(listing_id,type,status,start_time,end_time,original_end_time,current_price,bid_increment,timer_extension_minutes,timer_extension_threshold_seconds,payment_mode)
 VALUES(l,'english','live',now(),now()+interval '2 minutes',now()+interval '2 minutes',10,1,1,20,'demo') RETURNING id INTO a;
 RETURN a;
END; $$;
REVOKE ALL ON FUNCTION public.create_presentation_auction() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_presentation_auction() TO authenticated;

ALTER TABLE public.payment_checkouts ADD COLUMN last_checked_at timestamptz;
CREATE FUNCTION public.claim_payment_check(p_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 UPDATE public.payment_checkouts SET last_checked_at=now() WHERE id=p_id
 AND (last_checked_at IS NULL OR last_checked_at<now()-interval '10 seconds');
 RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.claim_payment_check(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_payment_check(uuid) TO service_role;

-- Reconciliation only consumes a receipt already verified by the payment backend.
-- It credits the wallet, avoiding a second payment to an already-funded order.
CREATE FUNCTION public.reconcile_payment(p_id uuid,p_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE p public.payment_checkouts;
BEGIN
 IF NOT public.staff_session() OR NOT public.is_super_admin() THEN RAISE EXCEPTION 'Super admin with MFA required'; END IF;
 IF length(trim(coalesce(p_reason,'')))<10 THEN RAISE EXCEPTION 'Explain the reconciliation decision'; END IF;
 PERFORM pg_advisory_xact_lock(771024);
 SELECT * INTO p FROM public.payment_checkouts WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR p.status<>'reconciliation' OR p.transaction_hash IS NULL THEN RAISE EXCEPTION 'A verified unmatched receipt is required'; END IF;
 PERFORM public.wallet_move(p.user_id,p.mode,p.amount_minor,0,'reconciled_receipt',p.id);
 UPDATE public.payment_checkouts SET status='paid',paid_at=now() WHERE id=p.id;
 INSERT INTO public.activity_logs(actor_id,action,resource_type,resource_id,metadata)
 VALUES(auth.uid(),'payment_reconciled','payment',p.id,jsonb_build_object('reason',p_reason,'user_id',p.user_id,'mode',p.mode));
END; $$;
REVOKE ALL ON FUNCTION public.reconcile_payment(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reconcile_payment(uuid,text) TO authenticated;

CREATE FUNCTION public.publish_policy(p_kind text,p_version text,p_title text,p_content text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT public.staff_session() OR NOT public.is_super_admin() THEN RAISE EXCEPTION 'Super admin with MFA required'; END IF;
 IF p_kind NOT IN ('terms','privacy') OR length(trim(p_version)) NOT BETWEEN 1 AND 50 OR length(trim(p_title)) NOT BETWEEN 3 AND 100
 OR length(trim(p_content))<100 THEN RAISE EXCEPTION 'Provide a new version, title and complete document'; END IF;
 PERFORM pg_advisory_xact_lock(771025);
 IF EXISTS(SELECT 1 FROM public.policy_documents WHERE kind=p_kind AND version=p_version) THEN RAISE EXCEPTION 'Use a new version; published documents are immutable'; END IF;
 UPDATE public.policy_documents SET current=false WHERE kind=p_kind AND current;
 INSERT INTO public.policy_documents(kind,version,title,content) VALUES(p_kind,p_version,p_title,p_content);
 INSERT INTO public.activity_logs(actor_id,action,resource_type,metadata) VALUES(auth.uid(),'policy_published','policy',jsonb_build_object('kind',p_kind,'version',p_version));
END; $$;
REVOKE ALL ON FUNCTION public.publish_policy(text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.publish_policy(text,text,text,text) TO authenticated;
