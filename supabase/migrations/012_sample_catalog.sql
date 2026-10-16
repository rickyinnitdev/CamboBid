-- Licensed illustrative stock photos, not representations of real goods for sale.
CREATE TABLE public.sample_catalog (
 id integer PRIMARY KEY, title text NOT NULL, photo_id text NOT NULL, source_url text NOT NULL
);
INSERT INTO public.sample_catalog VALUES
 (1,'Studio headphones','3394652','https://www.pexels.com/photo/white-headphones-3394652/'),
 (2,'Digital camera','6891485','https://www.pexels.com/photo/a-camera-on-a-white-background-6891485/'),
 (3,'Smart watch','9107751','https://www.pexels.com/photo/smartwatch-on-a-white-surface-9107751/'),
 (4,'Silver wristwatch set','5788857','https://www.pexels.com/photo/close-up-shot-of-silver-wristwatches-on-a-white-surface-5788857/'),
 (5,'Photography backpack','18510444','https://www.pexels.com/photo/olive-green-backpack-for-photographic-equipment-18510444/'),
 (6,'Sport sneakers','2529148','https://www.pexels.com/photo/photo-of-sneakers-on-white-background-2529148/'),
 (7,'White sneakers','1461048','https://www.pexels.com/photo/pair-of-white-sneakers-on-white-background-1461048/'),
 (8,'Camera lens and keyboard','18979918','https://www.pexels.com/photo/camera-lens-and-a-keyboard-18979918/'),
 (9,'Ceramic mug','11075707','https://www.pexels.com/photo/a-white-ceramic-mug-on-a-white-surface-11075707/'),
 (10,'Minimal table lamp','6825311','https://www.pexels.com/photo/lamp-on-table-6825311/');
ALTER TABLE public.sample_catalog ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sample_catalog FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.sample_catalog TO authenticated;
CREATE POLICY sample_catalog_read ON public.sample_catalog FOR SELECT TO authenticated USING(public.staff_session());
GRANT ALL ON public.sample_catalog TO service_role;

CREATE FUNCTION public.create_sample_auctions(p_count integer DEFAULT 1,p_minutes integer DEFAULT 2,p_mode text DEFAULT 'demo') RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c uuid;l uuid;a uuid;item record;result jsonb:='[]'; BEGIN
 IF NOT public.staff_session() OR NOT(public.is_super_admin() OR public.is_auctioneer()) THEN RAISE EXCEPTION 'Auction staff with MFA required'; END IF;
 IF p_count NOT BETWEEN 1 AND 10 OR p_minutes NOT BETWEEN 2 AND 10080 OR p_mode NOT IN ('demo','live') THEN RAISE EXCEPTION 'Invalid sample auction options'; END IF;
 IF p_mode='live' AND (SELECT mode FROM public.payment_settings WHERE id)<>'live' THEN RAISE EXCEPTION 'Configure and explicitly enable live KHQR in Integrations first'; END IF;
 PERFORM pg_advisory_xact_lock(771027);
 IF (SELECT count(*) FROM public.auctions a JOIN public.listings l ON l.id=a.listing_id WHERE l.seller_id=auth.uid() AND l.title LIKE '[SAMPLE]%' AND a.created_at>now()-interval '1 hour')+p_count>20 THEN RAISE EXCEPTION 'Sample auction limit reached; reuse an existing auction'; END IF;
 SELECT id INTO c FROM public.categories WHERE slug='university-samples';
 IF c IS NULL THEN INSERT INTO public.categories(name,slug,description) VALUES('University samples','university-samples','Illustrative test items. No physical goods are offered.') RETURNING id INTO c; END IF;
 FOR item IN SELECT * FROM public.sample_catalog ORDER BY id LIMIT p_count LOOP
 INSERT INTO public.listings(seller_id,title,description,category_id,images,starting_price,reserve_price,status,approved_by,approved_at)
 VALUES(auth.uid(),'[SAMPLE] '||item.title,
 'University payment and bidding test. No physical item will be delivered. '||CASE WHEN p_mode='live' THEN 'REAL MONEY TEST: payments use actual USD; arrange refunds with project staff.' ELSE 'Demo funds only.' END||E'\nIllustrative stock photo: '||item.source_url||E'\nPexels license: https://www.pexels.com/license/',
 c,jsonb_build_array('https://images.pexels.com/photos/'||item.photo_id||'/pexels-photo-'||item.photo_id||'.jpeg?auto=compress&cs=tinysrgb&w=1000'),0.01,0.01,'live',auth.uid(),now()) RETURNING id INTO l;
 INSERT INTO public.auctions(listing_id,type,status,start_time,end_time,original_end_time,current_price,bid_increment,timer_extension_minutes,timer_extension_threshold_seconds,payment_mode)
 VALUES(l,'english','live',now(),now()+make_interval(mins=>p_minutes),now()+make_interval(mins=>p_minutes),0.01,0.01,1,20,p_mode) RETURNING id INTO a;
 result:=result||jsonb_build_array(jsonb_build_object('id',a,'title',item.title,'mode',p_mode));
 END LOOP;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.create_sample_auctions(integer,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_sample_auctions(integer,integer,text) TO authenticated;

-- Seed the requested ten demo auctions once, if a project admin already exists.
DO $$ DECLARE owner_id uuid;previous_claims text; BEGIN
 SELECT id INTO owner_id FROM public.profiles WHERE role='super_admin' AND NOT suspended ORDER BY created_at LIMIT 1;
 IF owner_id IS NOT NULL THEN
 previous_claims:=current_setting('request.jwt.claims',true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'aal','aal2','role','authenticated')::text,true);
 PERFORM public.create_sample_auctions(10,4320,'demo');
 PERFORM set_config('request.jwt.claims',coalesce(previous_claims,'{}'),true);
 END IF;
END $$;
