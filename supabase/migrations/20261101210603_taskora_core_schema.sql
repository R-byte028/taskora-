-- Taskora core schema
-- All customer and business records are private to their owning authenticated user.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  business_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid,
  title text not null check (char_length(trim(title)) between 1 and 180),
  description text,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'NGN' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'cancelled')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint jobs_client_owner_fk
    foreign key (client_id, user_id)
    references public.clients(id, user_id)
    on delete set null (client_id)
);

create table public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null,
  client_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'NGN' check (currency ~ '^[A-Z]{3}$'),
  work_summary text not null check (char_length(trim(work_summary)) between 1 and 4000),
  status text not null default 'draft'
    check (status in ('draft', 'shared', 'paid', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint payment_requests_job_owner_fk
    foreign key (job_id, user_id)
    references public.jobs(id, user_id)
    on delete restrict,
  constraint payment_requests_client_owner_fk
    foreign key (client_id, user_id)
    references public.clients(id, user_id)
    on delete restrict
);

create index clients_user_id_idx on public.clients(user_id);
create index jobs_user_status_created_idx on public.jobs(user_id, status, created_at desc);
create index jobs_client_id_idx on public.jobs(client_id);
create index payment_requests_user_status_created_idx
  on public.payment_requests(user_id, status, created_at desc);
create index payment_requests_job_id_idx on public.payment_requests(job_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

create trigger jobs_set_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

create trigger payment_requests_set_updated_at
before update on public.payment_requests
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.jobs enable row level security;
alter table public.payment_requests enable row level security;

grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.jobs to authenticated;
grant select, insert, update, delete on public.payment_requests to authenticated;
grant select, update on public.profiles to authenticated;

create policy "Users can view their own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users can manage their own clients"
on public.clients for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own jobs"
on public.jobs for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own payment requests"
on public.payment_requests for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
 

-- No anonymous/public policies are created. Client-facing share links will be
-- implemented through a narrowly scoped, token-hash-based server endpoint later.
