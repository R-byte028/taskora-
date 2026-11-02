# Taskora — NEAR Hackathon Build Plan

## Product

Taskora is a crypto-first job-to-payment assistant for freelancers and small businesses. It organises client work, prepares secure crypto payment requests and is being built around the NEAR ecosystem.

**Currency rule:** USDC is the default USD-pegged crypto denomination. NEAR is also supported as a native asset. No fiat currency is accepted for new jobs, invoices or payment requests. Totals for different assets are never combined.

## Implemented frontend

- [x] Responsive overview dashboard.
- [x] Collapsible desktop sidebar and mobile navigation drawer.
- [x] Dedicated Overview, My Jobs, My Payments and Invoices workspace views.
- [x] Crypto-denominated job creation using USDC or NEAR.
- [x] Separate USDC and NEAR value display.
- [x] Account sign-up, sign-in and email confirmation callback.
- [x] Protected workspace routes and sign-out.
- [x] Create jobs and mark jobs complete.
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
- [ ] Connect an AI service to help structure provider-supplied work details.
- [ ] Integrate a NEAR-compatible wallet connector.
- [ ] Implement and verify native NEAR testnet transfers.
- [ ] Confirm the exact USDC token contract and network deployment before enabling USDC transfers.
- [ ] Verify transaction status from authoritative chain data.
- [ ] Add payment loading, error and retry states.
- [ ] Prepare a deterministic judge walkthrough and demo recording.

## NEAR integration principle

NEAR must be part of the actual payment experience, not merely mentioned in the interface. A frontend button or client-side state is not proof of payment. The backend must verify the final transaction, asset, recipient and exact amount before marking a request paid.

## Current limitations

The crypto-first dashboard and secure payment-request link flow are committed. The crypto-only currency migration is applied. The authenticated flow still needs live browser testing. AI integration, wallet connection and on-chain payments are not implemented. Public request pages do not collect funds.

## Intended judge walkthrough

1. Create an account and sign in to the private Taskora workspace.
2. Create a job and select USDC or NEAR.
3. Mark the work complete.
4. Create a secure crypto payment-request link and open it in a private browser session.
5. Revoke the link from the provider dashboard and confirm the old link becomes unavailable.
6. Once wallet integration is complete, perform a testnet payment and show the verified transaction reference and updated payment status.
