# Taskora — NEAR Hackathon Build Plan

## Product
Taskora helps freelancers and small businesses organise client jobs and request payment for completed work. The hackathon goal is a simple, verifiable workflow rather than a broad business-management suite.

## Implemented frontend milestones
- [x] Responsive dashboard preview.
- [x] Create and list jobs in the browser.
- [x] Mark an active job as completed.
- [x] Prepare a payment request from a completed job.
- [x] Generate a client-facing demo URL.
- [x] Display request details on a client page.
- [x] Clearly disclose that the demo cannot collect payments.

## Implemented backend foundation
- [x] Create a dedicated Taskora Supabase project.
- [x] Deploy profiles, clients, jobs and payment_requests tables.
- [x] Enable Row Level Security on all four tables.
- [x] Add owner-only policies for authenticated users.
- [x] Add automatic profile creation on Auth user signup.
- [x] Add typed Supabase browser and server client helpers.
- [x] Add an environment-variable template without secrets.

## Remaining milestones
- [ ] Finish authentication UI, email verification and sign-out.
- [ ] Protect dashboard routes and verify sessions server-side.
- [ ] Replace browser-local job data with authenticated Supabase CRUD.
- [ ] Replace URL-carried request details with secure, token-hash-based client access.
- [ ] Connect an AI service to help structure provider-supplied work details.
- [ ] Select and implement an appropriate NEAR testnet payment primitive.
- [ ] Verify transaction status from authoritative chain data.
- [ ] Add payment loading, error and retry states.
- [ ] Prepare a deterministic judge walkthrough and demo recording.

## NEAR integration principle
NEAR must be part of the actual payment experience, not merely mentioned in the interface. The appropriate supported NEAR payment primitive will be selected and validated as the flow is implemented. A frontend button or client-side state is not proof of payment.

## Current demo limitations
The dashboard still uses browser-local sample data. Authentication UI and protected routes are not complete. Payment request records are private to the owner; there is no secure public client-link endpoint yet. AI service integration, wallet connection and NEAR payments are not implemented. The client page does not accept funds.

## Intended judge walkthrough
1. Sign in to Taskora.
2. Create a job for a demo client and agreed amount.
3. Mark the work complete.
4. Prepare a payment request and share its secure link.
5. Open the client-facing page and inspect the request details.
6. Once NEAR integration is implemented, complete the testnet payment and show the verified transaction reference and updated status.
