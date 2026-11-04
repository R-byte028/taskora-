-- Store the active share token for the authenticated request owner so they can
-- copy the same URL again without creating or revoking another share.
ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS owner_share_token text;

COMMENT ON COLUMN public.payment_requests.owner_share_token IS
  'Raw active share token for owner-only link recovery. Never exposed by public checkout RPCs.';

REVOKE ALL PRIVILEGES (owner_share_token) ON TABLE public.payment_requests FROM anon;
