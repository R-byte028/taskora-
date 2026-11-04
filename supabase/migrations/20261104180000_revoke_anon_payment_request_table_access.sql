-- Keep anonymous clients from accessing payment request rows directly.
-- Public checkout remains available only through the token-scoped RPC.
REVOKE ALL PRIVILEGES ON TABLE public.payment_requests FROM anon;
