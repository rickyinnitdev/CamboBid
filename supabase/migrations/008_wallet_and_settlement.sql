-- USD integer cents; demo and live balances never mix. Financial mutations share
-- one advisory transaction lock, then row locks. This favors correctness for a
-- university demo over high-volume throughput. All RPCs validate their caller.
ALTER TABLE public.auctions ADD COLUMN payment_mode text NOT NULL DEFAULT 'demo' CHECK(payment_mode IN ('demo','live'));
ALTER TABLE public.escrow_transactions ADD COLUMN payment_mode text NOT NULL DEFAULT 'demo' CHECK(payment_mode IN ('demo','live')),
 ADD COLUMN funded_at timestamptz;
CREATE TABLE public.wallet_accounts (
 user_id uuid NOT NULL REFERENCES public.profiles(id), mode text NOT NULL CHECK(mode IN ('demo','live')),
 available bigint NOT NULL DEFAULT 0 CHECK(available>=0), reserved bigint NOT NULL DEFAULT 0 CHECK(reserved>=0),
 PRIMARY KEY(user_id,mode)
);
CREATE TABLE public.wallet_ledger (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES public.profiles(id),
 mode text NOT NULL CHECK(mode IN ('demo','live')), available_delta bigint NOT NULL, reserved_delta bigint NOT NULL,
 reason text NOT NULL, reference uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.bid_authorizations (
 auction_id uuid NOT NULL REFERENCES public.auctions(id), user_id uuid NOT NULL REFERENCES public.profiles(id),
 cap bigint NOT NULL CHECK(cap>0), proxy boolean NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(auction_id,user_id)
);
CREATE TABLE public.payment_checkouts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES public.profiles(id),
 mode text NOT NULL CHECK(mode IN ('demo','live')), amount_minor bigint NOT NULL CHECK(amount_minor BETWEEN 100 AND 100000),
 currency text NOT NULL DEFAULT 'USD' CHECK(currency='USD'), order_id uuid REFERENCES public.escrow_transactions(id),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','expired','reconciliation')),
 receiver text, qr text, md5 text, transaction_hash text UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes',paid_at timestamptz
);
CREATE UNIQUE INDEX one_pending_order_checkout ON public.payment_checkouts(order_id) WHERE status='pending';
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['wallet_accounts','wallet_ledger','bid_authorizations','payment_checkouts'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY "Owner or verified staff" ON public.%I FOR SELECT USING(user_id=auth.uid() OR public.staff_session())',t);
 EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
 EXECUTE format('REVOKE INSERT,UPDATE,DELETE ON public.%I FROM anon,authenticated',t);
 END LOOP;
END $$;

CREATE FUNCTION public.wallet_move(p_user uuid,p_mode text,p_available bigint,p_reserved bigint,p_reason text,p_reference uuid) RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 INSERT INTO public.wallet_accounts(user_id,mode) VALUES(p_user,p_mode) ON CONFLICT DO NOTHING;
 UPDATE public.wallet_accounts SET available=available+p_available,reserved=reserved+p_reserved WHERE user_id=p_user AND mode=p_mode;
 INSERT INTO public.wallet_ledger(user_id,mode,available_delta,reserved_delta,reason,reference)
 VALUES(p_user,p_mode,p_available,p_reserved,p_reason,p_reference);
END; $$;
REVOKE ALL ON FUNCTION public.wallet_move(uuid,text,bigint,bigint,text,uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.place_funded_bid(p_auction uuid,p_amount bigint,p_cap bigint DEFAULT NULL,p_device text DEFAULT NULL) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public.auctions; l public.listings; h record; competitor record; own_cap bigint; cap bigint;
 winner uuid; final_price bigint; minimum bigint; bid_id uuid; extended boolean:=false; previous uuid;
BEGIN
 PERFORM public.require_eligible();
 PERFORM pg_advisory_xact_lock(771024);
 SELECT * INTO a FROM public.auctions WHERE id=p_auction FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Auction not found'; END IF;
 SELECT * INTO l FROM public.listings WHERE id=a.listing_id;
 IF a.type<>'english' THEN RAISE EXCEPTION 'Funded bidding currently supports English auctions only'; END IF;
 IF a.status NOT IN ('live','extended') OR a.start_time>now() OR a.end_time<=now() THEN RAISE EXCEPTION 'Auction is not accepting bids'; END IF;
 IF l.seller_id=auth.uid() THEN RAISE EXCEPTION 'You cannot bid on your own item'; END IF;
 IF (SELECT count(*) FROM public.bids WHERE bidder_id=auth.uid() AND placed_at>now()-interval '1 minute') >=
 (SELECT bid_limit FROM public.profiles WHERE id=auth.uid()) THEN RAISE EXCEPTION 'Bid rate limit reached'; END IF;
 minimum:=round(a.current_price*100)::bigint+round(a.bid_increment*100)::bigint;
 cap:=coalesce(p_cap,p_amount);
 IF p_amount IS NULL OR p_amount<minimum OR cap<p_amount OR cap>100000000 OR (p_cap IS NOT NULL AND cap<=p_amount)
 THEN RAISE EXCEPTION 'Bid must meet the minimum; proxy maximum must exceed the bid'; END IF;
 previous:=a.winner_id;
 SELECT coalesce(max(b.cap),0) INTO own_cap FROM public.bid_authorizations b WHERE auction_id=p_auction AND user_id=auth.uid();
 IF cap<own_cap THEN RAISE EXCEPTION 'An active authorization cannot be reduced'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.wallet_accounts WHERE user_id=auth.uid() AND mode=a.payment_mode AND available>=cap-own_cap)
 THEN RAISE EXCEPTION 'Insufficient available wallet funds. Top up before bidding'; END IF;
 PERFORM public.wallet_move(auth.uid(),a.payment_mode,own_cap-cap,cap-own_cap,'bid_reserved',p_auction);
 INSERT INTO public.bid_authorizations(auction_id,user_id,cap,proxy) VALUES(p_auction,auth.uid(),cap,p_cap IS NOT NULL)
 ON CONFLICT(auction_id,user_id) DO UPDATE SET cap=excluded.cap,proxy=excluded.proxy;
 -- Revoke standing proxy authority for accounts no longer eligible.
 FOR h IN SELECT b.* FROM public.bid_authorizations b JOIN public.profiles p ON p.id=b.user_id
 WHERE b.auction_id=p_auction AND (p.suspended OR NOT p.identity_verified OR EXISTS(
 SELECT 1 FROM public.policy_documents d WHERE d.current AND NOT EXISTS(SELECT 1 FROM public.policy_acceptances x WHERE x.user_id=b.user_id AND x.kind=d.kind AND x.version=d.version))) LOOP
 PERFORM public.wallet_move(h.user_id,a.payment_mode,h.cap,-h.cap,'authorization_revoked',p_auction);
 DELETE FROM public.bid_authorizations WHERE auction_id=p_auction AND user_id=h.user_id;
 END LOOP;
 SELECT b.* INTO competitor FROM public.bid_authorizations b WHERE b.auction_id=p_auction AND b.user_id<>auth.uid() AND b.proxy AND b.cap>=p_amount
 ORDER BY b.cap DESC,b.created_at,b.user_id LIMIT 1;
 winner:=auth.uid();final_price:=p_amount;
 IF competitor.user_id IS NOT NULL THEN
   IF competitor.cap>=cap THEN winner:=competitor.user_id;final_price:=least(competitor.cap,cap+round(a.bid_increment*100)::bigint);
   ELSE final_price:=greatest(p_amount,least(cap,competitor.cap+round(a.bid_increment*100)::bigint)); END IF;
 END IF;
 UPDATE public.bids SET status='outbid' WHERE auction_id=p_auction AND status='winning';
 INSERT INTO public.bids(auction_id,bidder_id,amount,proxy_max_amount,is_proxy,status,device_fingerprint)
 VALUES(p_auction,auth.uid(),p_amount/100.0,CASE WHEN p_cap IS NOT NULL THEN p_cap/100.0 END,p_cap IS NOT NULL,
 CASE WHEN winner=auth.uid() THEN 'winning'::public.bid_status ELSE 'outbid'::public.bid_status END,left(p_device,200)) RETURNING id INTO bid_id;
 IF winner<>auth.uid() THEN
 INSERT INTO public.bids(auction_id,bidder_id,amount,proxy_max_amount,is_proxy,status,proxy_of_bid_id)
 VALUES(p_auction,winner,final_price/100.0,competitor.cap/100.0,true,'winning',bid_id) RETURNING id INTO bid_id;
 ELSIF final_price<>p_amount THEN UPDATE public.bids SET amount=final_price/100.0 WHERE id=bid_id; END IF;
 -- A losing proxy remains reserved only while it can still compete.
 FOR h IN SELECT b.* FROM public.bid_authorizations b WHERE b.auction_id=p_auction AND b.user_id<>winner
 AND (NOT b.proxy OR b.cap<final_price+round(a.bid_increment*100)::bigint) LOOP
 PERFORM public.wallet_move(h.user_id,a.payment_mode,h.cap,-h.cap,'outbid_released',p_auction);
 DELETE FROM public.bid_authorizations WHERE auction_id=p_auction AND user_id=h.user_id;
 END LOOP;
 extended:=a.end_time-now()<=make_interval(secs=>a.timer_extension_threshold_seconds);
 UPDATE public.auctions SET current_price=final_price/100.0,winner_id=winner,reserve_met=final_price>=round(coalesce(l.reserve_price,0)*100),
 end_time=CASE WHEN extended THEN a.end_time+make_interval(mins=>a.timer_extension_minutes) ELSE a.end_time END,
 status=CASE WHEN extended THEN 'extended'::public.auction_status ELSE a.status END WHERE id=p_auction RETURNING * INTO a;
 IF previous IS NOT NULL AND previous<>winner THEN
 INSERT INTO public.notifications(user_id,type,title,body,auction_id) VALUES(previous,'outbid','You have been outbid','Your wallet reservation has been updated.',p_auction); END IF;
 INSERT INTO public.activity_logs(actor_id,action,resource_type,resource_id,metadata) VALUES(auth.uid(),'funded_bid','auction',p_auction,
 jsonb_build_object('amount_minor',p_amount,'winner_id',winner,'price_minor',final_price,'mode',a.payment_mode));
 RETURN jsonb_build_object('success',true,'bid_id',bid_id,'auction_id',p_auction,'bidder_id',winner,'amount',a.current_price,
 'current_price',a.current_price,'reserve_met',a.reserve_met,'timer_extended',extended,'new_end_time',a.end_time,'placed_at',now());
END; $$;

CREATE FUNCTION public.close_funded_auction(p_auction uuid,p_reason text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public.auctions;l public.listings;h record;price bigint;funded boolean:=false;order_id uuid;met boolean;
BEGIN
 IF NOT public.staff_session() OR NOT(public.is_super_admin() OR public.is_auctioneer()) THEN RAISE EXCEPTION 'Auction staff with MFA required'; END IF;
 PERFORM pg_advisory_xact_lock(771024);
 SELECT * INTO a FROM public.auctions WHERE id=p_auction FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Auction not found'; END IF;
 IF a.status IN ('closed','cancelled') THEN
 SELECT id INTO order_id FROM public.escrow_transactions WHERE auction_id=p_auction ORDER BY created_at LIMIT 1;
 RETURN jsonb_build_object('success',true,'escrow_id',order_id,'winner_id',a.winner_id); END IF;
 IF a.end_time>now() THEN RAISE EXCEPTION 'Wait until the auction timer ends before settlement'; END IF;
 SELECT * INTO l FROM public.listings WHERE id=a.listing_id;
 price:=round(a.current_price*100)::bigint;
 met:=a.winner_id IS NOT NULL AND price>=round(coalesce(l.reserve_price,0)*100);
 IF met THEN
 SELECT EXISTS(SELECT 1 FROM public.bid_authorizations WHERE auction_id=p_auction AND user_id=a.winner_id AND cap>=price) INTO funded;
 INSERT INTO public.escrow_transactions(auction_id,buyer_id,seller_id,amount,status,payment_mode,funded_at)
 VALUES(p_auction,a.winner_id,l.seller_id,a.current_price,CASE WHEN funded THEN 'held'::public.escrow_status ELSE 'pending'::public.escrow_status END,a.payment_mode,CASE WHEN funded THEN now() END) RETURNING id INTO order_id;
 UPDATE public.listings SET status='sold' WHERE id=l.id;
 END IF;
 FOR h IN SELECT * FROM public.bid_authorizations WHERE auction_id=p_auction LOOP
 PERFORM public.wallet_move(h.user_id,a.payment_mode,h.cap-CASE WHEN met AND h.user_id=a.winner_id THEN price ELSE 0 END,-h.cap,
 CASE WHEN met AND h.user_id=a.winner_id THEN 'winning_order_funded' ELSE 'auction_reservation_released' END,p_auction);
 END LOOP;
 DELETE FROM public.bid_authorizations WHERE auction_id=p_auction;
 UPDATE public.auctions SET status='closed',closed_by=auth.uid(),closure_reason=p_reason,reserve_met=met,
 winner_id=CASE WHEN met THEN a.winner_id END WHERE id=p_auction;
 INSERT INTO public.notifications(user_id,type,title,body,auction_id)
 SELECT user_id,'auction_ended',CASE WHEN user_id=a.winner_id AND met THEN 'You won the auction' ELSE 'Auction ended' END,
 'Check your orders and wallet for the final settlement.',p_auction FROM
 (SELECT DISTINCT bidder_id user_id FROM public.bids WHERE auction_id=p_auction UNION SELECT l.seller_id) participants;
 INSERT INTO public.activity_logs(actor_id,action,resource_type,resource_id,metadata) VALUES(auth.uid(),'auction_settled','auction',p_auction,jsonb_build_object('escrow_id',order_id,'funded',funded));
 RETURN jsonb_build_object('success',true,'escrow_id',order_id,'winner_id',CASE WHEN met THEN a.winner_id END,'reserve_met',met,'winning_amount',a.current_price);
END; $$;

CREATE FUNCTION public.settle_order(p_order uuid,p_action text,p_notes text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE e public.escrow_transactions;staff boolean;target public.escrow_status;recipient uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(771024);
 SELECT * INTO e FROM public.escrow_transactions WHERE id=p_order FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
 staff:=public.staff_session() AND (public.is_super_admin() OR public.is_escrow_manager());
 IF NOT staff THEN
 PERFORM public.require_eligible();
 IF e.buyer_id<>auth.uid() OR p_action<>'release' THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 IF e.status<>'held' THEN RAISE EXCEPTION 'Only held orders can be confirmed by the buyer'; END IF;
 END IF;
 IF p_action='freeze' AND e.status='held' THEN target:='frozen';
 ELSIF p_action IN ('release','refund') AND e.status IN ('held','frozen') AND e.funded_at IS NOT NULL THEN
 IF p_action='release' AND EXISTS(SELECT 1 FROM public.disputes WHERE auction_id=e.auction_id AND status IN ('open','under_review','appealed')) THEN RAISE EXCEPTION 'Resolve the open dispute before release'; END IF;
 target:=CASE WHEN p_action='release' THEN 'released'::public.escrow_status ELSE 'refunded'::public.escrow_status END;
 recipient:=CASE WHEN p_action='release' THEN e.seller_id ELSE e.buyer_id END;
 PERFORM public.wallet_move(recipient,e.payment_mode,round(e.amount*100)::bigint,0,'order_'||p_action,e.id);
 ELSE RAISE EXCEPTION 'Invalid or already completed order transition'; END IF;
 UPDATE public.escrow_transactions SET status=target,notes=coalesce(p_notes,notes),released_by=auth.uid(),
 released_at=CASE WHEN target='released' THEN now() ELSE released_at END,
 refunded_at=CASE WHEN target='refunded' THEN now() ELSE refunded_at END,
 frozen_at=CASE WHEN target='frozen' THEN now() ELSE frozen_at END WHERE id=e.id;
 INSERT INTO public.activity_logs(actor_id,action,resource_type,resource_id,metadata) VALUES(auth.uid(),'order_'||p_action,'escrow',e.id,jsonb_build_object('mode',e.payment_mode,'notes',p_notes));
 RETURN jsonb_build_object('success',true,'new_status',target,'escrow_id',e.id);
END; $$;

-- Service-only receipt completion. A single transaction consumes a provider hash
-- and funds exactly one wallet or pending order. Late receipts are reconciled.
CREATE FUNCTION public.complete_checkout(p_id uuid,p_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE p public.payment_checkouts;e public.escrow_transactions;
BEGIN
 PERFORM pg_advisory_xact_lock(771024);
 SELECT * INTO p FROM public.payment_checkouts WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
 IF p.status='paid' THEN RETURN jsonb_build_object('status','paid'); END IF;
 IF p_hash IS NULL OR (p.mode='live' AND p_hash !~ '^[a-f0-9]{64}$') OR (p.mode='demo' AND p_hash<>'demo-'||p.id::text) THEN RAISE EXCEPTION 'Invalid receipt hash'; END IF;
 IF p.expires_at<=now() OR p.status<>'pending' THEN
 UPDATE public.payment_checkouts SET status='reconciliation',transaction_hash=p_hash WHERE id=p_id;
 RETURN jsonb_build_object('status','reconciliation'); END IF;
 IF p.order_id IS NOT NULL THEN
 SELECT * INTO e FROM public.escrow_transactions WHERE id=p.order_id FOR UPDATE;
 IF e.status<>'pending' OR e.buyer_id<>p.user_id OR e.payment_mode<>p.mode OR round(e.amount*100)::bigint<>p.amount_minor THEN
 UPDATE public.payment_checkouts SET status='reconciliation',transaction_hash=p_hash WHERE id=p_id;
 RETURN jsonb_build_object('status','reconciliation'); END IF;
 UPDATE public.escrow_transactions SET status='held',funded_at=now() WHERE id=e.id;
 ELSE PERFORM public.wallet_move(p.user_id,p.mode,p.amount_minor,0,'top_up',p.id); END IF;
 UPDATE public.payment_checkouts SET status='paid',paid_at=now(),transaction_hash=p_hash WHERE id=p_id;
 INSERT INTO public.activity_logs(actor_id,action,resource_type,resource_id,metadata) VALUES(p.user_id,'payment_confirmed','payment',p.id,jsonb_build_object('mode',p.mode,'amount_minor',p.amount_minor,'order_id',p.order_id));
 RETURN jsonb_build_object('status','paid');
END; $$;
REVOKE ALL ON FUNCTION public.complete_checkout(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_checkout(uuid,text) TO service_role;
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
 AND p.proname IN ('place_funded_bid','close_funded_auction','settle_order') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon',f.signature);
 EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature);
 END LOOP;
END $$;

-- Keep staff from bypassing atomic settlement via direct auction edits/deletes.
CREATE FUNCTION public.guard_auction_finance() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF current_user IN ('authenticated','anon') THEN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Auctions cannot be deleted through the client'; END IF;
 IF TG_OP='INSERT' THEN
 IF NEW.winner_id IS NOT NULL OR NEW.payment_mode<>'demo' OR NEW.status IN ('closed','cancelled') THEN RAISE EXCEPTION 'Invalid initial auction state'; END IF;
 ELSIF OLD.status IN ('closed','cancelled') OR NEW.status IN ('closed','cancelled') OR NEW.current_price IS DISTINCT FROM OLD.current_price OR NEW.winner_id IS DISTINCT FROM OLD.winner_id
 OR NEW.payment_mode<>OLD.payment_mode OR NEW.listing_id<>OLD.listing_id OR NEW.reserve_met<>OLD.reserve_met THEN
 RAISE EXCEPTION 'Use secure auction settlement; finance fields are server managed';
 END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END; $$;
CREATE TRIGGER guard_auction_finance BEFORE INSERT OR UPDATE OR DELETE ON public.auctions FOR EACH ROW EXECUTE FUNCTION public.guard_auction_finance();

-- Public bid history excludes IP addresses, fingerprints and private proxy caps.
CREATE FUNCTION public.auction_bid_history(p_auction uuid) RETURNS TABLE(id uuid,amount numeric,is_proxy boolean,status public.bid_status,placed_at timestamptz,bidder_id uuid,bidder jsonb)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT b.id,b.amount,b.is_proxy,b.status,b.placed_at,b.bidder_id,jsonb_build_object('display_name',p.display_name,'avatar_url',p.avatar_url)
 FROM public.bids b JOIN public.profiles p ON p.id=b.bidder_id JOIN public.auctions a ON a.id=b.auction_id
 WHERE a.id=p_auction AND a.status IN ('live','extended','closed') ORDER BY b.amount DESC,b.placed_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.auction_bid_history(uuid) TO anon,authenticated;
-- Ensure realtime row events include the updated auction state after a transaction.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') AND NOT EXISTS(
 SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='auctions') THEN
 ALTER PUBLICATION supabase_realtime ADD TABLE public.auctions;
 END IF;
END $$;
