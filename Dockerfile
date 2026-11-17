# Production image for this Next.js app: `next build`, then the standalone
# server (`node server.js`) on port 8082.
#
# The app needs PostgreSQL: set DATABASE_URL at run time. The image doesn't
# migrate; apply the schema with `npm run db:migrate` from a checkout first.

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
# public/ is optional in a Next app, but the runtime stage copies it.
RUN npm run build && mkdir -p public

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=postgres://postgres@127.0.0.1:5432/app
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["sh", "-c", "node server.js"]
