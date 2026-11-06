# Taskora NEAR Testnet Wallet and Payment Implementation

**Status: implemented and verified on NEAR testnet. Mainnet and real-fund collection remain out of scope.**

## Product boundary

Taskora is a private freelancer workspace for recording externally obtained client jobs, tracking delivery and preparing secure crypto payment requests. It is not a job marketplace.

The current checkout supports native NEAR on testnet only. Mainnet and USDC settlement are disabled. Wallet keys and seed phrases are never requested or stored.

## Implemented user journey

### Provider

1. Connect a NEAR testnet wallet from Taskora Settings.
2. Taskora stores the public NEAR account ID and testnet network, not wallet credentials.
3. Record a client job, add milestones/checklists and progress updates, then explicitly confirm completion.
4. Prepare a NEAR-denominated payment request for the completed job.
5. Share the secure link. The receiving account and exact yoctoNEAR amount are snapshotted when the link is created.
6. Recopy the existing active link without replacing it, or revoke it when necessary.

### Client

1. Open the share link without needing a Taskora account.
2. Review the amount, destination and testnet disclosure.
3. Connect a compatible NEAR testnet wallet.
4. Explicitly approve the native NEAR transfer.
5. Submit the transaction reference for independent verification.
6. See payment confirmation only after the server verifies the final transaction and records the payment event.

## Server-side verification

A transaction hash supplied by the browser is an untrusted lookup hint, never proof of payment.

The deployed `verify-near-payment` Edge Function independently queries NEAR testnet and checks:

- The transaction is on testnet and reaches FINAL execution status.
- Transaction execution succeeded.
- The signer matches the submitted payer account.
- The receiver matches the recipient saved on the payment request.
- The transaction contains the expected native NEAR Transfer action.
- The transfer deposit equals the exact request amount in yoctoNEAR, using integer/string arithmetic rather than floating point.
- The payment request is still shared, valid, unexpired and not already paid.
- The transaction hash has not already been credited to another request.

Only the trusted server-side verifier can create the payment event and change a request to paid. Authenticated browser clients do not have permission to update payment status or settlement fields directly.

## Database and security implementation

- Provider profile stores `near_account_id` and `near_network`; the network constraint is testnet-only.
- Payment requests snapshot `settlement_network`, `settlement_asset`, `recipient_account_id` and exact `amount_atomic`.
- `payment_events` records the unique transaction hash, payer, receiver, amount, network, asset, finality, verification time and minimal evidence.
- A unique transaction-hash constraint prevents duplicate crediting.
- `finalize_near_payment` is restricted to the service role and performs token revalidation, request locking, event insertion and status transition atomically.
- Public checkout RPCs validate the high-entropy share token and return only the minimum checkout fields. Personal names, job titles and private work summaries are omitted.
- Payment request creation is limited to draft rows. Authenticated clients cannot directly update payment status, settlement fields, amounts or owner tokens.
- Share-token creation and revocation update the share record and owner recovery token atomically inside owner-checked database functions.
- Raw owner tokens are excluded from direct table reads. An owner-only recovery RPC returns a token only when its hash matches an active, unexpired share; expired and revoked links cannot be recopied as if active.
- Completed-job amount editing uses an ownership-checked, locking database function and is rejected once a payment request has been shared or paid.
- All public tables have RLS enabled. Payment event/share tables have no client-facing policies, so direct access is default-deny.
- Work evidence is stored in a private bucket with owner/job-scoped storage policies, a 10 MB limit and an allow-list of image, PDF and plain-text types.
- Foreign-key covering indexes were added for ownership joins and referential checks.

## Verification recorded

- Supabase Edge Function `verify-near-payment`: version 6 ACTIVE.
- NEAR verifier mock regression suite: 18 tests passed.
- Deployed Edge Function negative-path suite: 7 tests passed with synthetic invalid data only.
- A testnet transaction was independently verified and recorded in Supabase as paid with FINAL execution. Its stored event matches the payment request's exact atomic amount and recipient.
- Share and revoke regression checks passed using temporary database fixtures inside rolled-back transactions.
- Authenticated RLS isolation check with a synthetic second-user identity returned zero rows across profiles, clients, jobs, payment requests, milestones, checklist items, work updates and Assistant history.
- Payment-request privilege checks confirmed authenticated clients cannot directly set payment status or settlement fields.
- GitHub Actions run #149 passed for PR head 8f51c0a, including verifier regression tests, TypeScript checking and the Next.js production build.
- The Vercel deployment for current PR head 8f51c0a was still BUILDING at the latest check. The preceding commit 08ca29b has a READY preview; confirm the current head reaches READY before recording.

## Current limitations

- NEAR testnet only. Do not use real funds.
- Mainnet and USDC settlement are disabled.
- The Assistant page and history are present, but AI Gateway authentication is deliberately deferred and is not a dependency of the payment workflow.
- Supabase leaked-password protection remains disabled due to the current plan limitation.
- Supabase security warnings for token-scoped public checkout RPCs and authenticated owner-checked SECURITY DEFINER routines are reviewed, intentional and guarded by token/owner validation. Payment event/share tables remain default-deny to direct clients.

## Final release checks

- Use docs/judge-demo.md for the four-minute speaking script, screenshot capture list and recording checklist.
- Confirm the preview for the exact PR head is READY before recording; do not assume an older deployment reflects the latest docs.
- Complete the judge walkthrough, screenshots and demo recording.
- Keep all payment demonstrations on NEAR testnet.
