# Deploy Cyber Wealth to Netlify

This is a Next.js server-rendered app with API routes and PostgreSQL. It must be deployed as a Next.js app, **not** as a static site.

## Build settings
- Base directory: `cw_work` (only if the repository contains this folder at its root; otherwise use the folder containing `package.json`)
- Build command: `npm run build`
- Publish directory: `.next`
- Node.js: 20 or newer

Netlify detects Next.js and installs its maintained Next.js runtime automatically. Do not add a static SPA redirect.

## Required private environment variables
Configure these in Netlify Site configuration → Environment variables. Keep them private; never use `NEXT_PUBLIC_` for secrets.

- `DATABASE_URL`: PostgreSQL connection URI (Neon pooled URI is suitable)
- `JWT_SECRET`: random secret, at least 32 characters
- `GROQ_API_KEY`: active Groq API key
- `BANK_NAME`
- `BANK_ACCOUNT_NAME`
- `BANK_ACCOUNT_NUMBER`
- `BANK_TRANSFER_INSTRUCTIONS`
- `CRON_SECRET`: random secret, at least 32 characters
- `NEXT_PUBLIC_IS_PLAYGROUND`: `false`

Optional:
- `AI_BASE_URL` defaults to `https://api.groq.com/openai/v1`
- `AI_MODEL` defaults to `openai/gpt-oss-120b`

After changing environment variables, trigger a new deploy. Netlify injects values during build/deployment; editing a value does not repair an already-published deployment.

## Database
Before production launch, take a database backup and run `npm run db:migrate` exactly once against the intended Neon/PostgreSQL database. Do not run migrations against an unverified database.

## Verify after deployment
- `GET /api/health` should return HTTP 200.
- `GET /api/health/ready` should return HTTP 200 and `ready: true` only after PostgreSQL connects and `JWT_SECRET` is strong.
- Open the integration page and run the Groq provider check.
- Do not mark a bank transfer paid until the actual bank transaction is independently verified.

## Important limitation
This source archive does not contain your Netlify account access, database password, Groq API key, bank details, or cron secret. The code cannot invent or safely configure those owner-specific values. A successful source build alone does not prove that production services are connected.
