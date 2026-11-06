import {
  hasValidPaymentContext,
  isFinalSuccessfulExecution,
  matchesRequestedTransfer,
  isDuplicateTransactionError,
} from "./guards.mjs";

const pending = (message) => ({
  status: 202,
  body: { status: "pending", message },
});

export async function verifyNearPayment({
  transactionHash,
  signerAccountId,
  lookupContext,
  fetchTransaction,
  finalizePayment,
}) {
  const context = await lookupContext();
  if (!hasValidPaymentContext(context)) {
    return {
      status: 404,
      body: { error: "This payment request is invalid, expired or revoked." },
    };
  }

  let networkResponse;
  try {
    networkResponse = await fetchTransaction();
  } catch {
    return pending("The network verifier is temporarily unavailable. Try again shortly.");
  }

  if (!networkResponse || !networkResponse.readable || !networkResponse.ok ||
      networkResponse.payload?.error || !networkResponse.payload?.result) {
    return pending("The transaction is not yet available at finality. Try again shortly.");
  }

  const result = networkResponse.payload.result;
  const transaction = result.transaction;
  if (!isFinalSuccessfulExecution(result)) {
    return {
      status: 400,
      body: { error: "The NEAR transaction did not complete successfully at finality." },
    };
  }

  if (transaction.hash !== transactionHash) {
    return {
      status: 400,
      body: { error: "The NEAR node returned a different transaction hash." },
    };
  }

  if (!matchesRequestedTransfer({
    transaction,
    transactionHash,
    signerAccountId,
    context,
  })) {
    return {
      status: 400,
      body: { error: "The confirmed transaction does not match this request's payer, recipient or exact amount." },
    };
  }

  const transfer = transaction.actions[0].Transfer;
  const finalized = await finalizePayment({ context, transaction, result, transfer });
  if (finalized?.error) {
    if (isDuplicateTransactionError(finalized.error)) {
      return { status: 409, body: { error: "This transaction has already been used." } };
    }
    throw finalized.error;
  }

  return {
    status: 200,
    body: {
      status: "paid",
      eventId: finalized?.data ?? null,
      transactionHash,
      network: "testnet",
      asset: "NEAR",
    },
  };
}
