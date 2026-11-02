-- Taskora is crypto-only. USDC is the default USD-pegged crypto denomination;
-- NEAR is supported as the native asset. Fiat currencies are not accepted.
alter table public.jobs
  alter column currency set default 'USDC';
alter table public.payment_requests
  alter column currency set default 'USDC';

alter table public.jobs
  drop constraint if exists jobs_currency_check;
alter table public.jobs
  add constraint jobs_currency_crypto_check
  check (currency in ('USDC', 'NEAR'));

alter table public.payment_requests
  drop constraint if exists payment_requests_currency_check;
alter table public.payment_requests
  add constraint payment_requests_currency_crypto_check
  check (currency in ('USDC', 'NEAR'));
