# Taskora — NEAR Hackathon Build Plan

## Product
Taskora helps freelancers and small businesses organise jobs and request payment for completed work. The hackathon goal is a simple, verifiable workflow rather than a broad business-management suite.

## Planned end-to-end flow
1. A provider records a client job and agreed amount.
2. The provider marks the work complete.
3. Taskora helps prepare a structured payment request.
4. The client reviews the request on a shareable page.
5. The client completes a supported NEAR payment flow.
6. Taskora verifies authoritative transaction data before marking the request paid.

## Milestones
- [x] Responsive dashboard preview.
- [x] Local create-job interaction using sample state.
- [ ] Authentication and persistent job records.
- [ ] Assistant to structure payment request details.
- [ ] Client-facing shareable payment page.
- [ ] NEAR testnet payment integration.
- [ ] Transaction verification and payment status updates.
- [ ] Error, loading and retry states.
- [ ] Deterministic judge walkthrough and demo recording.

## NEAR integration principle
NEAR must be part of the actual payment experience, not merely mentioned in the interface. The appropriate supported NEAR payment primitive will be selected and validated as the flow is implemented. A frontend button or client-side state is not proof of payment.

## Current demo limitations
This first frontend preview uses local sample data. Authentication, database persistence, AI assistance, wallet connection and NEAR payments are not implemented. No real payments are processed.