-- Withdrawals share the financial lock used by bids, payments and settlement.
CREATE FUNCTION public.payout_staff_session() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.staff_session() AND (public.is_super_admin() OR public.is_escrow_manager());
$$;
REVOKE ALL ON FUNCTION public.payout_staff_session() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.payout_staff_session() TO authenticated;

CREATE TABLE public.withdrawal_requests (
 id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES public.profiles(id),
 mode text NOT NULL CHECK(mode IN ('demo','live')),amount_minor bigint NOT NULL CHECK(amount_minor BETWEEN 1 AND 100000),
 currency text NOT NULL DEFAULT 'USD' CHECK(currency='USD'),destination_summary text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','paid','rejected','cancelled')),
 reviewed_by uuid REFERENCES public.profiles(id),reviewed_at timestamptz,
 payment_reference text,staff_note text,created_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz
);
CREATE UNIQUE INDEX unique_withdrawal_payment_reference ON public.withdrawal_requests(lower(payment_reference)) WHERE status='paid';
CREATE INDEX withdrawal_user_history ON public.withdrawal_requests(user_id,created_at DESC);
CREATE TABLE public.withdrawal_destinations (
 request_id uuid PRIMARY KEY REFERENCES public.withdrawal_requests(id),ciphertext text NOT NULL,fingerprint text NOT NULL
);
CREATE TABLE public.withdrawal_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),request_id uuid NOT NULL REFERENCES public.withdrawal_requests(id),
 actor_id uuid REFERENCES public.profiles(id),action text NOT NULL,note text,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.withdrawal_requests,public.withdrawal_destinations,public.withdrawal_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.withdrawal_requests,public.withdrawal_events TO authenticated;
GRANT ALL ON public.withdrawal_requests,public.withdrawal_destinations,public.withdrawal_events TO service_role;
CREATE POLICY withdrawal_read ON public.withdrawal_requests FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.payout_staff_session());
CREATE POLICY withdrawal_events_read ON public.withdrawal_events FOR SELECT TO authenticated USING(EXISTS(
 SELECT 1 FROM public.withdrawal_requests r WHERE r.id=request_id AND (r.user_id=auth.uid() OR public.payout_staff_session())));

CREATE FUNCTION public.request_withdrawal(p_id uuid,p_mode text,p_amount bigint,p_summary text,p_ciphertext text,p_fingerprint text) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.withdrawal_requests; BEGIN
 PERFORM public.require_eligible();
 IF p_id IS NULL OR p_mode IS NULL OR p_mode NOT IN ('demo','live') OR p_amount IS NULL OR p_amount NOT BETWEEN 1 AND 100000
 OR length(coalesce(p_summary,'')) NOT BETWEEN 5 AND 150 OR length(coalesce(p_ciphertext,'')) NOT BETWEEN 50 AND 5000
 OR coalesce(p_fingerprint,'')!~'^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid withdrawal details'; END IF;
 PERFORM pg_advisory_xact_lock(771024);
 SELECT * INTO r FROM public.withdrawal_requests WHERE id=p_id FOR UPDATE;
 IF FOUND THEN
 IF r.user_id<>auth.uid() OR r.mode<>p_mode OR r.amount_minor<>p_amount OR r.destination_summary<>p_summary
 OR (SELECT fingerprint FROM public.withdrawal_destinations WHERE request_id=r.id)<>p_fingerprint THEN RAISE EXCEPTION 'Request ID already used for different details'; END IF;
 RETURN to_jsonb(r);
 END IF;
 IF (SELECT count(*) FROM public.withdrawal_requests WHERE user_id=auth.uid() AND status IN ('pending','processing'))>=5 THEN RAISE EXCEPTION 'You already have five open withdrawals'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.wallet_accounts WHERE user_id=auth.uid() AND mode=p_mode AND available>=p_amount) THEN RAISE EXCEPTION 'Insufficient available wallet funds'; END IF;
 PERFORM public.wallet_move(auth.uid(),p_mode,-p_amount,p_amount,'withdrawal_requested',p_id);
 INSERT INTO public.withdrawal_requests(id,user_id,mode,amount_minor,destination_summary) VALUES(p_id,auth.uid(),p_mode,p_amount,p_summary) RETURNING * INTO r;
 INSERT INTO public.withdrawal_destinations(request_id,ciphertext,fingerprint) VALUES(p_id,p_ciphertext,p_fingerprint);
 INSERT INTO public.withdrawal_events(request_id,actor_id,action) VALUES(p_id,auth.uid(),'requested');
 INSERT INTO public.activity_logs(actor_id,action,resource_type,resource_id,metadata)
 VALUES(auth.uid(),'withdrawal_requested','withdrawal',p_id,jsonb_build_object('amount_minor',p_amount,'mode',p_mode));
 RETURN to_jsonb(r);
