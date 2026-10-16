-- Funded buyer reservations take priority over empty expired sample auctions.
DO $$ DECLARE definition text; BEGIN
 SELECT pg_get_functiondef('public.settle_expired_auctions(integer)'::regprocedure) INTO definition;
 IF strpos(definition,'ORDER BY x.end_time LIMIT p_limit')=0 THEN RAISE EXCEPTION 'Expected batch ordering missing'; END IF;
 definition:=replace(definition,'ORDER BY x.end_time LIMIT p_limit','ORDER BY (x.winner_id IS NOT NULL) DESC,x.end_time LIMIT p_limit');
 EXECUTE definition;
END $$;
