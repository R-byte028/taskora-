# Taskora — NEAR Hackathon Build Plan

## Product

Taskora is a crypto-first job-to-payment assistant for freelancers and small businesses. It organises client work, prepares secure crypto payment requests and is being built around the NEAR ecosystem.

**Currency rule:** USDC is the default USD-pegged crypto denomination. NEAR is also supported as a native asset. No fiat currency is accepted for new jobs, invoices or payment requests. Totals for different assets are never combined.

## Implemented frontend

- [x] Responsive overview dashboard.
- [x] Collapsible desktop sidebar and mobile navigation drawer.
- [x] Dedicated Overview, My Jobs, My Payments, Invoices and Assistant workspace views.
- [x] Guided assistant preview reads live workspace records and routes users to relevant job/payment workflows.
- [x] Crypto-denominated job creation using USDC or NEAR.
- [x] Separate USDC and NEAR value display.
- [x] Account sign-up, sign-in and email confirmation callback.
- [x] Protected workspace routes and sign-out.
- [x] Create crypto-denominated jobs and track their lifecycle.
- [x] Confirm job completion explicitly before changing its status; completion is kept separate from payment confirmation.
- [x] Manage job milestones and checklist items with progress tracking.
- [x] Record dated work updates and attach private work evidence (images, PDF or text files).
- [x] Prevent duplicate payment requests for the same job.
- [x] Prepare and save crypto payment requests for completed jobs.
- [x] Generate secure client share links and retry saved drafts.
- [x] Review requests and revoke active client links.
- [x] Clear disclosure that wallet payment collection is not live.

## Implemented backend

- [x] Dedicated Taskora Supabase project.
- [x] Profiles, clients, jobs and payment_requests tables.
- [x] Row Level Security and owner-only policies.
- [x] Automatic profile creation on Auth signup.
- [x] Typed Supabase browser and server clients.
- [x] Persistent job and payment-request workflows.
- [x] Secure token-hash-based public request links and revocation.
- [x] Crypto-only database currency constraints: USDC and NEAR, with USDC default.

## Remaining milestones

- [ ] Test sign-up, email confirmation, sign-in and sign-out in a running browser.
- [ ] Add edit/delete flows for clients and jobs.
- [ ] Live-test secure link creation, sharing, revocation, expiry and invalid-link handling.
- [ ] Connect an AI service/agent runtime to interpret natural-language requests and safely orchestrate approved Taskora actions.
- [ ] Integrate a NEAR-compatible wallet connector.
- [ ] Implement and verify native NEAR testnet transfers.
- [ ] Confirm the exact USDC token contract and network deployment before enabling USDC transfers.
- [ ] Verify transaction status from authoritative chain data.
- [ ] Add payment loading, error and retry states.
- [ ] Prepare a deterministic judge walkthrough and demo recording.

## NEAR integration principle

NEAR must be part of the actual payment experience, not merely mentioned in the interface. A frontend button or client-side state is not proof of payment. The backend must verify the final transaction, asset, recipient and exact amount before marking a request paid.

## Current limitations

The crypto-first dashboard, milestone/checklist workflow, work-evidence timeline, explicit job-completion confirmation, secure payment-request links and NEAR testnet checkout/verifier code are committed. The NEAR checkout has not yet been confirmed through a complete live-wallet test against the deployed backend. The assistant is currently rule-based and is not yet an AI model/agent integration. USDC settlement is not enabled. Do not treat a submitted transaction as paid until the server-side verifier confirms final execution.

## Intended judge walkthrough

1. Create an account and sign in to the private Taskora workspace.
2. Create a job and select USDC or NEAR.
3. Mark the work complete.
4. Add a milestone, checklist item and work-progress note; attach a small evidence file and confirm it appears in the job history.
5. Confirm job completion, then create a secure NEAR payment-request link and open it in a separate browser session.
6. Connect a NEAR testnet wallet, approve the exact transfer and verify the transaction. Expected result: Taskora shows paid only after server-side finality and amount/recipient/signer checks succeed.
7. Revoke a separate active request link and confirm the old link becomes unavailable.


## Judge-ready demo acceptance checks

| Demo action | Expected result |
| --- | --- |
| Sign in and create a NEAR job | The job appears in My Jobs with its NEAR amount clearly labelled. |
| Add milestones and checklist items | The job shows the saved milestones and checklist progress after refresh. |
| Add a progress note and evidence file | The update appears in the job timeline; the attachment opens only through its signed link. |
| Confirm job completion | A confirmation step is required; the job moves to completed only after explicit acknowledgement. |
| Create a payment request | A private expiring link is generated; a second request for the same job is blocked. |
| Open the link as the client | The client sees the amount, work summary, destination and NEAR testnet disclosure. |
| Submit a valid testnet transfer | The request becomes paid only after server-side final transaction verification. |
| Submit a mismatched or reused transaction | Verification rejects it; the request is not marked paid. |
| Revoke the share link | The previously issued link no longer reveals the request. |

A live wallet demonstration is a release gate: do not record a successful payment demo until the deployed Edge Function, database functions and NEAR testnet RPC verification have all been exercised end to end.
