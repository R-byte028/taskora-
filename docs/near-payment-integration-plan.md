# Taskora NEAR Payment Integration Plan

**Status: architecture proposal — not implemented.**

## Recommended first integration

Start with a direct native NEAR transfer on **testnet**. It is the smallest end-to-end path for proving a real wallet-signed transaction and independent on-chain verification. Do not add a smart contract or cross-chain swap layer until the basic payment lifecycle is reliable.

For wallet connection, evaluate `@hot-labs/near-connect`. The NEAR Wallet Selector repository currently recommends exploring HOT Connect as its preferred connector; NEAR Connect provides sandboxed wallet integrations and can filter wallets by the `testnet` feature. Keep the connector behind a small Taskora adapter so it can be replaced if needed.

References:
- [NEAR Wallet Selector recommendation](https://github.com/near/wallet-selector#readme)
- [NEAR Connect documentation](https://github.com/azbang/near-connect#readme)
- [NEAR transaction status RPC](https://docs.fastnear.com/tx/examples)

## Important currency decision

Taskora currently records job values in NGN. A native NEAR transfer must have an exact NEAR-denominated amount. **Do not silently treat ₦ amounts as NEAR or invent an exchange rate.**

For a testnet demo, the cleanest approach is to store a separate testnet payment amount in NEAR (or yoctoNEAR) on each payment request. The provider explicitly chooses that amount for the demo. The original NGN job value remains unchanged and is clearly labelled as the agreed business amount, not the amount being transferred on-chain.

Before production, decide whether to:
1. keep the invoice and settlement amounts separate with an explicit, timestamped FX quote; or
2. let providers issue invoices directly in a supported on-chain asset.

## Proposed payment flow

1. Provider completes a job and creates a payment request.
2. Provider chooses/sets the testnet NEAR amount and configures their receiving NEAR account.
3. Taskora creates a payment intent tied to the payment request. The intent records the network, asset, recipient, exact yoctoNEAR amount, expiry and a unique reference.
4. Client opens the existing secure request link, reviews the amount and recipient, connects a testnet wallet and explicitly approves the transfer.
5. Client returns or submits the transaction hash. This is only a **payment submitted** state, not proof of payment.
6. A server-side verifier queries the NEAR testnet RPC using the transaction hash and sender account ID. It must wait for final execution and validate:
   - transaction execution succeeded;
   - receiver account matches the stored recipient;
   - the transaction contains the expected native Transfer action and exact yoctoNEAR amount;
   - network is testnet;
   - the payment intent is still valid and belongs to this request;
   - the transaction hash has not already been credited to another request.
7. Only the server-side verifier may mark the request paid. Store the transaction hash, sender, recipient, amount, network and verification time as an immutable payment event.
8. The dashboard updates confirmed earnings only from verified payment events.

## Data model additions to consider

- Provider profile: optional validated NEAR account ID and preferred network.
- Payment request: settlement network, asset identifier, exact settlement amount in smallest units, recipient account ID and payment-intent expiry.
- Payment event: payment request ID, transaction hash (unique), sender, receiver, amount, network, execution status, finality status and verified timestamp.

Use database constraints and an atomic server-side function to prevent duplicate transaction crediting and conflicting status changes. The browser must never be allowed to set a payment request to `paid` directly.

## Security and reliability rules

- Never store a wallet private key or ask clients to share one.
- Never trust a browser success screen, callback URL or client-supplied transaction details as proof of payment.
- Never expose Supabase service-role credentials in browser code.
- Treat pending, failed, expired and verified payments as separate states.
- Make verification idempotent: retrying the same transaction hash must not create a second payment.
- Keep the existing secure share-token hashing, expiry and revocation rules.
- Do not enable real-fund collection until testnet verification, failure handling and end-to-end tests pass.

## Why not NEAR Intents first?

NEAR Intents/1Click is a strong later option for multi-asset and cross-chain settlement, but current integration references describe the 1Click production flow as mainnet-only. It is therefore not the simplest first testnet payment path. Revisit it after native NEAR payment verification works.

## Decisions required before implementation

- Should the first demo payment amount be entered separately in NEAR, while the existing NGN job amount remains informational?
- Which testnet receiving account should be used for the provider demo?
- Should the first release support native NEAR only, with other assets deferred?

Until these are decided, keep payment collection disabled and do not display a fake Pay button.
