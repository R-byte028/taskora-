# Taskora

**Work done. Payments moving.**

Taskora is a crypto-first workspace for freelancers and small businesses to organise client jobs and prepare secure crypto payment requests for completed work, with NEAR as the target settlement ecosystem.

## Current build

- Email/password sign-up and sign-in with Supabase Auth
- Email confirmation callback and protected workspace
- Persistent client and job records in Supabase
- Collapsible responsive workspace navigation
- Overview, My Jobs, My Payments, Invoices, Assistant and Settings views
- Workspace-wide search across jobs, clients and payment requests
- Action-oriented notifications for draft requests, shared requests and completed jobs
- Profile editing and authenticated password updates in Settings
- Crypto-only job and payment-request denominations: USDC and NEAR
- USDC as the default USD-pegged crypto denomination
- Separate display of USDC and NEAR totals
- Guided Taskora Assistant preview connected to the signed-in user's jobs and payment requests
- Assistant quick actions to filter completed/active jobs, review pending requests, summarise the workspace and prepare an invoice
- Secure client links using random server-side tokens; only token hashes are stored
- Review saved payment requests, retry draft sharing and revoke active links
- Owner-only Row Level Security on profiles, clients, jobs and payment requests

## Run locally

Requirements: Node.js 20.9 or later.

1. Clone this repository.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env.local`. The example contains the Taskora project URL and public publishable key.
4. Start the app:

   ```bash
   npm run dev
   ```

5. Open http://localhost:3000, create an account and confirm your email if prompted.

The publishable key is designed for use in a public client application. Never expose a Supabase secret or service-role key in a `NEXT_PUBLIC_*` variable or commit one to Git.

## Supabase project

Taskora uses the dedicated Supabase project `basqoozudxgomnccrnub`. Its database includes profiles, clients, jobs and payment_requests. Row Level Security limits each signed-in user to their own records.

The crypto-only currency migration sets USDC as the default and allows USDC or NEAR. Fiat currencies are not accepted for new records.

## Important limitations

Taskora is not a live payment product yet.

- Secure client-facing share links use random server-side tokens; only SHA-256 hashes are stored.
- Secure-sharing, revocation and crypto-only currency migrations are applied to the Taskora Supabase project.
- NEAR Connect wallet integration, NEAR testnet transfer submission and a server-side final-transaction verifier are implemented in the current branch, but a complete live-wallet end-to-end test is still required before treating the flow as demo-verified.
- Shared links are requests for payment, not proof that funds have been received. A request is marked paid only after the backend verifies final transaction execution, signer, recipient and exact amount.
- Confirmed-payment totals must only include authoritative on-chain verification.
- The Assistant currently uses transparent guided workflow rules; it is not connected to an AI model or autonomous agent runtime yet.
- USDC settlement on NEAR is not enabled; the exact token contract and network deployment must be verified first.

Do not use the current build to collect real funds.

## Tech stack

- Next.js 15, React 19 and TypeScript
- Supabase PostgreSQL and Auth
- `@supabase/ssr` and `@supabase/supabase-js`
- Tailwind CSS and Lucide icons

## NEAR hackathon flow

1. Provider records an externally obtained client job.
2. Provider tracks milestones, checklist items and work updates.
3. Provider explicitly confirms completion.
4. Taskora prepares a secure NEAR testnet payment request.
5. Client reviews a minimal public checkout page through an expiring share link.
6. The server-side verifier is designed to confirm final execution, signer, recipient and exact amount before marking a request paid.

The verifier is deployed as Supabase Edge Function version 5. Its mock regression suite has 17 passing tests and its live negative-path suite has 7 passing tests. A successful end-to-end payment has not been demonstrated. Do not submit a wallet transaction or use real funds for the current review.

See [HACKATHON.md](./HACKATHON.md) and [the NEAR payment integration plan](./docs/near-payment-integration-plan.md).

## Hackathon demo checklist

Use [HACKATHON.md](./HACKATHON.md) for the full implementation status and judge walkthrough. Demonstrate the job lifecycle, milestones/checklist, progress evidence, explicit completion, secure request creation, minimal client checkout, link revocation and verifier regression/negative-path tests. Do not stage a successful payment claim until the full flow has been safely validated.

**Demo status:** the NEAR wallet and verifier code is present, but do not claim a successful live payment until the complete flow has been tested against the deployed testnet backend.

## Verifier regression tests

Run the local, mock-only NEAR verifier guard suite with:

```bash
npm run test:near-verifier
```

The tests use fixed fixtures and injected mock responses. They cover payment-context validation, final-execution result shape, exact transfer matching, pending or malformed RPC responses, and duplicate or failed database-finalization outcomes. They do **not** contact NEAR RPC, connect to a wallet, submit a transaction, or call the deployed Supabase Edge Function. A passing suite is regression coverage for the guard rules, not proof of a live payment or an end-to-end integration test.

The live negative-path smoke suite checks the deployed Edge Function's HTTP boundary using synthetic, non-existent payment data only:

```bash
npm run test:near-verifier:live
```

It checks method handling, content type, malformed JSON, invalid fields, JSON `null` and array bodies, and rejection of an unknown synthetic token. It does not submit a transaction, use a wallet, or exercise successful payment finalization. It requires network access to the configured Taskora Supabase function URL; override it with `TASKORA_VERIFIER_URL` when testing another environment.
