-- Public CMS settings must never become a credential store.
CREATE OR REPLACE FUNCTION public.reject_public_credentials() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
 IF NEW.value::text ~* '"(password|secret|token|private_key|api_key|apikey|api_token|api_secret|client_secret|service_role_key|supabase_service_role_key|access_token|refresh_token|bakong_api_token|gemini_api_key|resend_api_key|integration_encryption_key)"[[:space:]]*:'
 THEN RAISE EXCEPTION 'Use private Integrations settings for credentials, never public CMS settings'; END IF;
 RETURN NEW;
END $$;
