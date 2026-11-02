# Taskora

**Work done. Payments moving.**

Taskora is a crypto-first workspace for freelancers and small businesses to organise client jobs and prepare secure crypto payment requests for completed work, with NEAR as the target settlement ecosystem.

## Current build

- Email/password sign-up and sign-in with Supabase Auth
- Email confirmation callback and protected workspace
- Persistent client and job records in Supabase
- Collapsible responsive workspace navigation
- Overview, My Jobs, My Payments and Invoices views
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
- Wallet connection, payment collection and on-chain transaction verification are not implemented.
- Shared links are requests for payment, not proof that funds have been received.
- Confirmed-payment totals must only include authoritative on-chain verification.
- The Assistant currently uses transparent guided workflow rules; it is not connected to an AI model or autonomous agent runtime yet.
- USDC settlement on NEAR requires verification of the exact supported token contract and network deployment.

Do not use the current build to collect real funds.

## Tech stack

- Next.js 15, React 19 and TypeScript
- Supabase PostgreSQL and Auth
- `@supabase/ssr` and `@supabase/supabase-js`
- Tailwind CSS and Lucide icons

## Planned NEAR hackathon flow

1. Provider records a client job in USDC or NEAR.
2. Provider marks the work complete.
3. Taskora prepares a secure crypto payment request.
4. Client reviews the request through an expiring share link.
5. Client connects a NEAR-compatible wallet and approves the correct asset transfer.
6. A server-side verifier confirms final on-chain execution before the request is marked paid.

See [HACKATHON.md](./HACKATHON.md) and [the NEAR payment integration plan](./docs/near-payment-integration-plan.md).
