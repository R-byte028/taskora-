-- Require an explicitly saved testnet wallet when first snapshotting a payment destination.
-- Existing payment requests keep their immutable saved recipient.

create or replace function public.create_payment_request_share(p_request_id uuid, p_token text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_request_user_id uuid;
  v_job_id uuid;
  v_request_status text;
  v_currency text;
  v_amount numeric(38,24);
  v_recipient text;
  v_recipient_was_saved boolean := false;
  v_wallet_network text;
  v_expires_at timestamptz := now() + interval '30 days';
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{40,128}$' then
    raise exception 'Invalid share token' using errcode = '22023';
  end if;

  select pr.user_id, pr.job_id, pr.status, pr.currency, pr.amount,
         pr.recipient_account_id
    into v_request_user_id, v_job_id, v_request_status, v_currency,
         v_amount, v_recipient
  from public.payment_requests pr
  where pr.id = p_request_id
  for update;

  if v_request_user_id is null or v_request_user_id <> v_user_id then
    raise exception 'Payment request not found' using errcode = 'P0002';
  end if;
  if v_request_status not in ('draft', 'shared') then
    raise exception 'This payment request cannot be shared' using errcode = '22023';
  end if;
  if v_currency <> 'NEAR' then
    raise exception 'USDC checkout is not enabled yet. Choose native NEAR for testnet payments.' using errcode = '22023';
  end if;

  v_recipient_was_saved := v_recipient is not null;
  select coalesce(v_recipient, p.near_account_id), p.near_network
    into v_recipient, v_wallet_network
  from public.profiles p
  where p.id = v_user_id;

  if v_recipient is null
     or (not v_recipient_was_saved and v_wallet_network is distinct from 'testnet')
     or v_recipient !~ '^[a-z0-9._-]{2,64}$' then
    raise exception 'Connect a NEAR testnet wallet before sharing a payment request.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.jobs j
    where j.id = v_job_id and j.user_id = v_user_id and j.status = 'completed'
  ) then
    raise exception 'Only completed jobs can be shared' using errcode = '22023';
  end if;

  update public.payment_request_shares
  set revoked_at = now()
  where payment_request_id = p_request_id
    and user_id = v_user_id
    and revoked_at is null;

  insert into public.payment_request_shares (
    payment_request_id, user_id, token_hash, expires_at
  ) values (
    p_request_id, v_user_id,
    extensions.digest(pg_catalog.convert_to(p_token, 'UTF8'), 'sha256'),
    v_expires_at
  );

  update public.payment_requests
  set status = 'shared',
      settlement_network = coalesce(settlement_network, 'testnet'),
      settlement_asset = coalesce(settlement_asset, 'NEAR'),
      recipient_account_id = coalesce(recipient_account_id, v_recipient),
      amount_atomic = coalesce(amount_atomic, trunc(v_amount * 1000000000000000000000000)::numeric(78,0))
  where id = p_request_id and user_id = v_user_id;

  return v_expires_at;
end;
$$;

revoke all on function public.create_payment_request_share(uuid, text) from public, anon;
grant execute on function public.create_payment_request_share(uuid, text) to authenticated, service_role;
