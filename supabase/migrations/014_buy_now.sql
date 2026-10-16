ALTER TABLE public.escrow_transactions ADD COLUMN purchase_kind text NOT NULL DEFAULT 'auction' CHECK(purchase_kind IN ('auction','buy_now'));
CREATE FUNCTION public.buy_funded_auction(p_auction uuid,p_expected_minor bigint) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.auctions;l public.listings;h record;price bigint;own_cap bigint;order_id uuid; BEGIN
 PERFORM public.require_eligible();
 PERFORM pg_advisory_xact_lock(771024);
 SELECT * INTO a FROM public.auctions WHERE id=p_auction FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Auction not found'; END IF;
 SELECT * INTO l FROM public.listings WHERE id=a.listing_id FOR UPDATE;
 IF l.seller_id=auth.uid() THEN RAISE EXCEPTION 'You cannot buy your own item'; END IF;
 -- Retrying the same completed purchase returns its existing order, never a second debit.
 IF a.status='closed' AND a.winner_id=auth.uid() THEN
 SELECT id INTO order_id FROM public.escrow_transactions WHERE auction_id=a.id AND buyer_id=auth.uid() AND purchase_kind='buy_now' ORDER BY created_at LIMIT 1;
 IF order_id IS NOT NULL THEN RETURN jsonb_build_object('order_id',order_id,'auction_id',a.id,'already_completed',true); END IF;
 END IF;
 IF a.type<>'english' OR a.status NOT IN ('live','extended') OR a.start_time>now() OR a.end_time<=now() OR l.status<>'live' THEN RAISE EXCEPTION 'Auction is no longer available for Buy Now'; END IF;
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id=l.seller_id AND suspended) THEN RAISE EXCEPTION 'The seller account is suspended'; END IF;
 IF l.buy_it_now_price IS NULL OR l.buy_it_now_price<=0 OR l.buy_it_now_price<a.current_price OR l.buy_it_now_price<coalesce(l.reserve_price,0) THEN RAISE EXCEPTION 'Buy Now is not available at the current auction price'; END IF;
 price:=round(l.buy_it_now_price*100)::bigint;
 IF p_expected_minor IS NULL OR p_expected_minor<>price THEN RAISE EXCEPTION 'Buy Now price changed; refresh and review the price'; END IF;
 SELECT coalesce(max(cap),0) INTO own_cap FROM public.bid_authorizations WHERE auction_id=a.id AND user_id=auth.uid();
 IF coalesce((SELECT available FROM public.wallet_accounts WHERE user_id=auth.uid() AND mode=a.payment_mode),0)+own_cap<price THEN RAISE EXCEPTION 'Insufficient available wallet funds. Top up the matching wallet before buying'; END IF;
 FOR h IN SELECT * FROM public.bid_authorizations WHERE auction_id=a.id LOOP
 PERFORM public.wallet_move(h.user_id,a.payment_mode,h.cap,-h.cap,'buy_now_reservation_released',a.id);
 END LOOP;
 DELETE FROM public.bid_authorizations WHERE auction_id=a.id;
 PERFORM public.wallet_move(auth.uid(),a.payment_mode,-price,0,'buy_now_payment',a.id);
 INSERT INTO public.escrow_transactions(auction_id,buyer_id,seller_id,amount,status,payment_mode,funded_at,purchase_kind)
 VALUES(a.id,auth.uid(),l.seller_id,price/100.0,'held',a.payment_mode,now(),'buy_now') RETURNING id INTO order_id;
 UPDATE public.bids SET status='outbid' WHERE auction_id=a.id AND status='winning';
 UPDATE public.auctions SET current_price=price/100.0,winner_id=auth.uid(),status='closed',closed_by=auth.uid(),closure_reason='Buy Now purchase',reserve_met=true WHERE id=a.id;
 UPDATE public.listings SET status='sold' WHERE id=l.id;
 INSERT INTO public.notifications(user_id,type,title,body,auction_id)
 SELECT user_id,'auction_ended','Item purchased with Buy Now','The auction has ended. Check your orders and wallet; bid reservations have been released.',a.id
 FROM (SELECT DISTINCT bidder_id user_id FROM public.bids WHERE auction_id=a.id UNION SELECT l.seller_id UNION SELECT auth.uid()) participants;
 INSERT INTO public.activity_logs(actor_id,action,resource_type,resource_id,metadata)
 VALUES(auth.uid(),'buy_now_completed','auction',a.id,jsonb_build_object('order_id',order_id,'amount_minor',price,'mode',a.payment_mode));
 RETURN jsonb_build_object('order_id',order_id,'auction_id',a.id,'amount_minor',price,'mode',a.payment_mode);
END $$;
REVOKE ALL ON FUNCTION public.buy_funded_auction(uuid,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.buy_funded_auction(uuid,bigint) TO authenticated;
