# Taskora

**Work done. Payments moving.**

Taskora is a lightweight workspace for freelancers and small businesses to organise client jobs and prepare clear payment requests for completed work.

## Current build

The repository now includes an interactive frontend preview:

- Responsive workspace dashboard and job summary cards
- Create-job form with client, service and agreed amount
- Browser-local persistence for demo job records
- Mark an active job as completed
- Prepare a payment request from a completed job
- Generate a client-facing share link
- Client request page showing the service, amount, reference and work summary

## Important demo limitations

This is not a live payment product yet.

- Demo job records are stored in the browser's local storage, not a shared database.
- The payment link carries request details in its URL; it is not a secure, server-backed invoice.
- The assistant currently organises information entered by the provider. It is not connected to an AI model yet.
- No wallet connection, NEAR transaction or payment collection is implemented.
- The client page clearly states that payment is unavailable.

Do not use this preview to collect real funds or share confidential client information.

## Tech stack
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Lucide icons

## Run locally

Requirements: Node.js 20.9 or later.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Planned NEAR hackathon flow

1. A provider records a client job.
2. The provider marks the work complete.
3. Taskora helps prepare a structured payment request.
4. The client reviews the request on a shareable page.
5. A supported NEAR payment flow is added.
6. Payment status is updated only after authoritative transaction verification.

NEAR integration is not implemented yet. See [HACKATHON.md](./HACKATHON.md) for milestones and the intended judge walkthrough.
