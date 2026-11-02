# Taskora

**Work done. Payments moving.**

Taskora is a workspace for freelancers and small businesses to organise client jobs and prepare payment requests for completed work.

## Current build

- Email/password sign-up and sign-in with Supabase Auth
- Email confirmation callback
- Protected dashboard routes and sign-out
- Persistent client and job records in Supabase
- Mark jobs complete and save payment request drafts
- Owner-only Row Level Security on profiles, clients, jobs and payment requests
- Typed Supabase browser and server clients

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

Taskora uses the dedicated Supabase project `basqoozudxgomnccrnub`. Its database includes:

- `profiles`
- `clients`
- `jobs`
- `payment_requests`

All four tables have Row Level Security enabled. The policies limit each signed-in user to their own records.

## Important limitations

Taskora is not a live payment product yet.

- Secure client-facing share-link code is in place: random tokens are generated server-side, only SHA-256 hashes are stored, and public pages receive a limited set of request details.
- The database migration for share links must be applied before this feature can run; the feature has not yet been live-tested.
- There is no payment collection, wallet connection or NEAR transaction integration.
- The dashboard's confirmed earnings remain zero until authoritative payment verification exists.
- The assistant is not connected to an AI model yet.
- The current dashboard uses NGN as its initial job-entry currency.

Do not use the current build to collect real funds or share confidential client information through manually constructed URLs.

## Tech stack

- Next.js 15
- React 19
- TypeScript
- Supabase PostgreSQL and Auth
- `@supabase/ssr` and `@supabase/supabase-js`
- Tailwind CSS
- Lucide icons

## Planned NEAR hackathon flow

1. A provider signs in and records a client job.
2. The provider marks the work complete.
3. Taskora prepares a structured payment request.
4. The client reviews the request through a secure share link.
5. A supported NEAR payment flow is added.
6. Payment status changes only after authoritative transaction verification.

See [HACKATHON.md](./HACKATHON.md) for milestones and the judge walkthrough.
