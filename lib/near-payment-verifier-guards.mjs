/**
 * Pure guards shared by the NEAR payment verifier and its regression tests.
 * No network calls, wallet access, or database writes belong in this module.
 */
export function buildNearTransactionStatusParams(transactionHash, signerAccountId) {
  return {
    tx_hash: transactionHash,
    sender_account_id: signerAccountId,
    wait_until: "FINAL",
  };
}

export function hasValidPaymentContext(context) {
  return Boolean(context && context.payment_request_id && context.recipient_account_id && context.amount_atomic != null);
}

export function isFinalSuccessfulExecution(result) {
  return Boolean(
    result &&
    result.transaction &&
    result.status &&
    Object.prototype.hasOwnProperty.call(result.status, "SuccessValue")
  );
}

export function matchesRequestedTransfer({ transaction, transactionHash, signerAccountId, context }) {
  if (!transaction || !context) return false;
  if (transaction.hash !== transactionHash) return false;
  if (transaction.signer_id !== signerAccountId) return false;
  if (transaction.receiver_id !== context.recipient_account_id) return false;

  const actions = transaction.actions;
  if (!Array.isArray(actions) || actions.length !== 1) return false;

  const transfer = actions[0]?.Transfer;
  return Boolean(
    transfer &&
    String(transfer.deposit) === String(context.amount_atomic)
  );
}

export function isDuplicateTransactionError(error) {
  return error?.code === "23505";
}
