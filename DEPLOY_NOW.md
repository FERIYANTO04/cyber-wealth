# Cyber Wealth — deploy target

This package is prepared for a server-side Next.js deployment. It is **not** a static site: the app has API routes and PostgreSQL-backed data.

## Current payment mode

The checkout is already configured for **manual bank transfer**. There is no Xendit dependency in the current application flow.

## Required before a real production launch

These values cannot be invented by the code because they belong to the owner:

- `DATABASE_URL`
- `JWT_SECRET`
- `BANK_NAME`
- `BANK_ACCOUNT_NAME`
- `BANK_ACCOUNT_NUMBER`
- `BANK_TRANSFER_INSTRUCTIONS`
- `GROQ_API_KEY`
- `CRON_SECRET`

Optional integrations are documented in `DEPLOYMENT.md`.

## Cloudflare Workers

Cloudflare's current documentation recommends vinext for new/full-stack Next.js deployments on Workers. An existing Next.js project can be checked with `npx vinext check`, initialized with `npx vinext init`, and deployed with the Cloudflare deploy command.

The project intentionally does not include owner credentials or fake production secrets.
