create or replace function public.get_public_near_payment_request(p_token text)
returns table(
  client_name text,
  job_title text,
  amount numeric,
  currency text,
  work_summary text,
  request_reference text,
  provider_name text,
  expires_at timestamptz,
  recipient_account_id text,
  settlement_network text,
  amount_atomic text
)
language sql
stable
security definer
set search_path to ''
as $function$
  select
    null::text,
    null::text,
    pr.amount,
    pr.currency,
    null::text,
    'TASKORA-' || upper(pg_catalog.left(pr.id::text, 8)),
    null::text,
    s.expires_at,
    pr.recipient_account_id,
    pr.settlement_network,
    pr.amount_atomic::text
  from public.payment_request_shares s
  join public.payment_requests pr
    on pr.id = s.payment_request_id and pr.user_id = s.user_id
  where p_token is not null
    and p_token ~ '^[A-Za-z0-9_-]{40,128}$'
    and s.token_hash = extensions.digest(pg_catalog.convert_to(p_token, 'UTF8'), 'sha256')
    and s.revoked_at is null
    and s.expires_at > now()
    and pr.status = 'shared'
    and pr.settlement_network = 'testnet'
    and pr.settlement_asset = 'NEAR'
  limit 1;
$function$;

revoke all on function public.get_public_near_payment_request(text) from public;
revoke all on function public.get_public_near_payment_request(text) from anon, authenticated;
grant execute on function public.get_public_near_payment_request(text) to anon, authenticated;
