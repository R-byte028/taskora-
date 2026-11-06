# Taskora

**Work done. Payments moving.**

Taskora is a crypto-first workspace for freelancers and small businesses to record externally obtained client jobs, track delivery, confirm completion and prepare secure payment requests. It is not a job marketplace.

## Current build

- Email/password sign-up, sign-in and email confirmation through Supabase Auth.
- Persistent client, job, milestone, checklist, work-update and payment-request records.
- Responsive Overview, My Jobs, My Payments, Invoices, Assistant and Settings workspace.
- Workspace search, actionable notifications, profile editing and password updates.
- Explicit job-completion confirmation, separate from payment status.
- Private work-evidence storage with owner-scoped access.
- Secure client payment links, draft retry, link revocation and owner-only link recopy.
- NEAR testnet wallet connection and client checkout UI.
- Server-side NEAR testnet transaction verification and atomic payment finalization.
- Persistent Assistant conversations stored in private Supabase tables.
- AI Assistant connected to Vercel AI Gateway, with allow-listed read-only tools for workspace summaries, job lists and pending payment requests.
- Assistant actions that could change records remain user-reviewed in the Taskora interface.

## Assistant safety and runtime

The Assistant uses the Vercel AI Gateway model configured by `AI_GATEWAY_MODEL`; the current code fallback is `alibaba/qwen-3-32b`. Vercel deployments use the deployment OIDC token when available. Local or non-Vercel environments can provide `AI_GATEWAY_API_KEY` without committing it.

The Assistant tools are read-only. They cannot create or edit jobs, create or revoke payment links, transfer assets, or mark requests paid. Shared requests are never described as confirmed payments. USDC and NEAR values are kept separate.

## Run locally

Requirements: Node.js 20.9 or later.

1. Clone this repository.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env.local`. It contains the Taskora Supabase URL and publishable key plus the optional AI Gateway model setting.
4. For local AI requests, configure an AI Gateway API key in your uncommitted `.env.local`. Never paste it into source code or commit it.
5. Start the app:

   ```bash
   npm run dev
   ```

6. Open http://localhost:3000 and sign in.

The Supabase publishable key is designed for use in a public client application. Never expose a Supabase secret or service-role key in a `NEXT_PUBLIC_*` variable or commit one to Git.

## Supabase project

Taskora uses the dedicated Supabase project `basqoozudxgomnccrnub`. Its database includes profiles, clients, jobs, milestones, checklist items, work updates, payment requests, payment events and Assistant conversation history.

All public tables have Row Level Security enabled. User-owned records are scoped to the authenticated owner. The work-evidence bucket is private and has owner/job-scoped storage policies.

## Payment status and limitations

Taskora is still a testnet build, not a live payment product.

- NEAR checkout is testnet-only. Mainnet and USDC settlement are not enabled.
- The deployed `verify-near-payment` Edge Function is active at version 6.
- The verifier checks final execution, signer, recipient, transfer action and exact amount before atomic payment finalization.
- Duplicate transaction use is rejected.
- Public checkout responses omit personal names, job titles and private work summaries.
- Shared links are payment requests, not proof that funds have been received.
- **End-to-end testnet checkout has now been completed:** the user completed the wallet transaction and the checkout displayed “Payment verified” with independent NEAR testnet verification.
- This validates the testnet verification path; it does not enable mainnet or real-fund collection.
- Do not use real funds or describe this build as ready for real payment collection.

## Verification recorded

- GitHub Actions: TypeScript check and Next.js production build passed for the current feature-branch commit.
- NEAR verifier mock regression suite: 18 tests passed.
- Deployed Edge Function negative-path suite: 7 tests passed using synthetic invalid data.
- User-confirmed browser checkout displayed successful independent NEAR testnet verification.
- Supabase migrations for the Assistant, milestones, work updates, secure payment links and NEAR settlement are applied.
- Database security review confirmed RLS on all public tables, private evidence storage and restricted execution of privileged payment-finalization functions.

Authenticated sign-up, email confirmation and full Assistant chat runtime still need a separate browser walkthrough.

## NEAR hackathon walkthrough

1. Sign in to the Taskora workspace.
2. Create a client job and track milestones, checklist items and progress updates.
3. Confirm completion and prepare a secure NEAR testnet payment request.
4. Open the client checkout page and review the amount, recipient and testnet disclosure.
5. Connect a NEAR testnet wallet and complete the requested testnet transfer.
6. Show the checkout's independent “Payment verified” confirmation.
7. Demonstrate the verifier's rejection rules with the documented regression and negative-path suites.
8. Demonstrate the Assistant's read-only workspace summaries and job/payment lookups.
9. Revoke a separate share link and confirm the old link is no longer usable. See [HACKATHON.md](./HACKATHON.md) and [the NEAR payment integration plan](./docs/near-payment-integration-plan.md).

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
