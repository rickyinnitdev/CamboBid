-- Pause new live commitments while preserving verification and settlement of existing funds.
ALTER TABLE public.payment_settings ADD COLUMN live_enabled boolean NOT NULL DEFAULT true;
CREATE FUNCTION public.require_payment_enabled(p_mode text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 PERFORM pg_advisory_xact_lock(771024);
 IF p_mode='live' AND NOT (SELECT live_enabled FROM public.payment_settings WHERE id=true) THEN RAISE EXCEPTION 'Real payments are paused by the administrator'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.require_payment_enabled(text) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.set_live_payments(p_enabled boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NOT public.staff_session() OR NOT public.is_super_admin() THEN RAISE EXCEPTION 'Super admin with MFA required'; END IF;
 IF p_enabled IS NULL THEN RAISE EXCEPTION 'Choose enabled or disabled'; END IF;
 PERFORM pg_advisory_xact_lock(771024);
 UPDATE public.payment_settings SET live_enabled=p_enabled,updated_at=now() WHERE id=true;
 INSERT INTO public.activity_logs(actor_id,action,resource_type,metadata) VALUES(auth.uid(),'live_payments_toggled','integration',jsonb_build_object('enabled',p_enabled));
END $$;
REVOKE ALL ON FUNCTION public.set_live_payments(boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_live_payments(boolean) TO authenticated;

-- Both browser RPCs and Edge Functions meet the same database gate.
DO $$ DECLARE d text; BEGIN
 SELECT pg_get_functiondef('public.place_funded_bid(uuid,bigint,bigint,text)'::regprocedure) INTO d;
 d:=replace(d,'PERFORM pg_advisory_xact_lock(771024);','PERFORM public.require_payment_enabled((SELECT payment_mode FROM public.auctions WHERE id=p_auction));');EXECUTE d;
 SELECT pg_get_functiondef('public.buy_funded_auction(uuid,bigint)'::regprocedure) INTO d;
 d:=replace(d,'PERFORM pg_advisory_xact_lock(771024);','PERFORM public.require_payment_enabled((SELECT payment_mode FROM public.auctions WHERE id=p_auction));');EXECUTE d;
 SELECT pg_get_functiondef('public.request_withdrawal(uuid,text,bigint,text,text,text)'::regprocedure) INTO d;
 d:=replace(d,'PERFORM pg_advisory_xact_lock(771024);','PERFORM public.require_payment_enabled(p_mode);');EXECUTE d;
END $$;

ALTER TABLE public.payment_checkouts ADD COLUMN auction_id uuid REFERENCES public.auctions(id);
ALTER TABLE public.payment_checkouts ADD COLUMN purchased_order_id uuid REFERENCES public.escrow_transactions(id);
ALTER TABLE public.payment_checkouts ADD COLUMN purchase_note text;
CREATE FUNCTION public.guard_new_checkout() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.auctions;l public.listings; BEGIN
 PERFORM public.require_payment_enabled(NEW.mode);
 IF NEW.auction_id IS NOT NULL THEN
 SELECT * INTO a FROM public.auctions WHERE id=NEW.auction_id FOR UPDATE;
 SELECT * INTO l FROM public.listings WHERE id=a.listing_id;
 IF NEW.mode<>'live' OR NEW.order_id IS NOT NULL OR a.payment_mode<>NEW.mode OR l.seller_id=NEW.user_id OR a.type<>'english' OR a.status NOT IN ('live','extended') OR a.start_time>now() OR a.end_time<=now() OR l.status<>'live'
 OR l.buy_it_now_price IS NULL OR round(l.buy_it_now_price*100)<>NEW.amount_minor OR l.buy_it_now_price<a.current_price OR l.buy_it_now_price<coalesce(l.reserve_price,0)
 THEN RAISE EXCEPTION 'Item or Buy Now price is no longer available for direct KHQR'; END IF;
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id=l.seller_id AND suspended) THEN RAISE EXCEPTION 'Seller is suspended'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_new_checkout() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_new_checkout BEFORE INSERT ON public.payment_checkouts FOR EACH ROW EXECUTE FUNCTION public.guard_new_checkout();

-- Reuse the exact wallet purchase/hold-release algorithm inside receipt completion.
-- This private variant is never executable by a browser or service-role client.
DO $$ DECLARE d text; BEGIN
 SELECT pg_get_functiondef('public.buy_funded_auction(uuid,bigint)'::regprocedure) INTO d;
 d:=replace(d,'public.buy_funded_auction(p_auction uuid, p_expected_minor bigint)','public.buy_verified_qr_internal(p_auction uuid, p_expected_minor bigint, p_buyer uuid)');
 d:=replace(d,'PERFORM public.require_eligible();','');
 d:=replace(d,'auth.uid()','p_buyer');EXECUTE d;
END $$;
REVOKE ALL ON FUNCTION public.buy_verified_qr_internal(uuid,bigint,uuid) FROM PUBLIC,anon,authenticated,service_role;
ALTER FUNCTION public.complete_checkout(uuid,text) RENAME TO complete_checkout_receipt_internal;
REVOKE ALL ON FUNCTION public.complete_checkout_receipt_internal(uuid,text) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.complete_checkout(p_id uuid,p_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.payment_checkouts;r jsonb;purchase jsonb; BEGIN
 PERFORM pg_advisory_xact_lock(771024);
 SELECT * INTO p FROM public.payment_checkouts WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
 IF p.status='paid' THEN RETURN jsonb_build_object('status','paid','order_id',p.purchased_order_id); END IF;
 r:=public.complete_checkout_receipt_internal(p_id,p_hash);
 IF r->>'status'='paid' AND p.auction_id IS NOT NULL THEN
 BEGIN
 purchase:=public.buy_verified_qr_internal(p.auction_id,p.amount_minor,p.user_id);
 UPDATE public.payment_checkouts SET purchased_order_id=(purchase->>'order_id')::uuid,purchase_note='Purchased with KHQR. Payment held until delivery confirmation.' WHERE id=p.id;
 EXCEPTION WHEN OTHERS THEN
 -- The verified incoming receipt remains credited once even if someone else bought
 -- the item, its price changed, or new live purchases were paused during payment.
 UPDATE public.payment_checkouts SET purchase_note='Payment received into your wallet because the item could not be purchased. View your balance or request a withdrawal; do not pay again.' WHERE id=p.id;
 END;
 END IF;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.complete_checkout(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_checkout(uuid,text) TO service_role;
