-- Taskora secure, revocable client-facing payment request links.
-- Raw tokens are generated server-side and never stored in the database.

create table public.payment_request_shares (
  id uuid primary key default gen_random_uuid(),
  payment_request_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash bytea not null unique,
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint payment_request_shares_owner_fk
    foreign key (payment_request_id, user_id)
    references public.payment_requests(id, user_id)
    on delete cascade
);

create index payment_request_shares_request_idx
  on public.payment_request_shares(payment_request_id);
create index payment_request_shares_expiry_idx
  on public.payment_request_shares(expires_at)
  where revoked_at is null;

alter table public.payment_request_shares enable row level security;
revoke all on public.payment_request_shares from anon, authenticated;

create or replace function public.create_payment_request_share(
  p_request_id uuid,
  p_token text
)
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
  v_job_status text;
  v_expires_at timestamptz := now() + interval '30 days';
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{40,128}$' then
    raise exception 'Invalid share token' using errcode = '22023';
  end if;

  select pr.user_id, pr.job_id, pr.status
    into v_request_user_id, v_job_id, v_request_status
  from public.payment_requests pr
  where pr.id = p_request_id
  for update;

  if v_request_user_id is null or v_request_user_id <> v_user_id then
    raise exception 'Payment request not found' using errcode = 'P0002';
  end if;

  if v_request_status not in ('draft', 'shared') then
    raise exception 'This payment request cannot be shared' using errcode = '22023';
  end if;

  select j.status into v_job_status
  from public.jobs j
  where j.id = v_job_id and j.user_id = v_user_id;

  if v_job_status is distinct from 'completed' then
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
    p_request_id,
    v_user_id,
    extensions.digest(pg_catalog.convert_to(p_token, 'UTF8'), 'sha256'),
    v_expires_at
  );

  update public.payment_requests
  set status = 'shared'
  where id = p_request_id and user_id = v_user_id;

  return v_expires_at;
end;
$$;

create or replace function public.get_public_payment_request(p_token text)
returns table (
  client_name text,
  job_title text,
  amount numeric,
  currency text,
  work_summary text,
  request_reference text,
  provider_name text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.name,
    j.title,
    pr.amount,
    pr.currency,
    pr.work_summary,
    'TASKORA-' || upper(pg_catalog.left(pr.id::text, 8)),
    coalesce(
      nullif(pg_catalog.btrim(p.business_name), ''),
      nullif(pg_catalog.btrim(p.full_name), ''),
      'Taskora provider'
    ),
    s.expires_at
  from public.payment_request_shares s
  join public.payment_requests pr
    on pr.id = s.payment_request_id and pr.user_id = s.user_id
  join public.clients c
    on c.id = pr.client_id and c.user_id = pr.user_id
  join public.jobs j
    on j.id = pr.job_id and j.user_id = pr.user_id
  left join public.profiles p
    on p.id = pr.user_id
  where p_token is not null
    and p_token ~ '^[A-Za-z0-9_-]{40,128}$'
    and s.token_hash = extensions.digest(pg_catalog.convert_to(p_token, 'UTF8'), 'sha256')
    and s.revoked_at is null
    and s.expires_at > now()
    and pr.status = 'shared'
  limit 1;
$$;

revoke all on function public.create_payment_request_share(uuid, text) from public, anon, authenticated;
grant execute on function public.create_payment_request_share(uuid, text) to authenticated;

revoke all on function public.get_public_payment_request(text) from public, anon, authenticated;
grant execute on function public.get_public_payment_request(text) to anon, authenticated;
