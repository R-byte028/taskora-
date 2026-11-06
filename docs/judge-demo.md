# Taskora — Judge Demo Pack

## Product pitch

**Taskora is a crypto-first workspace for freelancers and small businesses to manage client work from job tracking through delivery and verified NEAR testnet payment. It is not a job marketplace.**

Freelancers bring clients and jobs they obtained elsewhere. Taskora helps them record the work, organize delivery, prepare a payment request and verify whether the client actually paid.

## Four-minute speaking script

### 0:00–0:30 — Introduce the workspace

“Here is Taskora. It is a freelancer workspace, not a platform for finding jobs. A freelancer records a client and a job they already have, tracks the work, and can request payment through a shareable crypto checkout link.”

Show the dashboard and the My Jobs, My Payments and Invoices areas.

### 0:30–1:15 — Show delivery tracking

“I’ll open a prepared job. The work is broken into milestones and checklist items, so progress is visible instead of being buried in chat messages. The freelancer can also add dated progress notes and attach evidence. Completing a job is a separate action; it does not mean the payment has been received.”

Show the job, milestones, checklist, one progress update and its evidence attachment. Use demo data only.

### 1:15–2:00 — Show the payment request

“Once the work is ready for payment, Taskora creates a payment request. The client can open the link without creating a Taskora account. This build is connected to NEAR testnet only, and the request shows the exact amount and destination.”

Open the existing payment request and client checkout. Point out the testnet-only notice. Do not initiate a new transfer.

### 2:00–2:45 — Explain independent verification

“A wallet success screen or a transaction hash is not enough. The backend independently checks the NEAR testnet transaction, final execution, successful execution, payer, recipient, native NEAR transfer action and exact amount. It also rejects duplicate transaction use. Only the trusted verifier can record the payment as paid.”

Show the already verified testnet payment record. Mention the 18 mock regression tests and 7 live negative-path tests using synthetic invalid data. Do not expose private transaction metadata beyond what is needed for the demo.

### 2:45–3:30 — Prove the link controls

“The owner can copy an active link again without replacing it. If the owner revokes it, the old URL stops working. Link recovery is restricted to the owner and only works while the link is active and unexpired.”

If a safe prepared test link is available, recopy it, revoke it, and open the revoked URL to show **Payment request unavailable**. The owner has already browser-tested this lifecycle successfully. Avoid revoking the only useful demo link.

### 3:30–4:00 — Close with the scope

“Taskora connects work tracking to payment follow-through, with payment status backed by server-side verification. This submission is a NEAR testnet demonstration only. Mainnet, USDC and real-fund settlement are not enabled.”

Finish on the workspace or verified testnet record.

## Screenshot capture list

Capture these from the preview using a prepared demo account and safe demo data:

1. **Workspace overview** — dashboard and navigation.
2. **Job delivery** — job details with milestones and checklist progress.
3. **Work evidence** — dated progress update and attached evidence visible in job history.
4. **Payment request** — exact amount, destination and NEAR testnet disclosure.
5. **Verified payment** — existing “Payment verified” state and matching payment record.
6. **Revoked link** — old URL displaying “Payment request unavailable”.
7. **Technical validation** — GitHub Actions run #149 passing and verifier test counts (18 mock, 7 synthetic negative-path).

Do not fabricate screenshots or edit UI states to imply functionality that was not demonstrated.

## Recording checklist

- Use a prepared demo account and a clean browser window.
- Confirm the preview is READY before recording; if the newest deployment is still building, use a known READY preview and identify its commit.
- Close unrelated tabs and hide desktop/mobile notifications.
- Keep browser zoom and window size consistent.
- Use demo client/job details; keep personal email addresses and private client information out of frame.
- Never show passwords, API keys, Supabase service-role keys, environment files, wallet seed phrases or recovery phrases.
- Reuse the existing verified NEAR testnet payment record; do not send another transfer for the recording.
- Keep the NEAR testnet-only boundary visible and say it aloud.
- Do not revoke the primary payment link needed for the rest of the demo.
- Keep the final recording around four minutes and prioritize the product journey over lengthy code or dashboard tours.

## Technical facts to state accurately

- NEAR testnet only; no mainnet, USDC or real-fund settlement.
- verify-near-payment Edge Function version 6 is active.
- The verifier checks network, final and successful execution, signer, receiver, native NEAR transfer action, exact yoctoNEAR amount and duplicate transaction use.
- The server performs payment finalization; authenticated browser clients cannot directly set paid status or settlement fields.
- Share-link creation and revocation are atomic; raw owner tokens are not directly selectable by authenticated clients.
- Owner recopy is limited to the owner's active, unexpired share.
- Work evidence is held in a private owner/job-scoped storage bucket.
- The Assistant page and history exist, but AI Gateway authentication and live AI responses are deferred. Do not present the Assistant as live AI.
- CI run #149 passed for the current PR head. The newest Vercel preview for that head was still building at the time of the last check; verify READY status before using it.

## Do not claim

- That Taskora is a job marketplace.
- That mainnet, USDC or real-fund settlement is supported.
- That the Assistant currently provides live AI responses.
- That job completion automatically means payment has been received.
- That a client-side wallet success screen alone proves payment.
