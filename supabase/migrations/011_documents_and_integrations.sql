-- Monetary amounts remain integer USD cents. A one-cent checkout is valid.
ALTER TABLE public.payment_checkouts DROP CONSTRAINT payment_checkouts_amount_minor_check;
ALTER TABLE public.payment_checkouts ADD CONSTRAINT payment_checkouts_amount_minor_check CHECK(amount_minor BETWEEN 1 AND 100000);

-- Replace only the first-bid minimum; keep all existing funded-bid safeguards.
DO $$ DECLARE definition text; BEGIN
 SELECT pg_get_functiondef('public.place_funded_bid(uuid,bigint,bigint,text)'::regprocedure) INTO definition;
 definition:=replace(definition,'minimum:=round(a.current_price*100)::bigint+round(a.bid_increment*100)::bigint;',
 'minimum:=round(a.current_price*100)::bigint+CASE WHEN a.winner_id IS NULL THEN 0 ELSE round(a.bid_increment*100)::bigint END;');
 EXECUTE definition;
END $$;

CREATE TABLE public.integration_secrets (
 provider text PRIMARY KEY CHECK(provider IN ('bakong','resend')), ciphertext text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid REFERENCES public.profiles(id)
);
ALTER TABLE public.integration_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.integration_secrets FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.integration_secrets TO service_role;
CREATE TABLE public.payment_settings (
 id boolean PRIMARY KEY DEFAULT true CHECK(id), mode text NOT NULL DEFAULT 'demo' CHECK(mode IN ('demo','live')),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.payment_settings DEFAULT VALUES;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_settings FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.payment_settings TO authenticated;
GRANT ALL ON public.payment_settings TO service_role;
CREATE POLICY payment_settings_read ON public.payment_settings FOR SELECT TO authenticated USING(true);

CREATE SEQUENCE public.document_number_seq;
CREATE TABLE public.billing_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), number text NOT NULL UNIQUE,
 kind text NOT NULL CHECK(kind IN ('invoice','receipt','refund')),
 user_id uuid NOT NULL REFERENCES public.profiles(id), seller_id uuid REFERENCES public.profiles(id),
 order_id uuid REFERENCES public.escrow_transactions(id), checkout_id uuid REFERENCES public.payment_checkouts(id),
 source_id uuid NOT NULL, mode text NOT NULL CHECK(mode IN ('demo','live')),
 amount_minor bigint NOT NULL CHECK(amount_minor>0), currency text NOT NULL DEFAULT 'USD' CHECK(currency='USD'),
 snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(kind,source_id)
);
ALTER TABLE public.billing_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_documents FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.billing_documents TO authenticated;
GRANT ALL ON public.billing_documents TO service_role;
CREATE POLICY documents_read ON public.billing_documents FOR SELECT TO authenticated
 USING(user_id=auth.uid() OR seller_id=auth.uid() OR public.staff_session());
CREATE TABLE public.document_email_queue (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_id uuid NOT NULL UNIQUE REFERENCES public.billing_documents(id),
 user_id uuid NOT NULL REFERENCES public.profiles(id), recipient text NOT NULL,
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sending','accepted','failed','review')),
 attempts integer NOT NULL DEFAULT 0, first_attempt_at timestamptz, leased_at timestamptz,
 provider_id text, last_error text, created_at timestamptz NOT NULL DEFAULT now(), accepted_at timestamptz
);
ALTER TABLE public.document_email_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_email_queue FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.document_email_queue TO authenticated;
GRANT ALL ON public.document_email_queue TO service_role;
CREATE POLICY email_queue_read ON public.document_email_queue FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.staff_session());

