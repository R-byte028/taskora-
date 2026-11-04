create or replace function public.update_completed_job_amount(
  p_job_id uuid,
  p_amount numeric
)
returns void
language plpgsql
security invoker
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_job_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero' using errcode = '22023';
  end if;

  -- Lock the owned completed job first. This serializes inserts that reference it.
  select j.id into v_job_id
  from public.jobs j
  where j.id = p_job_id
    and j.user_id = v_user_id
    and j.status = 'completed'
  for update;

  if v_job_id is null then
    raise exception 'Completed job not found' using errcode = 'P0002';
  end if;

  -- Lock existing requests before checking their status.
  perform pr.id
  from public.payment_requests pr
  where pr.job_id = v_job_id
    and pr.user_id = v_user_id
  order by pr.id
  for update;

  if exists (
    select 1
    from public.payment_requests pr
    where pr.job_id = v_job_id
      and pr.user_id = v_user_id
      and pr.status <> 'draft'
  ) then
    raise exception 'Amount is locked because a payment request has been shared or paid'
      using errcode = '22023';
  end if;

  update public.jobs
  set amount = p_amount
  where id = v_job_id
    and user_id = v_user_id
    and status = 'completed';

  update public.payment_requests
  set amount = p_amount
  where job_id = v_job_id
    and user_id = v_user_id
    and status = 'draft';
end;
$function$;

revoke all on function public.update_completed_job_amount(uuid, numeric) from public;
revoke all on function public.update_completed_job_amount(uuid, numeric) from anon;
grant execute on function public.update_completed_job_amount(uuid, numeric) to authenticated;