END $$;
REVOKE ALL ON FUNCTION public.request_withdrawal(uuid,text,bigint,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(uuid,text,bigint,text,text,text) TO authenticated;

CREATE FUNCTION public.cancel_withdrawal(p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.withdrawal_requests; BEGIN
 IF auth.uid() IS NULL OR coalesce(auth.jwt()->>'aal','')<>'aal2' THEN RAISE EXCEPTION 'Verified authenticator session required'; END IF;
 PERFORM pg_advisory_xact_lock(771024);
 SELECT * INTO r FROM public.withdrawal_requests WHERE id=p_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
 IF r.status='cancelled' THEN RETURN to_jsonb(r); END IF;
 IF r.status<>'pending' THEN RAISE EXCEPTION 'Only requests awaiting review can be cancelled'; END IF;
 PERFORM public.wallet_move(r.user_id,r.mode,r.amount_minor,-r.amount_minor,'withdrawal_cancelled',r.id);
 UPDATE public.withdrawal_requests SET status='cancelled',completed_at=now() WHERE id=r.id RETURNING * INTO r;
 INSERT INTO public.withdrawal_events(request_id,actor_id,action) VALUES(r.id,auth.uid(),'cancelled');
 INSERT INTO public.activity_logs(actor_id,action,resource_type,resource_id) VALUES(auth.uid(),'withdrawal_cancelled','withdrawal',r.id);
 RETURN to_jsonb(r);
END $$;
REVOKE ALL ON FUNCTION public.cancel_withdrawal(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cancel_withdrawal(uuid) TO authenticated;

CREATE FUNCTION public.review_withdrawal(p_id uuid,p_action text,p_reference text DEFAULT NULL,p_note text DEFAULT NULL) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.withdrawal_requests;ref text; BEGIN
 IF NOT public.payout_staff_session() THEN RAISE EXCEPTION 'Finance staff with MFA required'; END IF;
 IF p_note IS NOT NULL AND length(p_note)>1000 THEN RAISE EXCEPTION 'Keep the note within 1000 characters'; END IF;
 PERFORM pg_advisory_xact_lock(771024);
 SELECT * INTO r FROM public.withdrawal_requests WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
 IF p_action='review' THEN
 IF r.status='processing' AND r.reviewed_by=auth.uid() THEN RETURN to_jsonb(r); END IF;
 IF r.status<>'pending' THEN RAISE EXCEPTION 'This request is no longer awaiting review'; END IF;
 UPDATE public.withdrawal_requests SET status='processing',reviewed_by=auth.uid(),reviewed_at=now() WHERE id=r.id RETURNING * INTO r;
 ELSIF p_action='paid' THEN
 ref:=upper(regexp_replace(trim(coalesce(p_reference,'')),'\s+','','g'));
 IF length(ref) NOT BETWEEN 6 AND 120 OR ref!~'^[A-Z0-9._:/-]+$' THEN RAISE EXCEPTION 'Enter the actual bank transfer reference (6–120 characters)'; END IF;
 IF r.status='paid' AND r.payment_reference=ref THEN RETURN to_jsonb(r); END IF;
 IF r.status<>'processing' OR r.reviewed_by<>auth.uid() THEN RAISE EXCEPTION 'Claim this request for review before recording its transfer'; END IF;
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id=r.user_id AND suspended) THEN RAISE EXCEPTION 'Account is suspended; resolve the restriction before paying'; END IF;
 IF EXISTS(SELECT 1 FROM public.withdrawal_requests WHERE status='paid' AND lower(payment_reference)=lower(ref)) THEN RAISE EXCEPTION 'This transfer reference was already recorded'; END IF;
 PERFORM public.wallet_move(r.user_id,r.mode,0,-r.amount_minor,'withdrawal_paid',r.id);
 UPDATE public.withdrawal_requests SET status='paid',payment_reference=ref,staff_note=nullif(trim(p_note),''),completed_at=now() WHERE id=r.id RETURNING * INTO r;
 ELSIF p_action='reject' THEN
 IF r.status='rejected' THEN RETURN to_jsonb(r); END IF;
 IF r.status NOT IN ('pending','processing') OR (r.status='processing' AND r.reviewed_by<>auth.uid() AND NOT public.is_super_admin()) THEN RAISE EXCEPTION 'This request cannot be rejected by this reviewer'; END IF;
 IF length(trim(coalesce(p_note,''))) NOT BETWEEN 10 AND 1000 THEN RAISE EXCEPTION 'Explain the rejection in at least 10 characters'; END IF;
 PERFORM public.wallet_move(r.user_id,r.mode,r.amount_minor,-r.amount_minor,'withdrawal_rejected',r.id);
 UPDATE public.withdrawal_requests SET status='rejected',reviewed_by=auth.uid(),reviewed_at=coalesce(reviewed_at,now()),staff_note=trim(p_note),completed_at=now() WHERE id=r.id RETURNING * INTO r;
 ELSE RAISE EXCEPTION 'Unknown withdrawal action'; END IF;
 INSERT INTO public.withdrawal_events(request_id,actor_id,action,note) VALUES(r.id,auth.uid(),p_action,CASE WHEN p_action='paid' THEN ref ELSE nullif(trim(p_note),'') END);
 INSERT INTO public.activity_logs(actor_id,action,resource_type,resource_id,metadata)
 VALUES(auth.uid(),'withdrawal_'||p_action,'withdrawal',r.id,jsonb_build_object('user_id',r.user_id,'mode',r.mode,'amount_minor',r.amount_minor));
 IF p_action IN ('paid','reject') THEN
 INSERT INTO public.notifications(user_id,type,title,body) VALUES(r.user_id,'system',CASE WHEN p_action='paid' THEN 'Withdrawal paid' ELSE 'Withdrawal declined' END,
 CASE WHEN p_action='paid' THEN 'Staff recorded your transfer. See withdrawal history for its reference.' ELSE 'Reserved funds were returned to your available balance. See the review note in withdrawal history.' END);
 END IF;
 RETURN to_jsonb(r);
END $$;
REVOKE ALL ON FUNCTION public.review_withdrawal(uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_withdrawal(uuid,text,text,text) TO authenticated;

CREATE FUNCTION public.withdrawal_balance_report() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE report jsonb;issues jsonb; BEGIN
 IF NOT public.payout_staff_session() THEN RAISE EXCEPTION 'Finance staff with MFA required'; END IF;
 PERFORM pg_advisory_xact_lock(771024);
 SELECT jsonb_agg(jsonb_build_object('mode',m.mode,
 'available_minor',coalesce((SELECT sum(available) FROM public.wallet_accounts WHERE mode=m.mode),0),
 'reserved_minor',coalesce((SELECT sum(reserved) FROM public.wallet_accounts WHERE mode=m.mode),0),
 'withdrawal_reserved_minor',coalesce((SELECT sum(amount_minor) FROM public.withdrawal_requests WHERE mode=m.mode AND status IN ('pending','processing')),0),
 'bid_reserved_minor',coalesce((SELECT sum(b.cap) FROM public.bid_authorizations b JOIN public.auctions a ON a.id=b.auction_id WHERE a.payment_mode=m.mode),0),
 'held_orders_minor',coalesce((SELECT sum(round(amount*100)) FROM public.escrow_transactions WHERE payment_mode=m.mode AND status IN ('held','frozen') AND funded_at IS NOT NULL),0)))
 INTO report FROM (VALUES('demo'),('live')) m(mode);
 WITH ledger AS (SELECT user_id,mode,sum(available_delta) available,sum(reserved_delta) reserved FROM public.wallet_ledger GROUP BY user_id,mode),
 balances AS (SELECT coalesce(w.user_id,l.user_id) user_id,coalesce(w.mode,l.mode) mode,coalesce(w.available,0) available,coalesce(w.reserved,0) reserved,coalesce(l.available,0) ledger_available,coalesce(l.reserved,0) ledger_reserved
 FROM public.wallet_accounts w FULL JOIN ledger l USING(user_id,mode))
 SELECT coalesce(jsonb_agg(to_jsonb(b)),'[]') INTO issues FROM balances b
 WHERE b.available<>b.ledger_available OR b.reserved<>b.ledger_reserved OR b.reserved<>
 coalesce((SELECT sum(cap) FROM public.bid_authorizations x JOIN public.auctions a ON a.id=x.auction_id WHERE x.user_id=b.user_id AND a.payment_mode=b.mode),0)
 +coalesce((SELECT sum(amount_minor) FROM public.withdrawal_requests r WHERE r.user_id=b.user_id AND r.mode=b.mode AND r.status IN ('pending','processing')),0);
 RETURN jsonb_build_object('modes',report,'issues',issues,'checked_at',now());
END $$;
REVOKE ALL ON FUNCTION public.withdrawal_balance_report() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.withdrawal_balance_report() TO authenticated;
