# Taskora — NEAR Hackathon Build Plan

## Product

Taskora is a crypto-first workspace for freelancers and small businesses to record externally obtained client jobs, track delivery, confirm completion and prepare secure payment requests. It is not a job marketplace.

**Settlement status:** NEAR testnet checkout and server-side verification code are implemented. Mainnet and USDC settlement are not enabled. Do not use real funds or describe this build as ready to collect payments. USDC may appear as a job denomination, but it is not a supported checkout asset.

## Implemented frontend

- [x] Responsive overview dashboard, desktop sidebar and mobile navigation.
- [x] Overview, My Jobs, My Payments, Invoices, Assistant and Settings views.
- [x] Sign-up/sign-in flow and protected workspace.
- [x] Create jobs and track their lifecycle.
- [x] Explicit job-completion confirmation, separate from payment status.
- [x] Milestones and checklist items with progress tracking.
- [x] Dated work updates and private work-evidence attachments.
- [x] Secure client payment-request links, draft retry and link revocation.
- [x] Completed-job amount editing, guarded by a single atomic database operation.
- [x] NEAR testnet wallet-connect and checkout UI.
- [x] Clear testnet-only / not-for-real-funds boundary.

## Implemented backend

- [x] Supabase profiles, clients, jobs and payment_requests.
- [x] Row Level Security and owner-only data access.
- [x] Secure token-hash-based public payment links.
- [x] Public checkout RPCs with share-token validation.
- [x] NEAR testnet verification Edge Function.
- [x] Final-execution, signer, recipient, action and exact-amount checks before payment finalization.
- [x] Duplicate transaction protection and atomic payment finalization.
- [x] Atomic completed-job amount update RPC; rejects changes once a related request is no longer draft.
- [x] Anonymous direct table access to payment_requests revoked.

## Verification completed

- [x] Mock-only verifier regression suite: 17 tests passed in the recorded run.
- [x] Live Edge Function negative-path smoke suite: 5 tests passed in the recorded run. These use synthetic invalid data only and do not submit a transaction.
- [x] Latest Vercel preview for the current feature branch completed successfully.
- [x] Latest preview login route returned HTTP 200.
- [x] Database function metadata and execute grants for the atomic amount-update RPC were checked.

These checks do not prove a successful end-to-end payment. No successful live payment has been demonstrated, and the deployed verifier function may not yet contain every latest source guard.

## Remaining work

- [ ] Browser-test sign-up, email confirmation, sign-in and sign-out.
- [ ] Browser-test secure link creation, expiry, revocation and invalid-link handling.
- [ ] Review public checkout data minimisation and privacy.
- [ ] Reconcile the deployed Edge Function with the latest reviewed source before any release.
- [ ] Add a safe, deterministic demonstration of payment verification that does not require real funds or a real wallet transaction.
- [ ] Connect an actual AI service/agent runtime; the current Assistant is a guided, rule-based workflow preview.
- [ ] Confirm the exact USDC token contract and supported network before considering any future USDC settlement.
- [ ] Prepare final judge walkthrough, screenshots and demo recording.

## NEAR integration principle

A wallet connection or client-side success message is never proof of payment. The backend must independently verify final transaction execution, signer, recipient, asset/action and exact amount before a request can be marked paid.

## Current limitations

The job workflow, milestones/checklists, evidence timeline, completion confirmation, secure payment links, NEAR testnet checkout code and server-side verifier are committed. The mock regression tests and live negative-path HTTP tests pass, but the complete successful payment flow has not been demonstrated. The Assistant is not yet an AI model or autonomous agent. USDC settlement and mainnet are disabled.

## Judge walkthrough

1. Sign in to the Taskora workspace.
2. Create a client job and record its agreed amount.
3. Add milestones and checklist items, then record progress and evidence.
4. Confirm completion and prepare a payment request.
5. Open the client-facing request page and review the amount, destination and testnet disclosure.
6. Demonstrate the verifier's acceptance rules with deterministic mock fixtures and the live negative-path smoke suite. Do not submit a wallet transaction or use real funds.
7. Revoke a separate share link and confirm that the old link is no longer usable.

## Judge-ready acceptance checks

| Demo action | Expected result |
| --- | --- |
| Create a job | It appears in My Jobs with its denomination clearly labelled. |
| Add milestones/checklist items | Saved progress remains after refresh. |
| Add a work update and evidence | The update appears in the job history; evidence remains private. |
| Confirm job completion | Explicit acknowledgement is required; completion does not imply payment. |
| Edit a completed job amount | The atomic operation updates the job and draft requests together, or rejects the change if a request is already shared/paid. |
| Create a payment request | A private share link is generated; duplicate requests are blocked. |
| Open a client link | The client sees the request details and testnet-only disclosure. |
| Run verifier regression tests | Valid fixture rules pass; malformed, pending, mismatched and duplicate cases are rejected. |
| Revoke a share link | The previously issued link no longer reveals the request. |

**Release gate:** do not claim successful payment collection or record a successful payment demo until the full integration has been independently reviewed and safely validated. Mainnet and real-fund collection remain out of scope for this build.
