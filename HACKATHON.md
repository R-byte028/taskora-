# Taskora — NEAR Hackathon Build Plan

## Product

Taskora is a crypto-first workspace for freelancers and small businesses to record externally obtained client jobs, track delivery, confirm completion and prepare secure payment requests. It is not a job marketplace.

**Settlement boundary:** the current payment flow is NEAR testnet only. Mainnet and USDC settlement are not enabled. Do not use real funds or describe this build as ready to collect real payments.

## Implemented frontend

- [x] Responsive overview dashboard, desktop sidebar and mobile navigation.
- [x] Overview, My Jobs, My Payments, Invoices, Assistant and Settings views.
- [x] Sign-up/sign-in flow and protected workspace.
- [x] Create jobs and track their lifecycle.
- [x] Explicit job-completion confirmation, separate from payment status.
- [x] Milestones and checklist items with progress tracking.
- [x] Dated work updates and private work-evidence attachments.
- [x] Secure client payment-request links, draft retry, revocation and owner-only link recopy.
- [x] Completed-job amount editing, guarded by an atomic database operation.
- [x] NEAR testnet wallet-connect and checkout UI.
- [x] Assistant chat interface with persistent conversation history.

## Implemented backend

- [x] Supabase profiles, clients, jobs, milestones, checklist items, work updates and payment requests.
- [x] Row Level Security and owner-only data access across public tables.
- [x] Private work-evidence storage with owner/job-scoped policies.
- [x] Secure token-hash-based public payment links.
- [x] Public checkout RPCs with share-token validation and minimal response fields.
- [x] NEAR testnet verification Edge Function, deployed as version 6.
- [x] Final-execution, signer, recipient, action and exact-amount checks before payment finalization.
- [x] Duplicate transaction protection and atomic payment finalization.
- [x] Atomic completed-job amount update RPC.
- [x] Anonymous direct table access to payment_requests revoked.
- [x] Persistent Assistant conversations and messages with owner-scoped RLS.
- [x] Vercel AI Gateway chat endpoint with bounded input, authenticated workspace access and allow-listed read-only tools.
- [x] Assistant tool access limited to workspace summary, job listing and pending-payment listing; no payment or record mutations.

## Verification completed

- [x] NEAR verifier mock regression suite: 18 tests passed.
- [x] Live Edge Function negative-path smoke suite: 7 tests passed using synthetic invalid data only.
- [x] GitHub Actions TypeScript check and Next.js production build passed for the current feature-branch commit.
- [x] Latest Vercel preview deployment completed successfully.
- [x] Supabase migrations for Assistant history, NEAR settlement, milestones, work updates and secure link controls are applied.
- [x] Database security review confirmed RLS on all public tables, private work-evidence storage and restricted execution of privileged settlement functions.

These checks do not prove a successful end-to-end payment or a successful authenticated AI chat request. The test transaction was confirmed final on NEAR testnet, but the original checkout still needs a fresh verification retry to confirm payment finalization in the database. The AI chat route is implemented and the preview builds, but authenticated runtime verification remains outstanding.

## Remaining work

- [ ] Retry verification from the original testnet checkout page and confirm that the payment request becomes paid.
- [ ] Browser-test sign-up, email confirmation, sign-in and sign-out.
- [ ] Browser-test secure link creation, expiry, revocation, recopy and invalid-link handling.
- [ ] Confirm an authenticated Assistant chat request succeeds through the Vercel AI Gateway and persists in conversation history.
- [ ] Complete the judge walkthrough, screenshots and demo recording.
- [ ] Keep USDC settlement and mainnet disabled unless a separate supported network/asset review is completed.

## NEAR integration principle

A wallet connection or client-side success message is never proof of payment. The backend must independently verify final transaction execution, signer, recipient, asset/action and exact amount before a request can be marked paid.

## Assistant safety principle

The Assistant is a read-only helper. It can retrieve a signed-in user's workspace summary, jobs and shared payment requests. It cannot create or modify records, issue or revoke links, transfer assets or mark a request paid. All state-changing actions remain explicit user actions in the Taskora interface.

## Judge walkthrough

1. Sign in to the Taskora workspace.
2. Create a client job and record its agreed amount.
3. Add milestones and checklist items, then record progress and evidence.
4. Confirm completion and prepare a payment request.
5. Open the client-facing request page and review the amount, destination and testnet disclosure.
6. Demonstrate verifier acceptance and rejection rules with deterministic mock fixtures and the live negative-path smoke suite.
7. Demonstrate the Assistant's read-only job and payment lookups.
8. Revoke a separate share link and confirm that the old link is no longer usable.

Do not stage a successful payment claim until the full wallet-to-database flow has been safely validated.

## Judge-ready acceptance checks

| Demo action | Expected result |
| --- | --- |
| Create a job | It appears in My Jobs with its denomination clearly labelled. |
| Add milestones/checklist items | Saved progress remains after refresh. |
| Add a work update and evidence | The update appears in job history; evidence remains private. |
| Confirm job completion | Explicit acknowledgement is required; completion does not imply payment. |
| Edit a completed job amount | The atomic operation updates the job and draft requests together, or rejects the change if a request is already shared/paid. |
| Create a payment request | A secure share link is generated; duplicate requests are blocked. |
| Open a client link | The client sees request details and the testnet-only disclosure. |
| Run verifier regression tests | Valid fixtures pass; malformed, pending, mismatched and duplicate cases are rejected. |
| Ask the Assistant for workspace data | It uses authenticated read-only tools and stores the conversation privately. |
| Revoke a share link | The previously issued link no longer reveals the request. |

**Release gate:** do not claim successful payment collection or record a successful payment demo until the full integration has been independently reviewed and safely validated. Mainnet and real-fund collection remain out of scope.
