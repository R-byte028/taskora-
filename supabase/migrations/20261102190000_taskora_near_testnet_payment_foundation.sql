-- Taskora native NEAR testnet wallet settlement foundation.
-- Mainnet and USDC collection remain disabled.

alter table public.profiles
  add column if not exists near_account_id text,
  add column if not exists near_network text
    check (near_network is null or near_network = 'testnet');

alter table public.jobs alter column amount type numeric(38,24) using amount::numeric(38,24);
alter table public.payment_requests
  alter column amount type numeric(38,24) using amount::numeric(38,24),
  add column if not exists settlement_network text,
  add column if not exists settlement_asset text,
  add column if not exists recipient_account_id text,
  add column if not exists amount_atomic numeric(78,0);

alter table public.profiles add constraint profiles_near_account_id_format
  check (near_account_id is null or near_account_id ~ '^[a-z0-9._-]{2,64}$');
alter table public.payment_requests
  add constraint payment_requests_settlement_network_check check (settlement_network is null or settlement_network = 'testnet'),
  add constraint payment_requests_settlement_asset_check check (settlement_asset is null or settlement_asset = 'NEAR'),
  add constraint payment_requests_recipient_format check (recipient_account_id is null or recipient_account_id ~ '^[a-z0-9._-]{2,64}$'),
  add constraint payment_requests_atomic_positive check (amount_atomic is null or amount_atomic > 0);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_request_id uuid not null references public.payment_requests(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  network text not null check (network = 'testnet'),
  asset text not null check (asset = 'NEAR'),
  transaction_hash text not null unique,
  signer_account_id text not null,
  receiver_account_id text not null,
  amount_atomic numeric(78,0) not null check (amount_atomic > 0),
  finality text not null check (finality = 'FINAL'),
  verified_at timestamptz not null default now(),
  verification_evidence jsonb not null default '{}'::jsonb
);
create index payment_events_request_idx on public.payment_events(payment_request_id, verified_at desc);
create index payment_events_user_idx on public.payment_events(user_id, verified_at desc);
alter table public.payment_events enable row level security;
revoke all on public.payment_events from public, anon, authenticated;
grant select, insert on public.payment_events to service_role;

create or replace function public.create_payment_request_share(p_request_id uuid, p_token text)
returns timestamptz language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_request_user_id uuid;
  v_job_id uuid;
  v_request_status text;
  v_currency text;
  v_amount numeric(38,24);
  v_recipient text;
  v_expires_at timestamptz := now() + interval '30 days';
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{40,128}$' then raise exception 'Invalid share token' using errcode = '22023'; end if;

  select pr.user_id, pr.job_id, pr.status, pr.currency, pr.amount, pr.recipient_account_id
    into v_request_user_id, v_job_id, v_request_status, v_currency, v_amount, v_recipient
  from public.payment_requests pr where pr.id = p_request_id for update;

  if v_request_user_id is null or v_request_user_id <> v_user_id then raise exception 'Payment request not found' using errcode = 'P0002'; end if;
  if v_request_status not in ('draft', 'shared') then raise exception 'This payment request cannot be shared' using errcode = '22023'; end if;
  if v_currency <> 'NEAR' then raise exception 'USDC checkout is not enabled yet. Choose native NEAR for testnet payments.' using errcode = '22023'; end if;

  select coalesce(v_recipient, p.near_account_id) into v_recipient from public.profiles p where p.id = v_user_id;
  if v_recipient is null or v_recipient !~ '^[a-z0-9._-]{2,64}$' then raise exception 'Connect your NEAR testnet wallet before sharing a payment request.' using errcode = '22023'; end if;

  if not exists (select 1 from public.jobs j where j.id = v_job_id and j.user_id = v_user_id and j.status = 'completed') then
    raise exception 'Only completed jobs can be shared' using errcode = '22023';
  end if;

  update public.payment_request_shares set revoked_at = now()
  where payment_request_id = p_request_id and user_id = v_user_id and revoked_at is null;

  insert into public.payment_request_shares(payment_request_id,user_id,token_hash,expires_at)
  values (p_request_id,v_user_id,extensions.digest(pg_catalog.convert_to(p_token,'UTF8'),'sha256'),v_expires_at);

  update public.payment_requests
  set status = 'shared',
      settlement_network = coalesce(settlement_network,'testnet'),
      settlement_asset = coalesce(settlement_asset,'NEAR'),
      recipient_account_id = coalesce(recipient_account_id,v_recipient),
      amount_atomic = coalesce(amount_atomic,trunc(v_amount * 1000000000000000000000000)::numeric(78,0))
  where id = p_request_id and user_id = v_user_id;
  return v_expires_at;
