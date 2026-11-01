# Taskora

**Work done. Payments moving.**

Taskora is a lightweight workspace for freelancers and small businesses to organise client jobs and prepare clear payment requests for completed work.

## Current build

The repository includes an interactive frontend preview and the first Supabase backend foundation:

- Responsive workspace dashboard and job summary cards
- Create-job form and browser-local demo persistence (the dashboard has not yet been switched to database storage)
- Mark an active job as completed
- Prepare a payment request from a completed job
- Generate a client-facing demo link
- Client request page showing service, amount, reference and work summary
- Supabase PostgreSQL schema for profiles, clients, jobs and payment requests
- Row Level Security policies that restrict those records to their authenticated owner
- Typed Supabase browser and server client helpers
- Automatic profile creation when a user signs up through Supabase Auth

## Supabase setup

The Taskora Supabase project has the core schema deployed.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local`.
3. Set the project values in `.env.local`:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

Use the publishable key only in the browser/server application client. Never put a Supabase secret or service-role key in a `NEXT_PUBLIC_*` variable or commit secrets to Git.

## Important limitations

This is not a live payment product yet.

- The dashboard still uses browser local storage for demo jobs; persistent CRUD integration is the next step.
- Authentication UI and protected routes are not complete yet.
- The client-facing demo link still carries details in URL parameters. It is not a secure, server-backed invoice.
- Payment request rows are private to their owner; no public token-based client access endpoint exists yet.
- The assistant currently organises provider-entered information. It is not connected to an AI model.
- No wallet connection, NEAR transaction or payment collection is implemented.
- The client page clearly states that payment is unavailable.

Do not use this preview to collect real funds or share confidential client information.

## Tech stack

- Next.js 15
- React 19
- TypeScript
- Supabase PostgreSQL, Auth foundation and Row Level Security
- `@supabase/ssr` and `@supabase/supabase-js`
- Tailwind CSS
- Lucide icons

## Planned NEAR hackathon flow

1. A provider signs in and records a client job.
2. The provider marks the work complete.
3. Taskora prepares a structured payment request.
4. The client reviews the request through a secure share link.
5. A supported NEAR payment flow is added.
6. Payment status is updated only after authoritative transaction verification.

NEAR integration is not implemented yet. See [HACKATHON.md](./HACKATHON.md) for milestones and the intended judge walkthrough.
