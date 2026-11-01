# Taskora

**Work done. Payments moving.**

Taskora is a lightweight workspace concept for freelancers and small businesses to organise client jobs and turn completed work into clear payment requests.

## Current status

This repository contains the first frontend preview of Taskora. It is an early hackathon build, not a live payment product.

### Included
- Responsive workspace dashboard
- Summary cards for earnings, pending payments and jobs
- Recent jobs list using sample data
- Create-job modal for client, service and amount
- Initial Taskora visual identity

### Not implemented yet
- Authentication or persistent database storage
- AI-generated payment requests
- Shareable client payment pages
- NEAR wallet connection or on-chain payments

No real payments are processed by this preview. Dashboard figures and activity are sample data.

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

## Planned product flow
1. A provider records a client job.
2. The provider marks the work complete.
3. Taskora helps prepare a structured payment request.
4. The client reviews the request on a shareable page.
5. A supported NEAR payment flow is added.
6. The payment status is updated only after transaction verification.

NEAR integration is planned but is not implemented in this preview. See [HACKATHON.md](./HACKATHON.md) for the build milestones and intended judge walkthrough.
