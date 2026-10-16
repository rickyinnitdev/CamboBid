-- A bank receipt can still be recovered after account restrictions change, but
-- creating its purchase/bid requires the buyer to remain eligible.
CREATE FUNCTION public.require_receipt_buyer(p_buyer uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles p JOIN auth.users u ON u.id=p.id WHERE p.id=p_buyer AND NOT p.suspended AND p.identity_verified AND p.identity_status='approved' AND u.email_confirmed_at IS NOT NULL)
 OR NOT EXISTS(SELECT 1 FROM auth.mfa_factors WHERE user_id=p_buyer AND status='verified')
 OR EXISTS(SELECT 1 FROM public.policy_documents d WHERE d.current AND NOT EXISTS(SELECT 1 FROM public.policy_acceptances a WHERE a.user_id=p_buyer AND a.kind=d.kind AND a.version=d.version))
 THEN RAISE EXCEPTION 'Buyer eligibility changed; retain the verified receipt in the wallet'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.require_receipt_buyer(uuid) FROM PUBLIC,anon,authenticated,service_role;
DO $$ DECLARE d text;signature regprocedure;pos integer; BEGIN
 FOREACH signature IN ARRAY ARRAY['public.buy_verified_qr_internal(uuid,bigint,uuid)'::regprocedure,'public.bid_verified_qr_internal(uuid,bigint,uuid,bigint,text)'::regprocedure] LOOP
 SELECT pg_get_functiondef(signature) INTO d;pos:=strpos(d,'BEGIN');
 IF pos=0 THEN RAISE EXCEPTION 'Expected financial function body missing'; END IF;
 d:=overlay(d placing E'BEGIN\n PERFORM public.require_receipt_buyer(p_buyer);' from pos for 5);EXECUTE d;
 END LOOP;
END $$;
