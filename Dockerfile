# Production image for this Next.js app. Railway runs the database migration
# as a pre-deploy command, then starts the Next.js server.
#
# Set DATABASE_URL and JWT_SECRET in the Railway service environment.

FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

FROM node:24-slim AS build
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_PRIVATE_STANDALONE=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && mkdir -p public

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=postgres://postgres@127.0.0.1:5432/app

# Next standalone server and static assets.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Railway's pre-deploy migration runs npm run db:migrate. Include its
# scripts, Drizzle migrations, package manifest, and dev tooling.
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/src/lib/db/schema.ts ./src/lib/db/schema.ts
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3000
CMD ["sh", "-c", "node server.js"]
