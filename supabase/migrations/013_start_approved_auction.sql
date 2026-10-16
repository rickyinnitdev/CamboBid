ALTER TABLE public.auctions ADD COLUMN max_extensions integer CHECK(max_extensions BETWEEN 0 AND 100),
 ADD COLUMN extension_count integer NOT NULL DEFAULT 0 CHECK(extension_count>=0);

CREATE FUNCTION public.start_approved_auction(p_listing uuid,p_starting numeric,p_reserve numeric,p_increment numeric,
 p_minutes integer,p_extension integer,p_max integer,p_mode text DEFAULT 'demo') RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE l public.listings;a public.auctions; BEGIN
 IF NOT public.staff_session() OR NOT(public.is_super_admin() OR public.is_auctioneer()) THEN RAISE EXCEPTION 'Auction staff with MFA required'; END IF;
 IF p_starting IS NULL OR p_starting NOT BETWEEN 0.01 AND 1000000 OR p_starting<>round(p_starting,2)
 OR p_increment IS NULL OR p_increment NOT BETWEEN 0.01 AND 1000000 OR p_increment<>round(p_increment,2)
 OR (p_reserve IS NOT NULL AND (p_reserve NOT BETWEEN 0 AND 1000000 OR p_reserve<>round(p_reserve,2)))
 OR p_minutes IS NULL OR p_minutes NOT BETWEEN 2 AND 10080 OR p_extension IS NULL OR p_extension NOT BETWEEN 0 AND 60
 OR p_max IS NULL OR p_max NOT BETWEEN 0 AND 100 OR p_mode IS NULL OR p_mode NOT IN ('demo','live') THEN RAISE EXCEPTION 'Use cent amounts, a 2-minute to 7-day duration, and valid extension settings'; END IF;
 IF p_mode='live' AND (SELECT mode FROM public.payment_settings WHERE id)<>'live' THEN RAISE EXCEPTION 'Enable real KHQR in Integrations before starting a live-payment auction'; END IF;
 PERFORM pg_advisory_xact_lock(771024);
 SELECT * INTO l FROM public.listings WHERE id=p_listing FOR UPDATE;
 IF NOT FOUND OR l.status<>'approved' THEN RAISE EXCEPTION 'Select an approved listing'; END IF;
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id=l.seller_id AND suspended) THEN RAISE EXCEPTION 'The seller account is suspended'; END IF;
 IF EXISTS(SELECT 1 FROM public.auctions WHERE listing_id=p_listing AND status NOT IN ('closed','cancelled')) THEN RAISE EXCEPTION 'This listing already has an auction'; END IF;
 INSERT INTO public.auctions(listing_id,type,status,start_time,end_time,original_end_time,current_price,bid_increment,
 timer_extension_minutes,timer_extension_threshold_seconds,max_extensions,payment_mode)
 VALUES(l.id,'english','live',now(),now()+make_interval(mins=>p_minutes),now()+make_interval(mins=>p_minutes),p_starting,p_increment,
 p_extension,20,p_max,p_mode) RETURNING * INTO a;
 UPDATE public.listings SET status='live',starting_price=p_starting,reserve_price=p_reserve WHERE id=l.id;
 RETURN to_jsonb(a);
END $$;
REVOKE ALL ON FUNCTION public.start_approved_auction(uuid,numeric,numeric,numeric,integer,integer,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.start_approved_auction(uuid,numeric,numeric,numeric,integer,integer,integer,text) TO authenticated;

CREATE FUNCTION public.configure_auction(p_auction uuid,p_increment numeric,p_reserve numeric,p_extension integer,p_max integer) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.auctions; BEGIN
 IF NOT public.staff_session() OR NOT(public.is_super_admin() OR public.is_auctioneer()) THEN RAISE EXCEPTION 'Auction staff with MFA required'; END IF;
 IF p_increment IS NULL OR p_increment NOT BETWEEN 0.01 AND 1000000 OR p_increment<>round(p_increment,2)
 OR (p_reserve IS NOT NULL AND (p_reserve NOT BETWEEN 0 AND 1000000 OR p_reserve<>round(p_reserve,2)))
 OR p_extension IS NULL OR p_extension NOT BETWEEN 0 AND 60 OR (p_max IS NOT NULL AND p_max NOT BETWEEN 0 AND 100) THEN RAISE EXCEPTION 'Invalid auction settings'; END IF;
 PERFORM pg_advisory_xact_lock(771024);
 SELECT * INTO a FROM public.auctions WHERE id=p_auction FOR UPDATE;
 IF NOT FOUND OR a.status NOT IN ('live','scheduled','extended') OR a.end_time<=now() THEN RAISE EXCEPTION 'Auction is no longer editable'; END IF;
 IF EXISTS(SELECT 1 FROM public.bids WHERE auction_id=p_auction) THEN RAISE EXCEPTION 'Auction settings are locked after the first bid'; END IF;
 UPDATE public.auctions SET bid_increment=p_increment,timer_extension_minutes=p_extension,max_extensions=p_max WHERE id=a.id RETURNING * INTO a;
 UPDATE public.listings SET reserve_price=p_reserve WHERE id=a.listing_id;
 RETURN to_jsonb(a);
END $$;
REVOKE ALL ON FUNCTION public.configure_auction(uuid,numeric,numeric,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.configure_auction(uuid,numeric,numeric,integer,integer) TO authenticated;

-- Preserve existing unlimited extensions; enforce the cap for newly configured auctions.
DO $$ DECLARE definition text; BEGIN
 SELECT pg_get_functiondef('public.place_funded_bid(uuid,bigint,bigint,text)'::regprocedure) INTO definition;
 definition:=replace(definition,'extended:=a.end_time-now()<=make_interval(secs=>a.timer_extension_threshold_seconds);',
 'extended:=a.timer_extension_minutes>0 AND (a.max_extensions IS NULL OR a.extension_count<a.max_extensions) AND a.end_time-now()<=make_interval(secs=>a.timer_extension_threshold_seconds);');
 definition:=replace(definition,'status=CASE WHEN extended THEN',
 'extension_count=a.extension_count+CASE WHEN extended THEN 1 ELSE 0 END,status=CASE WHEN extended THEN');
 EXECUTE definition;
END $$;
