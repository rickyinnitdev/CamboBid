ALTER TABLE public.payment_checkouts ADD COLUMN bid_auction_id uuid REFERENCES public.auctions(id);
ALTER TABLE public.payment_checkouts ADD COLUMN submitted_bid_id uuid REFERENCES public.bids(id);
ALTER TABLE public.payment_checkouts ADD CONSTRAINT one_checkout_purpose CHECK(num_nonnulls(order_id,auction_id,bid_auction_id)<=1);
CREATE FUNCTION public.guard_qr_bid_checkout() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.auctions;l public.listings;minimum bigint; BEGIN
 IF NEW.bid_auction_id IS NULL THEN RETURN NEW; END IF;
 PERFORM public.require_payment_enabled(NEW.mode);
 SELECT * INTO a FROM public.auctions WHERE id=NEW.bid_auction_id FOR UPDATE;
 SELECT * INTO l FROM public.listings WHERE id=a.listing_id;
 minimum:=round(a.current_price*100)+CASE WHEN a.winner_id IS NULL THEN 0 ELSE round(a.bid_increment*100) END;
 IF NEW.mode<>'live' OR a.payment_mode<>'live' OR a.type<>'english' OR l.seller_id=NEW.user_id OR l.status<>'live' OR a.status NOT IN ('live','extended') OR a.start_time>now() OR a.end_time<=now() OR NEW.amount_minor<minimum
 THEN RAISE EXCEPTION 'Bid is no longer valid. Refresh the auction and review its minimum'; END IF;
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id=l.seller_id AND suspended) THEN RAISE EXCEPTION 'Seller is suspended'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_qr_bid_checkout() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_qr_bid_checkout BEFORE INSERT ON public.payment_checkouts FOR EACH ROW EXECUTE FUNCTION public.guard_qr_bid_checkout();
DO $$ DECLARE d text; BEGIN
 SELECT pg_get_functiondef('public.place_funded_bid(uuid,bigint,bigint,text)'::regprocedure) INTO d;
 d:=replace(d,'public.place_funded_bid(p_auction uuid, p_amount bigint, p_cap bigint DEFAULT NULL::bigint, p_device text DEFAULT NULL::text)','public.bid_verified_qr_internal(p_auction uuid, p_amount bigint, p_buyer uuid, p_cap bigint DEFAULT NULL::bigint, p_device text DEFAULT NULL::text)');
 d:=replace(d,'PERFORM public.require_eligible();','');d:=replace(d,'auth.uid()','p_buyer');EXECUTE d;
END $$;
REVOKE ALL ON FUNCTION public.bid_verified_qr_internal(uuid,bigint,uuid,bigint,text) FROM PUBLIC,anon,authenticated,service_role;
ALTER FUNCTION public.complete_checkout(uuid,text) RENAME TO complete_checkout_purchase_internal;
REVOKE ALL ON FUNCTION public.complete_checkout_purchase_internal(uuid,text) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.complete_checkout(p_id uuid,p_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.payment_checkouts;r jsonb;bid jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(771024);
 SELECT * INTO p FROM public.payment_checkouts WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
 IF p.status='paid' THEN RETURN jsonb_build_object('status','paid','order_id',p.purchased_order_id,'bid_id',p.submitted_bid_id); END IF;
 r:=public.complete_checkout_purchase_internal(p_id,p_hash);
 IF r->>'status'='paid' AND p.bid_auction_id IS NOT NULL THEN
 BEGIN
 bid:=public.bid_verified_qr_internal(p.bid_auction_id,p.amount_minor,p.user_id);
 UPDATE public.payment_checkouts SET submitted_bid_id=(bid->>'bid_id')::uuid,purchase_note='Payment verified and bid submitted. This does not guarantee winning; follow the auction result.' WHERE id=p.id;
 EXCEPTION WHEN OTHERS THEN
 UPDATE public.payment_checkouts SET purchase_note='Payment received into your wallet, but the bid could not be accepted. The minimum, auction status or payment availability changed. Review the auction before bidding again; do not pay again for this receipt.' WHERE id=p.id;
 END;
 END IF;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.complete_checkout(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_checkout(uuid,text) TO service_role;
