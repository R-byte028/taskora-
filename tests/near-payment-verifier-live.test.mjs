import test from "node:test";
import assert from "node:assert/strict";

const endpoint =
  process.env.TASKORA_VERIFIER_URL ??
  "https://basqoozudxgomnccrnub.supabase.co/functions/v1/verify-near-payment";

async function request(options = {}) {
  const response = await fetch(endpoint, {
    ...options,
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Keep the raw response available for a useful assertion failure.
  }
  return { response, body, text };
}

test("live verifier rejects unsupported methods", async () => {
  const { response, body } = await request();
  assert.equal(response.status, 405);
  assert.match(body?.error ?? "", /method not allowed/i);
});

test("live verifier rejects non-JSON requests", async () => {
  const { response, body } = await request({
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "{}",
  });
  assert.equal(response.status, 415);
  assert.match(body?.error ?? "", /content-type/i);
});

test("live verifier rejects malformed JSON", async () => {
  const { response, body } = await request({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not-json",
  });
  assert.equal(response.status, 400);
  assert.match(body?.error ?? "", /invalid json/i);
});

test("live verifier rejects malformed verification fields", async () => {
  const { response, body } = await request({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: "x",
      transactionHash: "x",
      signerAccountId: "x",
    }),
  });
  assert.equal(response.status, 400);
  assert.match(body?.error ?? "", /invalid payment verification details/i);
});


test("live verifier rejects a JSON null request body", async () => {
  const { response, body } = await request({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "null",
  });
  assert.equal(response.status, 400);
  assert.match(body?.error ?? "", /invalid payment verification details/i);
});

test("live verifier rejects a JSON array request body", async () => {
  const { response, body } = await request({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "[]",
  });
  assert.equal(response.status, 400);
  assert.match(body?.error ?? "", /invalid payment verification details/i);
});

test("live verifier rejects an unknown synthetic payment token", async () => {
  const { response, body } = await request({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: "A".repeat(43),
      transactionHash: "1".repeat(44),
      signerAccountId: "synthetic-payer.testnet",
    }),
  });
  assert.equal(response.status, 404);
  assert.match(body?.error ?? "", /invalid, expired or revoked/i);
});