end;
$$;

create or replace function public.get_near_payment_verification_context(p_token text)
returns table(payment_request_id uuid,user_id uuid,recipient_account_id text,amount_atomic text,settlement_network text,settlement_asset text,request_status text)
language sql stable security definer set search_path = ''
as $$
  select pr.id,pr.user_id,pr.recipient_account_id,pr.amount_atomic::text,pr.settlement_network,pr.settlement_asset,pr.status
  from public.payment_request_shares s
  join public.payment_requests pr on pr.id=s.payment_request_id and pr.user_id=s.user_id
  where p_token is not null and p_token ~ '^[A-Za-z0-9_-]{40,128}$'
    and s.token_hash=extensions.digest(pg_catalog.convert_to(p_token,'UTF8'),'sha256')
    and s.revoked_at is null and s.expires_at>now() and pr.status='shared'
    and pr.settlement_network='testnet' and pr.settlement_asset='NEAR'
  limit 1;
$$;

create or replace function public.finalize_near_payment(
  p_payment_request_id uuid,p_transaction_hash text,p_signer_account_id text,
  p_receiver_account_id text,p_amount_atomic text,p_verification_evidence jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_request public.payment_requests%rowtype; v_event_id uuid;
begin
  if p_transaction_hash is null or p_transaction_hash !~ '^[1-9A-HJ-NP-Za-km-z]{40,50}$' then
    raise exception 'Invalid NEAR transaction hash' using errcode='22023';
  end if;
  select * into v_request from public.payment_requests where id=p_payment_request_id for update;
  if not found or v_request.status<>'shared' then raise exception 'Payment request is no longer payable' using errcode='22023'; end if;
  if v_request.settlement_network<>'testnet' or v_request.settlement_asset<>'NEAR'
    or v_request.currency<>'NEAR' or v_request.recipient_account_id<>p_receiver_account_id
    or v_request.amount_atomic::text<>p_amount_atomic then
    raise exception 'Verified transaction does not match this payment request' using errcode='22023';
  end if;
  insert into public.payment_events(payment_request_id,user_id,network,asset,transaction_hash,signer_account_id,receiver_account_id,amount_atomic,finality,verification_evidence)
  values(v_request.id,v_request.user_id,'testnet','NEAR',p_transaction_hash,p_signer_account_id,p_receiver_account_id,p_amount_atomic::numeric,'FINAL',coalesce(p_verification_evidence,'{}'::jsonb))
  returning id into v_event_id;
  update public.payment_requests set status='paid' where id=v_request.id;
  return v_event_id;
exception when unique_violation then raise exception 'This transaction has already been recorded' using errcode='23505';
end;
$$;

create or replace function public.get_public_near_payment_request(p_token text)
returns table(client_name text,job_title text,amount numeric,currency text,work_summary text,request_reference text,provider_name text,expires_at timestamptz,recipient_account_id text,settlement_network text,amount_atomic text)
language sql stable security definer set search_path = ''
as $$
  select c.name,j.title,pr.amount,pr.currency,pr.work_summary,
    'TASKORA-'||upper(pg_catalog.left(pr.id::text,8)),
    coalesce(nullif(pg_catalog.btrim(p.business_name),''),nullif(pg_catalog.btrim(p.full_name),''),'Taskora provider'),
    s.expires_at,pr.recipient_account_id,pr.settlement_network,pr.amount_atomic::text
  from public.payment_request_shares s
  join public.payment_requests pr on pr.id=s.payment_request_id and pr.user_id=s.user_id
  join public.clients c on c.id=pr.client_id and c.user_id=pr.user_id
  join public.jobs j on j.id=pr.job_id and j.user_id=pr.user_id
  left join public.profiles p on p.id=pr.user_id
  where p_token is not null and p_token ~ '^[A-Za-z0-9_-]{40,128}$'
    and s.token_hash=extensions.digest(pg_catalog.convert_to(p_token,'UTF8'),'sha256')
    and s.revoked_at is null and s.expires_at>now() and pr.status='shared'
    and pr.settlement_network='testnet' and pr.settlement_asset='NEAR'
  limit 1;
$$;

revoke all on function public.get_near_payment_verification_context(text) from public,anon,authenticated;
grant execute on function public.get_near_payment_verification_context(text) to service_role;
revoke all on function public.finalize_near_payment(uuid,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.finalize_near_payment(uuid,text,text,text,text,jsonb) to service_role;
revoke all on function public.get_public_near_payment_request(text) from public,anon,authenticated;
grant execute on function public.get_public_near_payment_request(text) to anon,authenticated;
