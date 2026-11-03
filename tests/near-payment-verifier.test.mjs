import test from "node:test";
import assert from "node:assert/strict";
import {
  hasValidPaymentContext,
  isFinalSuccessfulExecution,
  matchesRequestedTransfer,
  isDuplicateTransactionError,
} from "../lib/near-payment-verifier-guards.mjs";

const context = {
  payment_request_id: "request-1",
  recipient_account_id: "merchant.testnet",
  amount_atomic: "1000000000000000000000000",
};

const transaction = {
  hash: "11111111111111111111111111111111111111111111",
  signer_id: "payer.testnet",
  receiver_id: "merchant.testnet",
  actions: [{ Transfer: { deposit: "1000000000000000000000000" } }],
};

const finalResult = {
  transaction,
  status: { SuccessValue: "" },
  transaction_outcome: { block_hash: "block-1", block_height: 10 },
};

test("accepts a matching final NEAR transfer", () => {
  assert.equal(hasValidPaymentContext(context), true);
  assert.equal(isFinalSuccessfulExecution(finalResult), true);
  assert.equal(matchesRequestedTransfer({
    transaction,
    transactionHash: transaction.hash,
    signerAccountId: transaction.signer_id,
    context,
  }), true);
});

test("rejects an incorrect amount", () => {
  const wrongAmount = {
    ...transaction,
    actions: [{ Transfer: { deposit: "999" } }],
  };
  assert.equal(matchesRequestedTransfer({
    transaction: wrongAmount,
    transactionHash: transaction.hash,
    signerAccountId: transaction.signer_id,
    context,
  }), false);
});

test("rejects a wrong recipient", () => {
  const wrongRecipient = { ...transaction, receiver_id: "attacker.testnet" };
  assert.equal(matchesRequestedTransfer({
    transaction: wrongRecipient,
    transactionHash: transaction.hash,
    signerAccountId: transaction.signer_id,
    context,
  }), false);
});

test("rejects an expired, revoked, or unknown share when context lookup returns no row", () => {
  // The database RPC deliberately returns no context for expired/revoked tokens.
  assert.equal(hasValidPaymentContext(null), false);
  assert.equal(hasValidPaymentContext([]), false);
});

test("recognises a duplicate transaction constraint violation", () => {
  assert.equal(isDuplicateTransactionError({ code: "23505" }), true);
  assert.equal(isDuplicateTransactionError({ code: "P0001" }), false);
});

test("rejects non-final or intermediate receipt execution results", () => {
  assert.equal(isFinalSuccessfulExecution({
    transaction,
    status: { SuccessReceiptId: "receipt-1" },
  }), false);
  assert.equal(isFinalSuccessfulExecution({
    transaction,
    status: { Failure: {} },
  }), false);
});

test("rejects a mismatched transaction hash, signer, or extra action", () => {
  assert.equal(matchesRequestedTransfer({
    transaction,
    transactionHash: "different-hash",
    signerAccountId: transaction.signer_id,
    context,
  }), false);
  assert.equal(matchesRequestedTransfer({
    transaction,
    transactionHash: transaction.hash,
    signerAccountId: "someone-else.testnet",
    context,
  }), false);
  assert.equal(matchesRequestedTransfer({
    transaction: { ...transaction, actions: [...transaction.actions, { Transfer: { deposit: "1" } }] },
    transactionHash: transaction.hash,
    signerAccountId: transaction.signer_id,
    context,
  }), false);
});
