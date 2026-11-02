-- Re-check the exact share token inside the final settlement transaction.
-- This closes the race where a link is revoked/expired after RPC lookup but before settlement.

drop function if exists public.finalize_near_payment(uuid,text,text,text,jsonb);

create function public.finalize_near_payment(
  p_payment_request_id uuid,
  p_transaction_hash text,
  p_signer_account_id text,
  p_receiver_account_id text,
  p_amount_atomic text,
  p_verification_evidence jsonb,
  p_token text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.payment_requests%rowtype;
  v_share_id uuid;
  v_event_id uuid;
begin
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{40,128}$' then
    raise exception 'Invalid payment share token' using errcode='22023';
  end if;
  if p_transaction_hash is null or p_transaction_hash !~ '^[1-9A-HJ-NP-Za-km-z]{40,50}$' then
    raise exception 'Invalid NEAR transaction hash' using errcode='22023';
  end if;

  select s.id into v_share_id
  from public.payment_request_shares s
  where s.payment_request_id=p_payment_request_id
    and s.token_hash=extensions.digest(pg_catalog.convert_to(p_token,'UTF8'),'sha256')
    and s.revoked_at is null
    and s.expires_at>now()
  for update;

  if v_share_id is null then
    raise exception 'Payment link is no longer valid' using errcode='22023';
  end if;

  select * into v_request
  from public.payment_requests
  where id=p_payment_request_id
  for update;

  if not found or v_request.status<>'shared' then
    raise exception 'Payment request is no longer payable' using errcode='22023';
  end if;

  if v_request.settlement_network<>'testnet'
    or v_request.settlement_asset<>'NEAR'
    or v_request.currency<>'NEAR'
    or v_request.recipient_account_id<>p_receiver_account_id
    or v_request.amount_atomic::text<>p_amount_atomic then
    raise exception 'Verified transaction does not match this payment request' using errcode='22023';
  end if;

  insert into public.payment_events(
    payment_request_id,user_id,network,asset,transaction_hash,
    signer_account_id,receiver_account_id,amount_atomic,finality,verification_evidence
  ) values (
    v_request.id,v_request.user_id,'testnet','NEAR',p_transaction_hash,
    p_signer_account_id,p_receiver_account_id,p_amount_atomic::numeric,
    'FINAL',coalesce(p_verification_evidence,'{}'::jsonb)
  ) returning id into v_event_id;

  update public.payment_requests set status='paid' where id=v_request.id;
  return v_event_id;
exception when unique_violation then
  raise exception 'This transaction has already been recorded' using errcode='23505';
end;
$$;

revoke all on function public.finalize_near_payment(uuid,text,text,text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.finalize_near_payment(uuid,text,text,text,text,jsonb,text) to service_role;
