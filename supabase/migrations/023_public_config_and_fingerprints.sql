-- Public CMS settings must never become a credential store.
CREATE FUNCTION public.reject_public_credentials() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
 IF NEW.value::text ~* '"(api_key|client_secret|service_role_key|access_token|refresh_token|bakong_api_token|integration_encryption_key)"[[:space:]]*:'
 THEN RAISE EXCEPTION 'Use private Integrations settings for credentials, never public CMS settings'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.reject_public_credentials() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER reject_public_credentials BEFORE INSERT OR UPDATE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION public.reject_public_credentials();
-- Keyed fingerprints prevent guessing bank details from an encrypted dump.
-- Legacy digests can be wrapped without decrypting destinations or moving money.
DO $$ DECLARE d text; BEGIN
 SELECT pg_get_functiondef('public.request_withdrawal(uuid,text,bigint,text,text,text)'::regprocedure) INTO d;
 IF strpos(d,'^[a-f0-9]{64}$')=0 THEN RAISE EXCEPTION 'Expected fingerprint validation missing'; END IF;
 d:=replace(d,'^[a-f0-9]{64}$','^(v2:)?[a-f0-9]{64}$');EXECUTE d;
END $$;
