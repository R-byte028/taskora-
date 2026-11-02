-- Allow an owner to revoke a shared payment-request link without deleting the request.
create or replace function public.revoke_payment_request_share(p_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_request_user_id uuid;
  v_request_status text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select pr.user_id, pr.status
    into v_request_user_id, v_request_status
  from public.payment_requests pr
  where pr.id = p_request_id
  for update;

  if v_request_user_id is null or v_request_user_id <> v_user_id then
    raise exception 'Payment request not found' using errcode = 'P0002';
  end if;

  if v_request_status <> 'shared' then
    raise exception 'Only shared payment requests can be revoked' using errcode = '22023';
  end if;

  update public.payment_request_shares
  set revoked_at = now()
  where payment_request_id = p_request_id
    and user_id = v_user_id
    and revoked_at is null;

  update public.payment_requests
  set status = 'draft'
  where id = p_request_id and user_id = v_user_id;

  return true;
end;
$$;

revoke all on function public.revoke_payment_request_share(uuid) from public, anon, authenticated;
grant execute on function public.revoke_payment_request_share(uuid) to authenticated;
