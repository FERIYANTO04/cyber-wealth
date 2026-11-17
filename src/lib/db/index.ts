import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof drizzle<typeof schema>>
  client: ReturnType<typeof postgres>
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is missing. Set DATABASE_URL in Netlify Environment Variables to your Neon PostgreSQL connection string, then redeploy.')
}
if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
  throw new Error('DATABASE_URL must be a PostgreSQL connection string beginning with postgres:// or postgresql://.')
}

const client = globalForDb.client ?? postgres(databaseUrl, { max: 1, prepare: false, max_pipeline: 1, infer: true })
export const db = globalForDb.db ?? drizzle(client, { schema })
if (process.env.NODE_ENV !== 'production') {
  globalForDb.client = client
  globalForDb.db = db
}
