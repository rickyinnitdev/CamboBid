-- One settlement implementation for staff actions and the trusted database scheduler.
DO $$ DECLARE definition text;guard text; BEGIN
 SELECT pg_get_functiondef('public.close_funded_auction(uuid,text)'::regprocedure) INTO definition;
 guard:='IF NOT public.staff_session() OR NOT(public.is_super_admin() OR public.is_auctioneer()) THEN RAISE EXCEPTION ''Auction staff with MFA required''; END IF;';
 IF strpos(definition,guard)=0 THEN RAISE EXCEPTION 'Expected settlement authorization guard missing'; END IF;
 definition:=replace(definition,'public.close_funded_auction(', 'public.settle_auction_internal(');
 definition:=replace(definition,guard,'');
 EXECUTE definition;
END $$;
REVOKE ALL ON FUNCTION public.settle_auction_internal(uuid,text) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.close_funded_auction(p_auction uuid,p_reason text DEFAULT NULL) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.staff_session() OR NOT(public.is_super_admin() OR public.is_auctioneer()) THEN RAISE EXCEPTION 'Auction staff with MFA required'; END IF;
 RETURN public.settle_auction_internal(p_auction,p_reason);
END $$;

CREATE FUNCTION public.settle_expired_auctions(p_limit integer DEFAULT 25) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a record;result jsonb;settled integer:=0;failed integer:=0; BEGIN
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid settlement batch size'; END IF;
 -- Skip legacy unfunded winners and existing orders; staff review those records.
 FOR a IN SELECT x.id FROM public.auctions x WHERE x.status IN ('live','extended') AND x.end_time<=now()
 AND NOT EXISTS(SELECT 1 FROM public.escrow_transactions e WHERE e.auction_id=x.id)
 AND (x.winner_id IS NULL OR EXISTS(SELECT 1 FROM public.bid_authorizations b WHERE b.auction_id=x.id))
 ORDER BY x.end_time LIMIT p_limit LOOP
 BEGIN
 result:=public.settle_auction_internal(a.id,'Automatic settlement after auction expiry');settled:=settled+1;
 EXCEPTION WHEN OTHERS THEN
 failed:=failed+1;
 INSERT INTO public.activity_logs(action,resource_type,resource_id,metadata)
 VALUES('automatic_settlement_failed','auction',a.id,jsonb_build_object('sqlstate',SQLSTATE));
 END;
 END LOOP;
 RETURN jsonb_build_object('settled',settled,'failed',failed);
END $$;
REVOKE ALL ON FUNCTION public.settle_expired_auctions(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.settle_expired_auctions(integer) TO service_role;

-- Native database scheduling needs no API token stored in a cron command.
-- Local WASM regression databases do not provide pg_cron and test the batch RPC directly.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_available_extensions WHERE name='pg_cron') THEN
 CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
 PERFORM cron.schedule('cambobid-settle-expired-auctions','* * * * *','SELECT public.settle_expired_auctions(25);');
 END IF;
END $$;
