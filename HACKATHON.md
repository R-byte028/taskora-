# Taskora — NEAR Hackathon Build Plan

## Product
Taskora helps freelancers and small businesses organise client jobs and request payment for completed work. The hackathon goal is a simple, verifiable workflow rather than a broad business-management suite.

## Implemented frontend milestones
- [x] Responsive dashboard preview.
- [x] Create and list jobs in the browser.
- [x] Mark an active job as completed.
- [x] Prepare a payment request from a completed job.
- [x] Generate a client-facing request URL.
- [x] Display request details on a client page.
- [x] Clearly disclose that the demo cannot collect payments.

## Remaining milestones
- [ ] Add authentication and persistent job/request records.
- [ ] Replace URL-carried request details with secure server-backed request IDs.
- [ ] Connect an AI service to help structure provider-supplied work details.
- [ ] Select and implement an appropriate NEAR testnet payment primitive.
- [ ] Verify transaction status from authoritative chain data.
- [ ] Add payment loading, error and retry states.
- [ ] Prepare a deterministic judge walkthrough and demo recording.

## NEAR integration principle
NEAR must be part of the actual payment experience, not merely mentioned in the interface. The appropriate supported NEAR payment primitive will be selected and validated as the flow is implemented. A frontend button or client-side state is not proof of payment.

## Current demo limitations
The dashboard uses browser-local sample data. Request links contain request details in query parameters and are not secure invoices. Authentication, shared database persistence, AI service integration, wallet connection and NEAR payments are not implemented. The client page does not accept funds.

## Intended judge walkthrough
1. Open the Taskora dashboard.
2. Create a job for a demo client and agreed amount.
3. Mark the work complete.
4. Prepare and copy the payment request link.
5. Open the client-facing page and inspect the request details.
6. Once NEAR integration is implemented, complete the testnet payment and show the verified transaction reference and updated status.
