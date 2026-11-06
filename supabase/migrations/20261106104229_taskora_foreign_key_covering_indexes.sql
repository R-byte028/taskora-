-- Cover composite and standalone foreign keys used by ownership checks and joins.
-- These are additive indexes; existing indexes are retained because they may
-- support separate query patterns even when the advisor currently reports low use.
create index if not exists assistant_messages_conversation_user_idx
  on public.assistant_messages (conversation_id, user_id);

create index if not exists assistant_messages_user_id_idx
  on public.assistant_messages (user_id);

create index if not exists job_milestones_job_user_idx
  on public.job_milestones (job_id, user_id);

create index if not exists job_updates_job_user_idx
  on public.job_updates (job_id, user_id);

create index if not exists jobs_client_user_idx
  on public.jobs (client_id, user_id);

create index if not exists milestone_checklist_items_milestone_user_idx
  on public.milestone_checklist_items (milestone_id, user_id);

create index if not exists payment_request_shares_request_user_idx
  on public.payment_request_shares (payment_request_id, user_id);

create index if not exists payment_request_shares_user_id_idx
  on public.payment_request_shares (user_id);

create index if not exists payment_requests_client_user_idx
  on public.payment_requests (client_id, user_id);

create index if not exists payment_requests_job_user_idx
  on public.payment_requests (job_id, user_id);
