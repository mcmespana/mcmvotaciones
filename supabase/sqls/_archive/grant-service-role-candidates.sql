-- service_role needs direct table access to update candidates.image_url
-- from the crm-proxy edge function (bypasses RLS, but still needs table grants).
GRANT ALL ON TABLE public.candidates TO service_role;