CREATE FUNCTION public.issue_billing_document(p_kind text,p_user uuid,p_seller uuid,p_source uuid,p_order uuid,p_checkout uuid,p_mode text,p_amount bigint,p_title text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE doc uuid; BEGIN
 INSERT INTO public.billing_documents(number,kind,user_id,seller_id,source_id,order_id,checkout_id,mode,amount_minor,snapshot)
 VALUES(upper(left(p_kind,3))||'-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.document_number_seq')::text,7,'0'),
 p_kind,p_user,p_seller,p_source,p_order,p_checkout,p_mode,p_amount,
 jsonb_build_object('item',p_title,'buyer',(SELECT display_name FROM public.profiles WHERE id=p_user),
 'buyer_email',(SELECT email FROM auth.users WHERE id=p_user),
 'seller',(SELECT display_name FROM public.profiles WHERE id=p_seller),'issuer','CamboBid university project',
 'notice',CASE WHEN p_mode='demo' THEN 'DEMO — no bank money or physical goods exchanged' ELSE 'KHQR testing — sample item; not a tax invoice' END))
 ON CONFLICT(kind,source_id) DO NOTHING RETURNING id INTO doc;
 IF doc IS NOT NULL THEN
 INSERT INTO public.document_email_queue(document_id,user_id,recipient)
 SELECT doc,p_user,email FROM auth.users WHERE id=p_user AND email IS NOT NULL;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.issue_billing_document(text,uuid,uuid,uuid,uuid,uuid,text,bigint,text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.capture_order_documents() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE title text; BEGIN
 SELECT l.title INTO title FROM public.auctions a JOIN public.listings l ON l.id=a.listing_id WHERE a.id=NEW.auction_id;
 PERFORM public.issue_billing_document('invoice',NEW.buyer_id,NEW.seller_id,NEW.id,NEW.id,NULL,NEW.payment_mode,round(NEW.amount*100)::bigint,coalesce(title,'Auction order'));
 IF NEW.funded_at IS NOT NULL THEN
 PERFORM public.issue_billing_document('receipt',NEW.buyer_id,NEW.seller_id,NEW.id,NEW.id,NULL,NEW.payment_mode,round(NEW.amount*100)::bigint,coalesce(title,'Auction order'));
 END IF;
 IF NEW.status='refunded' AND NEW.funded_at IS NOT NULL THEN
 PERFORM public.issue_billing_document('refund',NEW.buyer_id,NEW.seller_id,NEW.id,NEW.id,NULL,NEW.payment_mode,round(NEW.amount*100)::bigint,coalesce(title,'Auction order'));
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER capture_order_documents AFTER INSERT OR UPDATE ON public.escrow_transactions FOR EACH ROW EXECUTE FUNCTION public.capture_order_documents();
CREATE FUNCTION public.capture_topup_document() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.status='paid' AND NEW.order_id IS NULL THEN
 PERFORM public.issue_billing_document('receipt',NEW.user_id,NULL,NEW.id,NULL,NEW.id,NEW.mode,NEW.amount_minor,'Wallet top-up');
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER capture_topup_document AFTER UPDATE ON public.payment_checkouts FOR EACH ROW EXECUTE FUNCTION public.capture_topup_document();

DO $$ DECLARE row record;title text; BEGIN
 FOR row IN SELECT * FROM public.escrow_transactions LOOP
 SELECT l.title INTO title FROM public.auctions a JOIN public.listings l ON l.id=a.listing_id WHERE a.id=row.auction_id;
 PERFORM public.issue_billing_document('invoice',row.buyer_id,row.seller_id,row.id,row.id,NULL,row.payment_mode,round(row.amount*100)::bigint,coalesce(title,'Auction order'));
 IF row.funded_at IS NOT NULL THEN
 PERFORM public.issue_billing_document('receipt',row.buyer_id,row.seller_id,row.id,row.id,NULL,row.payment_mode,round(row.amount*100)::bigint,coalesce(title,'Auction order'));
 END IF;
 END LOOP;
 FOR row IN SELECT * FROM public.payment_checkouts WHERE status='paid' AND order_id IS NULL LOOP
 PERFORM public.issue_billing_document('receipt',row.user_id,NULL,row.id,NULL,row.id,row.mode,row.amount_minor,'Wallet top-up');
 END LOOP;
END $$;
CREATE FUNCTION public.preserve_billing_document() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'Issued financial documents are immutable'; END $$;
CREATE TRIGGER preserve_billing_document BEFORE UPDATE OR DELETE ON public.billing_documents FOR EACH ROW EXECUTE FUNCTION public.preserve_billing_document();

CREATE FUNCTION public.claim_document_email(p_id uuid) RETURNS SETOF public.document_email_queue LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 -- Resend idempotency keys expire after 24h. Ambiguous older attempts require review.
 UPDATE public.document_email_queue SET status='review',last_error='Delivery uncertain after retry window; review provider logs before resending'
 WHERE id=p_id AND status IN ('sending','failed') AND first_attempt_at<now()-interval '23 hours';
 RETURN QUERY UPDATE public.document_email_queue SET status='sending',attempts=attempts+1,
 first_attempt_at=coalesce(first_attempt_at,now()),leased_at=now(),last_error=NULL
 WHERE id=p_id AND (status IN ('queued','failed') OR (status='sending' AND leased_at<now()-interval '2 minutes'))
 AND attempts<10 AND (leased_at IS NULL OR leased_at<now()-interval '1 minute') RETURNING *;
END $$;
REVOKE ALL ON FUNCTION public.claim_document_email(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_document_email(uuid) TO service_role;

-- Fill missing OAuth pictures; uploaded profile pictures always take precedence.
CREATE FUNCTION public.sync_google_avatar() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE picture text; BEGIN
 picture:=coalesce(NEW.raw_user_meta_data->>'avatar_url',NEW.raw_user_meta_data->>'picture');
 IF picture LIKE 'https://%' THEN UPDATE public.profiles SET avatar_url=picture WHERE id=NEW.id AND coalesce(avatar_url,'')=''; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER sync_google_avatar AFTER INSERT OR UPDATE OF raw_user_meta_data ON auth.users FOR EACH ROW EXECUTE FUNCTION public.sync_google_avatar();
UPDATE public.profiles p SET avatar_url=coalesce(u.raw_user_meta_data->>'avatar_url',u.raw_user_meta_data->>'picture') FROM auth.users u
WHERE p.id=u.id AND coalesce(p.avatar_url,'')='' AND coalesce(u.raw_user_meta_data->>'avatar_url',u.raw_user_meta_data->>'picture') LIKE 'https://%';
