import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  // Keep this public endpoint's input bounded before parsing or contacting upstream services.
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > 8_192) return json({ error: "Request is too large." }, 413);
  if (!req.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return json({ error: "Content-Type must be application/json." }, 415);
  }

  try {
    const rawBody = await req.text();
    if (rawBody.length > 8_192) return json({ error: "Request is too large." }, 413);

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return json({ error: "Invalid JSON request body." }, 400);
    }

    const { token, transactionHash, signerAccountId } = body;
    if (
      typeof token !== "string" || !/^[A-Za-z0-9_-]{40,128}$/.test(token) ||
      typeof transactionHash !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{40,50}$/.test(transactionHash) ||
      typeof signerAccountId !== "string" || !/^[a-z0-9._-]{2,64}$/.test(signerAccountId)
    ) return json({ error: "Invalid payment verification details." }, 400);

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return json({ error: "Payment verification is temporarily unavailable." }, 503);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: contexts, error: contextError } = await admin.rpc("get_near_payment_verification_context", { p_token: token });
    if (contextError) throw contextError;
    const context = contexts?.[0];
    if (!context) return json({ error: "This payment request is invalid, expired or revoked." }, 404);

    let rpc: Response;
    try {
      rpc = await fetch("https://rpc.testnet.near.org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "taskora-payment-verifier",
          method: "EXPERIMENTAL_tx_status",
          params: [transactionHash, signerAccountId, "FINAL"],
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      return json({ status: "pending", message: "The network verifier is temporarily unavailable. Try again shortly." }, 202);
    }

    let payload: Record<string, any>;
    try {
      payload = await rpc.json();
    } catch {
      return json({ status: "pending", message: "The network verifier returned an unreadable response. Try again shortly." }, 202);
    }

    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload) ||
      !rpc.ok ||
      payload.error ||
      !payload.result
    ) {
      return json({ status: "pending", message: "The transaction is not yet available at finality. Try again shortly." }, 202);
    }

    const result = payload.result;
    const transaction = result.transaction;
    const status = result.status;
    // FINAL returns the final execution result across the transaction and its receipts.
    // SuccessReceiptId is an intermediate receipt hand-off, not proof that payment settled.
    const successful = status && Object.prototype.hasOwnProperty.call(status, "SuccessValue");
    if (!transaction || !successful) {
      return json({ error: "The NEAR transaction did not complete successfully at finality." }, 400);
    }
    if (transaction.hash !== transactionHash) {
      return json({ error: "The NEAR node returned a different transaction hash." }, 400);
    }

    const transfer = transaction.actions?.length === 1 ? transaction.actions[0]?.Transfer : null;
    if (
      transaction.signer_id !== signerAccountId ||
      transaction.receiver_id !== context.recipient_account_id ||
      !transfer ||
      String(transfer.deposit) !== String(context.amount_atomic)
    ) return json({ error: "The confirmed transaction does not match this request's payer, recipient or exact amount." }, 400);

    const { data: eventId, error: finalizeError } = await admin.rpc("finalize_near_payment", {
      p_payment_request_id: context.payment_request_id,
      p_transaction_hash: transactionHash,
      p_signer_account_id: transaction.signer_id,
      p_receiver_account_id: transaction.receiver_id,
      p_amount_atomic: String(transfer.deposit),
      p_verification_evidence: {
        network: "testnet",
        finality: "FINAL",
        blockHash: result.transaction_outcome?.block_hash ?? null,
        blockHeight: result.transaction_outcome?.block_height ?? null,
        verifiedBy: "taskora-near-payment-verifier",
      },
      p_token: token,
    });
    if (finalizeError) {
      if (finalizeError.code === "23505") return json({ error: "This transaction has already been used." }, 409);
      throw finalizeError;
    }

    return json({ status: "paid", eventId, transactionHash, network: "testnet", asset: "NEAR" });
  } catch (error) {
    console.error("NEAR payment verification failed:", error);
    return json({ error: "Unable to verify this transaction right now. Please try again." }, 500);
  }
});
