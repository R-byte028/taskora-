-- Payment status and settlement metadata must only be changed by trusted server-side flows.
-- Authenticated users may create draft requests, read their own requests, delete
-- unshared drafts, and save/recover their own share-link token.
drop policy if exists "Users can manage their own payment requests" on public.payment_requests;

create policy "Users can view their own payment requests"
on public.payment_requests
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own draft payment requests"
on public.payment_requests
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and status = 'draft'
);

create policy "Users can update their own payment link token"
on public.payment_requests
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own draft payment requests"
on public.payment_requests
for delete to authenticated
using (
  (select auth.uid()) = user_id
  and status = 'draft'
);

-- Remove broad table-level writes. Column-level grants prevent clients from
-- setting payment status, settlement details, timestamps, or owner tokens at insert.
revoke insert, update on table public.payment_requests from authenticated;

grant insert (user_id, job_id, client_id, amount, currency, work_summary)
on table public.payment_requests to authenticated;

grant update (owner_share_token)
on table public.payment_requests to authenticated;

-- This carefully scoped routine is the only authenticated path that edits the
-- amount on draft requests. It validates auth.uid(), locks the owned job and
-- requests, and rejects edits after a request is shared or paid.
alter function public.update_completed_job_amount(uuid, numeric) security definer;
alter function public.update_completed_job_amount(uuid, numeric) set search_path = '';

revoke all on function public.update_completed_job_amount(uuid, numeric) from public, anon;
grant execute on function public.update_completed_job_amount(uuid, numeric) to authenticated, service_role;
