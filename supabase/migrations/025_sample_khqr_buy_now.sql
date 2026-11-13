-- Give live test items a one-cent Buy Now price for direct KHQR checkout.
CREATE OR REPLACE FUNCTION public.create_sample_auctions(p_count integer DEFAULT 1,p_minutes integer DEFAULT 2,p_mode text DEFAULT 'demo') RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c uuid;l uuid;a uuid;item record;result jsonb:='[]'; BEGIN
 IF NOT public.staff_session() OR NOT(public.is_super_admin() OR public.is_auctioneer()) THEN RAISE EXCEPTION 'Auction staff with MFA required'; END IF;
 IF p_count NOT BETWEEN 1 AND 10 OR p_minutes NOT BETWEEN 2 AND 10080 OR p_mode NOT IN ('demo','live') THEN RAISE EXCEPTION 'Invalid sample auction options'; END IF;
 IF p_mode='live' AND NOT EXISTS (SELECT 1 FROM public.payment_settings WHERE id AND mode='live' AND live_enabled) THEN RAISE EXCEPTION 'Configure and explicitly enable live KHQR in Integrations first'; END IF;
 PERFORM pg_advisory_xact_lock(771027);
 IF (SELECT count(*) FROM public.auctions a JOIN public.listings l ON l.id=a.listing_id WHERE l.seller_id=auth.uid() AND l.title LIKE '[SAMPLE]%' AND a.created_at>now()-interval '1 hour')+p_count>20 THEN RAISE EXCEPTION 'Sample auction limit reached; reuse an existing auction'; END IF;
 SELECT id INTO c FROM public.categories WHERE slug='university-samples';
 IF c IS NULL THEN INSERT INTO public.categories(name,slug,description) VALUES('University samples','university-samples','Illustrative test items. No physical goods are offered.') RETURNING id INTO c; END IF;
 FOR item IN SELECT * FROM public.sample_catalog ORDER BY id LIMIT p_count LOOP
 INSERT INTO public.listings(seller_id,title,description,category_id,images,starting_price,reserve_price,buy_it_now_price,status,approved_by,approved_at)
 VALUES(auth.uid(),'[SAMPLE] '||item.title,
 'University payment and bidding test. No physical item will be delivered. '||CASE WHEN p_mode='live' THEN 'REAL MONEY TEST: payments use actual USD; arrange refunds with project staff.' ELSE 'Demo funds only.' END||E'\nIllustrative stock photo: '||item.source_url||E'\nPexels license: https://www.pexels.com/license/',
 c,jsonb_build_array('https://images.pexels.com/photos/'||item.photo_id||'/pexels-photo-'||item.photo_id||'.jpeg?auto=compress&cs=tinysrgb&w=1000'),0.01,0.01,CASE WHEN p_mode='live' THEN 0.01 END,'live',auth.uid(),now()) RETURNING id INTO l;
 INSERT INTO public.auctions(listing_id,type,status,start_time,end_time,original_end_time,current_price,bid_increment,timer_extension_minutes,timer_extension_threshold_seconds,payment_mode)
 VALUES(l,'english','live',now(),now()+make_interval(mins=>p_minutes),now()+make_interval(mins=>p_minutes),0.01,0.01,1,20,p_mode) RETURNING id INTO a;
 result:=result||jsonb_build_array(jsonb_build_object('id',a,'title',item.title,'mode',p_mode));
 END LOOP;
 RETURN result;
END $$;
