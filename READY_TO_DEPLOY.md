# Cyber Wealth — Ready to Deploy

Source package cleaned for production deployment.

## Build
npm ci
npm run check
npm run build
npm start

## Required private environment variables
DATABASE_URL
JWT_SECRET
BANK_NAME
BANK_ACCOUNT_NAME
BANK_ACCOUNT_NUMBER
BANK_TRANSFER_INSTRUCTIONS
GROQ_API_KEY
CRON_SECRET
NEXT_PUBLIC_IS_PLAYGROUND=false

Optional integrations documented in DEPLOYMENT.md include Meta OAuth, email, and object storage.

## Important
This app is server-backed and must be deployed as a Next.js web application/container, not a static site. A real PostgreSQL database and owner secrets are required. No credentials are included in this package.
