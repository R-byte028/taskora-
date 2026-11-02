# Taskora Assistant — agent foundation

**Status: authenticated read-only tool layer implemented; model orchestration is not connected yet.**

The Assistant now has a server-side tool boundary at `POST /api/assistant`. The endpoint authenticates the current Supabase user with `auth.getUser()` and uses the session-scoped Supabase server client. Database access therefore remains subject to the existing Row Level Security policies.

## Available tools

The endpoint accepts one allow-listed action:

- `workspace_summary`: counts the signed-in user's jobs and payment requests and calculates completed-job totals separately for USDC and NEAR.
- `list_jobs`: returns a limited list of the user's jobs. An optional status filter accepts only `in_progress`, `completed`, or `cancelled`.
- `list_pending_payments`: returns shared payment requests only, with a warning that shared is not equivalent to paid.

The endpoint returns structured JSON rather than model-generated prose. It does not expose client email addresses, phone numbers, notes, wallet secrets, or payment-share tokens.

## Safety boundary

- Unauthenticated requests are rejected.
- Actions are allow-listed; this route does not accept arbitrary SQL, table names, filters, or RPC names.
- This first tool set is read-only. It cannot create invoices, change job status, revoke links, transfer assets, or mark a payment as paid.
- Payment confirmation remains exclusively a future server-side verification responsibility. A client-submitted transaction hash or a shared request is not proof of payment.
- USDC and NEAR amounts are never added together.
- Responses are marked `Cache-Control: no-store`.

## Next implementation steps

1. Connect the Assistant UI to these structured tools.
2. Select and configure the model provider/runtime (for example, Vercel AI Gateway) and add server-only credentials through deployment environment settings.
3. Add a strict tool-calling loop with a small tool registry, input validation, timeouts, and per-user rate limits.
4. Add human confirmation before any future write action.
5. Add NEAR testnet wallet transfer and independent server-side transaction verification only after the read-only agent flow is tested.

Do not describe the Assistant as a live autonomous AI agent until a model runtime is configured and the end-to-end flow has been verified.
