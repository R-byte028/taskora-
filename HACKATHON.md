# Taskora — NEAR Hackathon Build Plan

## Product
Taskora helps freelancers and small businesses organise client jobs and request payment for completed work. The goal is a small, verifiable workflow rather than a broad business-management suite.

## Implemented frontend
- [x] Responsive dashboard.
- [x] Account sign-up and sign-in screens.
- [x] Email confirmation callback.
- [x] Protected workspace routes and sign-out.
- [x] Create and list jobs.
- [x] Mark jobs complete.
- [x] Prepare and save payment request drafts.
- [x] Clear disclosure that no payments are collected.

## Implemented backend
- [x] Dedicated Taskora Supabase project.
- [x] Profiles, clients, jobs and payment_requests tables.
- [x] Row Level Security on all four tables.
- [x] Owner-only policies for authenticated users.
- [x] Automatic profile creation on Auth signup.
- [x] Typed Supabase browser and server clients.
- [x] Persistent client and job CRUD path from the dashboard.
- [x] Persistent payment request draft creation.
- [x] Security advisor check with no current findings.

## Remaining milestones
- [ ] Test full sign-up, email confirmation, sign-in and sign-out in a running browser.
- [ ] Add edit/delete flows for clients and jobs.
- [x] Implement secure token-hash-based client request links and a limited public request view in the application code.
- [x] Apply the secure-sharing database migration to the Taskora Supabase project.
- [ ] Live-test authenticated token creation, expiry and invalid-link handling.
- [ ] Add provider-side payment request management and lifecycle controls.
- [ ] Connect an AI service to help structure provider-supplied work details.
- [ ] Select and implement an appropriate NEAR testnet payment primitive.
- [ ] Verify transaction status from authoritative chain data.
- [ ] Add payment loading, error and retry states.
- [ ] Prepare a deterministic judge walkthrough and demo recording.

## NEAR integration principle
NEAR must be part of the actual payment experience, not merely mentioned in the interface. The appropriate supported NEAR payment primitive will be selected and validated as the flow is implemented. A frontend button or client-side state is not proof of payment.

## Current limitations
The code has been committed, but a production build and live browser test have not yet been run. Secure public client-link code is committed and its database migration is applied. The flow has not yet been live-tested. AI integration, wallet connection and NEAR payments are not implemented. The client page does not collect funds.

## Intended judge walkthrough
1. Create an account and confirm the email.
2. Sign in to the private Taskora workspace.
3. Create a job for a demo client and agreed amount.
4. Mark the work complete.
5. Save a payment request draft.
6. Once secure sharing and NEAR integration are implemented, open the client link, complete a testnet payment and show the verified transaction reference and updated status.
