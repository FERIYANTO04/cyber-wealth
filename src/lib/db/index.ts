import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof drizzle<typeof schema>>
  client: ReturnType<typeof postgres>
}

// Do not throw while Next.js is collecting server-side pages during the image
// build. Pages that use the database are server-rendered at request time; the
// production host injects DATABASE_URL before the server starts. The fallback
// is only to let the module be imported during build and must never be used for
// a production request (the readiness endpoint rejects a missing DATABASE_URL).
const databaseUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/build-only'
if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
  throw new Error('DATABASE_URL must be a PostgreSQL connection string beginning with postgres:// or postgresql://.')
}

const client = globalForDb.client ?? postgres(databaseUrl, { max: 1, prepare: false, max_pipeline: 1, infer: true })
export const sqlClient = client
export const db = globalForDb.db ?? drizzle(client, { schema })
if (process.env.NODE_ENV !== 'production') {
  globalForDb.client = client
  globalForDb.db = db
}
