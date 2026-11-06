# Taskora

**Work done. Payments moving.**

Taskora is a crypto-first workspace for freelancers and small businesses to record externally obtained client jobs, track delivery, confirm completion and prepare secure payment requests. It is not a job marketplace.

## Current build

- Email/password sign-up, sign-in and email confirmation through Supabase Auth.
- Persistent client, job, milestone, checklist, work-update and payment-request records.
- Responsive Overview, My Jobs, My Payments, Invoices, Assistant and Settings workspace.
- Workspace search, notifications, profile editing and password updates.
- Explicit job-completion confirmation, separate from payment status.
- Private work-evidence storage with owner/job-scoped access.
- Secure client payment links, draft retry, revocation and owner-only link recopy.
- NEAR testnet wallet connection and client checkout UI.
- Server-side NEAR testnet transaction verification and atomic payment finalization.
- Payment-request status and settlement fields protected from direct authenticated client writes.
- Atomic share-token creation and revocation inside owner-checked database functions. Raw owner tokens cannot be selected directly; an owner-only recovery RPC returns only active, unexpired links.
- Persistent Assistant conversation history in private Supabase tables.

## Assistant status

The Assistant page and conversation-history backend are present. Vercel AI Gateway authentication is not configured, so AI responses are deliberately deferred. This does not block the core job, milestone, invoice or payment workflows. Do not configure AI Gateway as part of the current release work.

The Assistant is designed to be read-only: it must not create or edit jobs, create or revoke payment links, transfer assets, or mark requests paid.

## Run locally

Requirements: Node.js 20.9 or later.

1. Clone this repository.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env.local`.
4. Start the app:

   ```bash
   npm run dev
   ```

5. Open http://localhost:3000 and sign in.

The Supabase publishable key is designed for use in a public client application. Never expose a Supabase secret or service-role key in a `NEXT_PUBLIC_*` variable or commit one to Git.

## Supabase project

Taskora uses the dedicated Supabase project `basqoozudxgomnccrnub`. Its database includes profiles, clients, jobs, milestones, checklist items, work updates, payment requests, payment events and Assistant conversation history.

All 12 public tables have Row Level Security enabled. User-owned records are scoped to the authenticated owner. The work-evidence bucket is private and has owner/job-scoped storage policies.

Authenticated users can create draft payment requests and delete eligible drafts, but cannot directly set payment status, settlement details or amounts. The verified server-side settlement function is the only path that marks a request paid.

## Payment status and limitations

Taskora is a testnet build, not a live payment product.

- NEAR checkout is testnet-only. Mainnet and USDC settlement are not enabled.
- The deployed `verify-near-payment` Edge Function is active at version 6.
- The verifier checks final execution, signer, recipient, transfer action and exact amount before atomic payment finalization.
- Duplicate transaction use is rejected.
- Public checkout responses omit personal names, job titles and private work summaries.
- Shared links are payment requests, not proof that funds have been received.
- **End-to-end testnet checkout has been completed.** The previously confirmed transaction is recorded in Supabase as paid with FINAL execution; the stored event matches the request's exact atomic amount and recipient.
- This validates the testnet verification path; it does not enable mainnet or real-fund collection.
- Do not use real funds or describe this build as ready for real payment collection.

## Verification recorded

- Latest GitHub Actions run passed TypeScript checking and the Next.js production build.
- NEAR verifier mock regression suite: 18 tests passed.
- Deployed Edge Function negative-path suite: 7 tests passed using synthetic invalid data.
- Supabase has 21 applied migrations.
- Authenticated RLS isolation check using a synthetic second-user identity returned zero rows across the user-owned data tables.
- Payment-request privilege checks confirm authenticated clients cannot directly update payment status or settlement fields.
- Share and revoke database regression checks passed inside rolled-back transactions.
- Database security review confirmed RLS on all public tables, private evidence storage and restricted payment-finalization functions.

Sign-up, email confirmation and sign-in have been tested. Owner browser testing has confirmed the payment-link lifecycle (share, recopy, revoke and blocked revoked URL) and reports the workspace tools are working correctly. The remaining release task is the judge walkthrough, screenshots and demo recording.

## NEAR hackathon walkthrough

The concise [judge demo guide](./docs/judge-demo.md) includes the timed walkthrough, screenshot checklist and recording safety notes.

1. Sign in to the Taskora workspace.
2. Create a client job and track milestones, checklist items and progress updates.
3. Confirm completion and prepare a secure NEAR testnet payment request.
4. Open the client checkout page and review the amount, recipient and testnet disclosure.
5. Show the already completed NEAR testnet checkout and its recorded transaction.
6. Show the checkout's independent “Payment verified” confirmation and matching payment record; do not send another payment just for the demo.
7. Demonstrate verifier rejection rules with the documented regression and negative-path suites.
8. Demonstrate link recopy without creating a new link, then revoke a separate link and confirm the old link no longer works (owner browser-tested).
9. See [HACKATHON.md](./HACKATHON.md) and [the NEAR payment implementation record](./docs/near-testnet-wallet-payment-implementation.md).

## Verifier tests

Run the mock-only regression suite:

```bash
npm run test:near-verifier
```

Run the deployed Edge Function negative-path suite:

```bash
npm run test:near-verifier:live
```

The mock suite uses fixtures and does not contact NEAR RPC, connect a wallet or submit a transaction. The live suite sends synthetic invalid data only; it does not submit a transaction or exercise successful payment finalization.
