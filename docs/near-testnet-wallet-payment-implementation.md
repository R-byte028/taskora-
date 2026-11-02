# Taskora NEAR Testnet Wallet and Payment Implementation

**Status: implementation blueprint. No wallet signing or payment collection is live yet.**

## Product boundary

Taskora remains a private freelancer workspace and crypto payment assistant. It is not becoming a job marketplace.

The first NEAR integration is a testnet-only native NEAR payment flow. Do not enable mainnet transfers or real-fund collection in this milestone. USDC remains visible as a supported denomination in the workspace, but its payment button stays unavailable until the exact NEP-141 contract, network deployment, and wallet support are verified.

## User journey

### Provider (signed-in Taskora user)

1. Connect an existing NEAR-compatible wallet from Taskora Settings.
2. Taskora stores only the public NEAR account ID and selected network; it never stores wallet keys.
3. Provider creates/completes a job and generates the existing secure payment link.
4. The payment request is bound to the provider's connected NEAR account, testnet network, exact asset and exact amount.
5. Provider can disconnect or change the receiving wallet. Existing requests must keep their originally agreed destination; changing the profile wallet must not silently change an already shared request.

### Client (no Taskora account required)

1. Open the existing secure payment link.
2. Review provider, job, amount, network and receiving account.
3. Connect a compatible wallet.
4. Explicitly approve a native NEAR testnet transfer to the exact request destination.
5. Submit the transaction reference for verification.
6. See a pending state until authoritative NEAR finality and transfer details are verified.

### Server-side verification

A transaction hash supplied by the browser is an untrusted lookup hint, never proof of payment.

The verifier must independently query the NEAR testnet RPC and require all of the following:

- Transaction is found on testnet and reaches FINAL execution status.
- Transaction execution result is successful.
- Transaction signer matches the submitted payer account.
- Transaction receiver matches the recipient saved on the payment request.
- Transaction contains the expected native NEAR Transfer action.
- Transfer deposit equals the exact request amount in yoctoNEAR (integer/string arithmetic only; never floating point).
- Payment request is still shared, valid, unexpired, and not already paid.
- Transaction hash has not already been credited to another request.

Only the server verifier may create the verified payment event and change a request to paid. The client must never update payment status directly.

## Data model work required

- Provider profile: near_account_id, near_network.
- Payment request: immutable settlement_network, asset, recipient_account_id, and exact smallest-unit amount.
- Append-only payment events: request ID, unique transaction hash, payer, recipient, asset, smallest-unit amount, network, finality, verification timestamp and minimal verification evidence.
- Database uniqueness/constraints to prevent one transaction from being applied more than once.
- Public request lookup must return only the minimum fields needed for checkout and must not expose private provider/client data.

The existing payment_requests.status lifecycle and existing public-share RPC must be extended deliberately; do not allow a public client to mark a request paid.

## Implementation order

1. Add the wallet connector behind a small Taskora adapter and support testnet-compatible wallets only.
2. Add provider wallet connection in Settings and persist only the public account ID.
3. Snapshot the provider receiving account and testnet network onto each newly shared payment request.
4. Add a client-side payment component to the existing /pay/[token] page; keep it accessible without a Taskora login.
5. Add a server-side verifier using NEAR testnet RPC finality and exact native-transfer checks.
6. Add an atomic, idempotent database write for verified payment events and request status.
7. Add pending, failed, retry and already-paid UI states.
8. Test on testnet with a small test transfer, replay attempts, wrong recipient, wrong amount, wrong network, expired/revoked links and failed transactions.
9. Keep USDC and mainnet disabled until separately reviewed and tested.

## Security and UX rules

- Never request, store or transmit seed phrases, private keys or wallet passwords.
- Wallet approval must be explicit and show the exact amount, asset, network and recipient.
- Never auto-submit a transaction.
- Do not claim that a wallet connection means a payment was made.
- Do not mark a payment paid based on a wallet callback, redirect, screenshot or client-supplied status.
- Use a server-only Supabase privileged credential only inside a trusted server/Edge Function environment; never place it in a NEXT_PUBLIC_ variable or browser bundle.
- Do not add AI Gateway dependency as part of wallet integration; the existing guided assistant remains separate.
- No escrow or marketplace functionality is introduced by this milestone.

## Current verified baseline

- Existing secure payment request links and revocation are implemented.
- Public request page currently displays payment details but explicitly says wallet collection is not enabled.
- Supabase currently has profiles, clients, jobs, payment_requests, payment_request_shares and assistant tables, all with RLS enabled.
- There is no provider wallet field, immutable payment destination snapshot, payment-event table, wallet connector dependency or transaction verifier yet.
- Current payment request statuses are draft/shared/paid/cancelled.
- Current job/payment currencies are USDC and NEAR, but neither asset is currently collectible through the app.