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


// Mock-only endpoint boundary. It uses fixture data and injected stubs; it never
// contacts NEAR RPC, Supabase, or a wallet.
async function runMockVerification({
  contextResult = context,
  rpcResponse = { ok: true, payload: { result: finalResult } },
  finalizeResult = { data: "event-1", error: null },
} = {}) {
  let finalizeCalls = 0;

  if (!hasValidPaymentContext(contextResult)) {
    return { status: 404, finalizeCalls };
  }
  if (!rpcResponse.ok || rpcResponse.unreadable || rpcResponse.payload?.error ||
      !rpcResponse.payload?.result) {
    return { status: 202, finalizeCalls };
  }

  const result = rpcResponse.payload.result;
  if (!isFinalSuccessfulExecution(result)) {
    return { status: 400, finalizeCalls };
  }

  const matches = matchesRequestedTransfer({
    transaction: result.transaction,
    transactionHash: transaction.hash,
    signerAccountId: transaction.signer_id,
    context: contextResult,
  });
  if (!matches) return { status: 400, finalizeCalls };

  finalizeCalls += 1;
  if (finalizeResult.error) {
    return {
      status: isDuplicateTransactionError(finalizeResult.error) ? 409 : 500,
      finalizeCalls,
    };
  }
  return { status: 200, finalizeCalls };
}

test("mock boundary does not finalize an expired, revoked, or unknown share", async () => {
  const result = await runMockVerification({ contextResult: null });
  assert.deepEqual(result, { status: 404, finalizeCalls: 0 });
});

test("mock boundary does not finalize a pending or unreadable RPC result", async () => {
  for (const rpcResponse of [
    { ok: false, payload: null },
    { ok: true, unreadable: true, payload: null },
    { ok: true, payload: { error: { message: "not indexed yet" } } },
  ]) {
    const result = await runMockVerification({ rpcResponse });
    assert.equal(result.status, 202);
    assert.equal(result.finalizeCalls, 0);
  }
});

test("mock boundary does not finalize an incorrect transfer", async () => {
  const result = await runMockVerification({
    rpcResponse: {
      ok: true,
      payload: {
        result: {
          ...finalResult,
          transaction: {
            ...transaction,
            actions: [{ Transfer: { deposit: "123" } }],
          },
        },
      },
    },
  });
  assert.deepEqual(result, { status: 400, finalizeCalls: 0 });
});

test("mock boundary finalizes a matching fixture exactly once", async () => {
  const result = await runMockVerification();
  assert.deepEqual(result, { status: 200, finalizeCalls: 1 });
});

test("mock boundary maps a duplicate database response to conflict", async () => {
  const result = await runMockVerification({
    finalizeResult: { data: null, error: { code: "23505" } },
  });
  assert.deepEqual(result, { status: 409, finalizeCalls: 1 });
});

test("rejects incomplete payment context fields", () => {
  for (const invalidContext of [
    { recipient_account_id: context.recipient_account_id, amount_atomic: context.amount_atomic },
    { payment_request_id: context.payment_request_id, amount_atomic: context.amount_atomic },
    { payment_request_id: context.payment_request_id, recipient_account_id: context.recipient_account_id },
    { ...context, amount_atomic: null },
  ]) {
    assert.equal(hasValidPaymentContext(invalidContext), false);
  }
});

test("rejects malformed or incomplete final RPC execution objects", () => {
  for (const result of [
    null,
    {},
    { status: { SuccessValue: "" } },
    { transaction },
    { transaction: null, status: { SuccessValue: "" } },
  ]) {
    assert.equal(isFinalSuccessfulExecution(result), false);
  }
});

test("rejects missing, empty, or non-transfer action arrays", () => {
  for (const actions of [undefined, [], [{}], [{ FunctionCall: { method_name: "transfer" } }]]) {
    assert.equal(matchesRequestedTransfer({
      transaction: { ...transaction, actions },
      transactionHash: transaction.hash,
      signerAccountId: transaction.signer_id,
      context,
    }), false);
  }
});

test("mock boundary treats malformed RPC payloads as pending and never finalizes", async () => {
  for (const payload of [null, {}, { result: null }, { result: undefined }]) {
    const result = await runMockVerification({ rpcResponse: { ok: true, payload } });
    assert.equal(result.status, 202);
    assert.equal(result.finalizeCalls, 0);
  }
});

test("mock boundary returns a server error for non-duplicate finalization failures", async () => {
  const result = await runMockVerification({
    finalizeResult: { data: null, error: { code: "XX000", message: "database unavailable" } },
  });
  assert.deepEqual(result, { status: 500, finalizeCalls: 1 });
});
