-- Private progress notes and work evidence for each job.
create table if not exists public.job_updates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  attachment_path text,
  attachment_name text,
  attachment_mime_type text,
  attachment_size bigint,
  created_at timestamptz not null default now(),
  constraint job_updates_content_length check (char_length(btrim(content)) between 1 and 5000),
  constraint job_updates_attachment_consistency check (
    (attachment_path is null and attachment_name is null and attachment_mime_type is null and attachment_size is null)
    or
    (attachment_path is not null and attachment_name is not null and attachment_mime_type is not null and attachment_size between 1 and 10485760)
  ),
  constraint job_updates_job_owner_fk foreign key (job_id, user_id)
    references public.jobs(id, user_id) on delete cascade
);
create index if not exists job_updates_job_created_idx on public.job_updates(job_id, created_at desc);
create index if not exists job_updates_user_created_idx on public.job_updates(user_id, created_at desc);
alter table public.job_updates enable row level security;
grant select, insert, delete on public.job_updates to authenticated;
create policy "Users can view their own job updates" on public.job_updates
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can add their own job updates" on public.job_updates
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can delete their own job updates" on public.job_updates
  for delete to authenticated using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('taskora-work-evidence', 'taskora-work-evidence', false, 10485760,
  array['image/jpeg','image/png','image/webp','application/pdf','text/plain'])
on conflict (id) do update set public = false, file_size_limit = 10485760,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can upload their own job evidence" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'taskora-work-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.jobs j where j.id::text = (storage.foldername(name))[2] and j.user_id = (select auth.uid()))
  );
create policy "Users can view their own job evidence" on storage.objects
  for select to authenticated using (
    bucket_id = 'taskora-work-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.jobs j where j.id::text = (storage.foldername(name))[2] and j.user_id = (select auth.uid()))
  );
create policy "Users can delete their own job evidence" on storage.objects
  for delete to authenticated using (
    bucket_id = 'taskora-work-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.jobs j where j.id::text = (storage.foldername(name))[2] and j.user_id = (select auth.uid()))
  );
