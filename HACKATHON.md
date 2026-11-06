# Taskora — NEAR Hackathon Build Plan

## Product

Taskora is a crypto-first workspace for freelancers and small businesses to record externally obtained client jobs, track delivery, confirm completion and prepare secure payment requests. It is not a job marketplace.

**Settlement boundary:** the current payment flow is NEAR testnet only. Mainnet and USDC settlement are not enabled. Do not use real funds or describe this build as ready to collect real payments.

## Implemented frontend

- [x] Responsive overview dashboard, desktop sidebar and mobile navigation.
- [x] Overview, My Jobs, My Payments, Invoices, Assistant and Settings views.
- [x] Sign-up/sign-in flow, email confirmation and protected workspace.
- [x] Create jobs and track their lifecycle.
- [x] Explicit job-completion confirmation, separate from payment status.
- [x] Milestones and checklist items with progress tracking.
- [x] Dated work updates and private work-evidence attachments.
- [x] Secure client payment-request links, draft retry, revocation and owner-only link recopy.
- [x] Completed-job amount editing, guarded by an atomic database operation.
- [x] NEAR testnet wallet-connect and checkout UI.
- [x] Assistant page and persistent conversation history (AI Gateway responses deferred).

## Implemented backend

- [x] Supabase profiles, clients, jobs, milestones, checklist items, work updates and payment requests.
- [x] Row Level Security and owner-only data access across all public tables.
- [x] Private work-evidence storage with owner/job-scoped policies.
- [x] Secure token-hash-based public payment links.
- [x] Public checkout RPCs with share-token validation and minimal response fields.
- [x] NEAR testnet verification Edge Function, deployed as version 6.
- [x] Final-execution, signer, recipient, action and exact-amount checks before payment finalization.
- [x] Duplicate transaction protection and atomic payment finalization.
- [x] Atomic completed-job amount update RPC.
- [x] Payment-request insert/update privileges restricted so clients cannot set paid status or settlement fields directly.
- [x] Share-token persistence and revocation performed atomically inside owner-checked database functions.
- [x] Raw owner tokens excluded from direct table reads; recopy uses an owner-only RPC that rejects expired or revoked links.
- [x] Foreign-key covering indexes for ownership relationships and joins.
- [x] Persistent Assistant conversations and messages with owner-scoped RLS.

## Verification completed

- [x] NEAR verifier mock regression suite: 18 tests passed.
- [x] Live Edge Function negative-path smoke suite: 7 tests passed using synthetic invalid data only.
- [x] Latest GitHub Actions run passed TypeScript checking and the Next.js production build.
- [x] Latest Vercel preview deployment completed successfully.
- [x] Supabase has 20 applied migrations.
- [x] Database security review confirmed RLS on all public tables and private work-evidence storage.
- [x] Authenticated RLS isolation check with a synthetic second-user identity returned zero rows across user-owned data tables.
- [x] Database permission checks confirmed authenticated clients cannot directly set payment status or settlement fields.
- [x] Share/revoke lifecycle regression checks passed using temporary fixtures inside rolled-back transactions.
- [x] A NEAR testnet payment was independently verified and recorded in Supabase as paid with FINAL execution; stored amount and recipient match the payment request.

## Deferred, not a release blocker

- [ ] Vercel AI Gateway authentication and live AI responses. The Assistant page and conversation history remain, but AI responses are deliberately deferred. Do not present the Assistant as an active AI feature in the demo.

## Remaining release checks

- [ ] Browser-test the latest preview for draft creation, link sharing, recopy without re-sharing, revocation and invalid/expired-link handling.
- [ ] Browser-test milestones, checklists, progress notes and evidence upload/download.
- [ ] Complete the judge walkthrough, screenshots and demo recording.
- [ ] Keep USDC settlement and mainnet disabled unless a separate supported network/asset review is completed.

## NEAR integration principle

A wallet connection or client-side success message is never proof of payment. The backend independently verifies final transaction execution, signer, recipient, asset/action and exact amount before a request can be marked paid.

## Assistant safety principle

The Assistant is not part of the active release path. When AI Gateway is configured in a future iteration, it must remain read-only: it may retrieve a signed-in user's workspace summary, jobs and payment requests, but it must not create or modify records, issue or revoke links, transfer assets or mark a request paid.

## Judge walkthrough

1. Sign in to the Taskora workspace.
2. Create a client job and record its agreed amount.
3. Add milestones and checklist items, then record progress and evidence.
4. Confirm completion and prepare a payment request.
5. Open the client-facing request page and review the amount, destination and testnet disclosure.
6. Demonstrate the completed testnet payment record and the checkout's independent verification result.
7. Demonstrate verifier rejection rules with deterministic mock fixtures and the live negative-path smoke suite.
8. Recopy an existing share link without replacing it, then revoke a separate link and confirm the old link is no longer usable.

## Judge-ready acceptance checks

| Demo action | Expected result |
| --- | --- |
| Create a job | It appears in My Jobs with its denomination clearly labelled. |
| Add milestones/checklist items | Saved progress remains after refresh. |
| Add a work update and evidence | The update appears in job history; evidence remains private. |
| Confirm job completion | Explicit acknowledgement is required; completion does not imply payment. |
| Edit a completed job amount | The atomic operation updates the job and draft requests together, or rejects the change if a request is already shared/paid. |
| Create a payment request | A secure share link is generated; duplicate requests are blocked. |
| Copy an existing link | The same active link is returned; it is not silently replaced. |
| Open a client link | The client sees the request and testnet-only disclosure. |
| Run verifier regression tests | Valid fixtures pass; malformed, pending, mismatched and duplicate cases are rejected. |
| Revoke a share link | The previously issued link no longer reveals the request. |

**Release gate:** the NEAR testnet payment flow has been verified end to end. Complete the final browser walkthrough and demo evidence before submitting. Mainnet and real-fund collection remain out of scope.
