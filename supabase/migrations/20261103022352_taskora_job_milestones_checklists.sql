create table if not exists public.job_milestones (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 180),
  description text,
  sort_order integer not null default 0 check (sort_order >= 0),
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_milestones_id_user_id_key unique (id, user_id),
  constraint job_milestones_job_owner_fkey
    foreign key (job_id, user_id)
    references public.jobs (id, user_id) on delete cascade,
  constraint job_milestones_completion_consistency
    check ((status = 'completed') = (completed_at is not null))
);

create table if not exists public.milestone_checklist_items (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 240),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint milestone_checklist_items_milestone_owner_fkey
    foreign key (milestone_id, user_id)
    references public.job_milestones (id, user_id) on delete cascade,
  constraint milestone_checklist_items_completion_consistency
    check (is_completed = (completed_at is not null))
);

create index if not exists job_milestones_job_order_idx
  on public.job_milestones (job_id, sort_order, created_at);
create index if not exists job_milestones_user_idx
  on public.job_milestones (user_id);
create index if not exists milestone_checklist_items_milestone_order_idx
  on public.milestone_checklist_items (milestone_id, sort_order, created_at);
create index if not exists milestone_checklist_items_user_idx
  on public.milestone_checklist_items (user_id);

drop trigger if exists job_milestones_set_updated_at on public.job_milestones;
create trigger job_milestones_set_updated_at
  before update on public.job_milestones
  for each row execute function public.set_updated_at();

drop trigger if exists milestone_checklist_items_set_updated_at on public.milestone_checklist_items;
create trigger milestone_checklist_items_set_updated_at
  before update on public.milestone_checklist_items
  for each row execute function public.set_updated_at();

alter table public.job_milestones enable row level security;
alter table public.milestone_checklist_items enable row level security;

grant select, insert, update, delete on public.job_milestones to authenticated;
grant select, insert, update, delete on public.milestone_checklist_items to authenticated;

drop policy if exists job_milestones_select_own on public.job_milestones;
create policy job_milestones_select_own on public.job_milestones
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists job_milestones_insert_own on public.job_milestones;
create policy job_milestones_insert_own on public.job_milestones
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists job_milestones_update_own on public.job_milestones;
create policy job_milestones_update_own on public.job_milestones
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists job_milestones_delete_own on public.job_milestones;
create policy job_milestones_delete_own on public.job_milestones
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists milestone_checklist_items_select_own on public.milestone_checklist_items;
create policy milestone_checklist_items_select_own on public.milestone_checklist_items
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists milestone_checklist_items_insert_own on public.milestone_checklist_items;
create policy milestone_checklist_items_insert_own on public.milestone_checklist_items
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists milestone_checklist_items_update_own on public.milestone_checklist_items;
create policy milestone_checklist_items_update_own on public.milestone_checklist_items
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists milestone_checklist_items_delete_own on public.milestone_checklist_items;
create policy milestone_checklist_items_delete_own on public.milestone_checklist_items
  for delete to authenticated using ((select auth.uid()) = user_id);
