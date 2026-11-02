# Taskora NEAR Payment Integration Plan

**Status: architecture proposal — wallet settlement is not implemented.**

## Product currency model

Taskora is crypto-only. It does not accept fiat-denominated jobs, invoices or payments.

- **USDC** is the default job and payment-request denomination. It represents crypto dollars through a USD-pegged token.
- **NEAR** is supported as the native NEAR asset.
- The dashboard keeps USDC and NEAR totals separate. It must never add values from different assets together.
- The database accepts only USDC and NEAR for new job and payment-request records.
- Historical fiat records, if any exist, must be recreated with a crypto amount. They must never be silently relabelled or converted.

USDC is a token asset, not the native NEAR coin. Before enabling USDC settlement, identify and verify the exact NEAR token contract and network deployment. Do not invent a contract address or assume a testnet token is available.

## Recommended integration sequence

1. Keep the current secure payment-request link and crypto-only job workflow.
2. Implement a native NEAR testnet transfer as the first end-to-end chain proof.
3. Add USDC on NEAR only after confirming the supported token contract, testnet availability, wallet support, and correct NEP-141 transfer and verification behaviour.
4. Do not introduce cross-chain swaps or NEAR Intents until the basic payment lifecycle is reliable.

For wallet connection, evaluate `@hot-labs/near-connect`. The NEAR Wallet Selector repository currently recommends exploring HOT Connect; keep the connector behind a small Taskora adapter so it can be replaced if needed.

References:
- [NEAR Wallet Selector recommendation](https://github.com/near/wallet-selector#readme)
- [NEAR Connect documentation](https://github.com/azbang/near-connect#readme)
- [NEAR transaction status RPC](https://docs.fastnear.com/tx/examples)

## Proposed payment flow

1. Provider completes a job and creates a payment request in USDC or NEAR.
2. The request records the exact asset, network, amount, receiving account or token contract, expiry and unique reference.
3. Client opens the existing secure request link and reviews the amount and destination.
4. Client connects a compatible wallet and explicitly approves the matching on-chain transfer.
5. Client submits the transaction hash. This is only a **payment submitted** state, not proof of payment.
6. A server-side verifier checks final execution and validates network, sender, recipient, asset, exact amount, request expiry and unique transaction use.
7. Only the server-side verifier may mark the request paid. Store the transaction hash and verification evidence as an immutable payment event.
8. Dashboard confirmed-payment totals update only from verified payment events, grouped by asset.

## Data model additions to consider

- Provider profile: validated receiving NEAR account ID and preferred network.
- Payment request: settlement network, asset identifier, token contract when applicable, exact amount in smallest units, recipient and payment-intent expiry.
- Payment event: request ID, unique transaction hash, sender, receiver, asset, amount, network, execution/finality status and verified timestamp.

Use database constraints and an atomic server-side function to prevent duplicate transaction crediting. The browser must never be allowed to set a payment request to `paid` directly.

## Security and reliability rules

- Never store wallet private keys or ask clients to share them.
- Never trust a browser success screen or client-supplied transaction details as proof of payment.
- Never expose Supabase service-role credentials in browser code.
- Treat pending, failed, expired and verified payments as separate states.
- Make verification idempotent.
- Keep secure share-token hashing, expiry and revocation.
- Do not enable real-fund collection until testnet verification, failure handling and end-to-end tests pass.

## Why not NEAR Intents first?

NEAR Intents/1Click is a strong later option for multi-asset and cross-chain settlement, but it is not the simplest first testnet payment path. Revisit it after native NEAR payment verification works.

## Decisions before production

- Confirm the NEAR testnet receiving account for the provider demo.
- Confirm the exact USDC token contract and network availability before implementing USDC transfers.
- Decide whether additional NEP-141 assets should be supported after the first demo.

Until these are validated, keep payment collection disabled and do not display a fake Pay button.
