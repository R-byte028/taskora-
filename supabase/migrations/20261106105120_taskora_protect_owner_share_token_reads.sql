-- Keep raw owner share tokens out of direct table reads. Recopy is handled by
-- a narrowly scoped owner-only RPC that returns only an active, unexpired token.
create or replace function public.get_active_payment_request_share(p_request_id uuid)
returns table(share_token text, expires_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  return query
  select pr.owner_share_token, s.expires_at
  from public.payment_requests pr
  join public.payment_request_shares s
    on s.payment_request_id = pr.id
   and s.user_id = pr.user_id
  where pr.id = p_request_id
    and pr.user_id = v_user_id
    and pr.status = 'shared'
    and pr.owner_share_token is not null
    and s.token_hash = extensions.digest(
      pg_catalog.convert_to(pr.owner_share_token, 'UTF8'), 'sha256'
    )
    and s.revoked_at is null
    and s.expires_at > now()
  order by s.created_at desc
  limit 1;
end;
$function$;

revoke all on function public.get_active_payment_request_share(uuid) from public, anon;
grant execute on function public.get_active_payment_request_share(uuid) to authenticated, service_role;

-- Remove direct SELECT on the raw owner token. Keep the safe fields needed by
-- the dashboard and Assistant available through column-level grants.
revoke select on table public.payment_requests from authenticated;
grant select (
  id, user_id, job_id, client_id, amount, currency, work_summary, status,
  created_at, updated_at, settlement_network, settlement_asset,
  recipient_account_id, amount_atomic
) on table public.payment_requests to authenticated;
