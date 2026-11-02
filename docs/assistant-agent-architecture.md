# Taskora Assistant — agent foundation

**Status: AI Gateway orchestration implemented in code; runtime credentials and live end-to-end verification are still pending.**

The Assistant uses two server-side routes:

- `POST /api/assistant`: authenticated, structured read-only workspace tools.
- `POST /api/assistant/chat`: authenticated natural-language chat through Vercel AI Gateway, with a bounded server-side tool-calling loop.

Both routes authenticate with `auth.getUser()` and use the session-scoped Supabase server client. Database access remains subject to the existing Row Level Security policies.

## AI runtime

The chat route calls the AI Gateway OpenAI-compatible Chat Completions endpoint. It uses `AI_GATEWAY_MODEL` (default: `alibaba/qwen-3-32b`, verified against the live Gateway model catalogue when implemented).

Authentication order:
1. `AI_GATEWAY_API_KEY` for local development or non-Vercel hosting.
2. `VERCEL_OIDC_TOKEN` when the Vercel deployment provides OIDC authentication.

Do not commit an API key or paste it into chat. Configure it only as a server-side environment variable. On Vercel, use a supported OIDC-enabled deployment or configure an AI Gateway API key in the project's encrypted environment variables.

## Available model tools

- `workspace_summary`: counts jobs and payment requests and calculates completed-job totals separately for USDC and NEAR.
- `list_jobs`: returns up to 50 of the signed-in user's jobs, optionally filtered by `in_progress`, `completed`, or `cancelled`.
- `list_pending_payments`: returns up to 50 shared payment requests.

The model can only call these three allow-listed tools. Tool arguments are parsed and validated server-side. The tools do not return client email addresses, phone numbers, wallet secrets, or payment-share tokens.

## Safety boundary

- Unauthenticated requests are rejected before model invocation.
- Chat history is restricted to 12 recent user/assistant messages, each up to 3,000 characters.
- Model execution has a 22-second timeout and at most four model/tool rounds.
- The Assistant is read-only. It cannot create invoices, change job status, revoke links, transfer assets, or mark a payment as paid.
- A shared payment request is not proof of an on-chain transfer.
- USDC and NEAR are never added together.
- Job values are not represented as confirmed payments.
- Responses use `Cache-Control: no-store`.

## Remaining work

1. Configure AI Gateway authentication for the actual Taskora deployment.
2. Run a signed-in end-to-end chat test and verify tool calls against real RLS-protected data.
3. Add rate limiting and observability before wider release.
4. Add any future write actions only behind explicit user confirmation and server-side authorization.
5. Treat NEAR payment verification as a separate payment-engineering task; never trust a client-submitted transaction hash alone.

The Assistant must not be described as live in production until the deployment has credentials and the signed-in end-to-end flow has been verified.
