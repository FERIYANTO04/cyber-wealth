// Runs first in scripts/db-migrate.mjs (npm run db:migrate). drizzle-kit swallows connection
// errors: an unreachable host, a wrong password and a missing database all end at
// "Pulling schema from database..." and exit 1 with no reason. This connects first
// and says which it was. It never prints DATABASE_URL, which holds the password.
import { promises as dns } from 'node:dns'
import postgres from 'postgres'

const raw = process.env.DATABASE_URL
if (!raw) fail('DATABASE_URL is not set. Add the PostgreSQL connection URL in the hosting environment before running migrations.')

let target
try {
  target = new URL(raw)
} catch {
  fail('DATABASE_URL is not a valid connection URL. It should look like postgresql://user:password@host:5432/database.')
}
const host = target.hostname
const database = decodeURIComponent(target.pathname.replace(/^\//, '')) || 'postgres'

const sql = postgres(raw, { max: 1, connect_timeout: 15, onnotice: () => {} })
try {
  await sql`select 1`
  console.log(`Connected to database "${database}" at ${host}.`)
} catch (err) {
  console.error(await explain(err))
  process.exitCode = 1
} finally {
  await sql.end({ timeout: 5 }).catch(() => {})
}

// A host with only IPv6 addresses looks like ENOTFOUND on a server without IPv6:
// getaddrinfo drops answers the machine has no route for. Asking DNS directly tells
// that apart from a host that truly does not exist.
async function ipv6Only() {
  const [v4, v6] = await Promise.allSettled([dns.resolve4(host), dns.resolve6(host)])
  return v4.status === 'rejected' && v6.status === 'fulfilled' && v6.value.length > 0
}

function ipv6OnlyMessage() {
  const fix = /^db\..+\.supabase\.co$/.test(host)
    ? 'This is Supabase\'s direct connection. In Supabase, open Connect, copy the "Session pooler" connection string, and use it as DATABASE_URL.'
    : 'Use a connection string from your provider that works over IPv4, such as a connection pooler address.'
  return `The database host ${host} only has an IPv6 address, which this server cannot reach. ${fix}`
}

async function explain(err) {
  const code = err?.code ?? ''
  const message = String(err?.message ?? '')

  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    if (await ipv6Only()) return ipv6OnlyMessage()
    return `Could not find the database host "${host}". Check the host in DATABASE_URL.`
  }
  if (['ENETUNREACH', 'EHOSTUNREACH', 'ETIMEDOUT', 'CONNECT_TIMEOUT', 'ECONNREFUSED', 'ECONNRESET'].includes(code)) {
    if (await ipv6Only()) return ipv6OnlyMessage()
    return `Could not reach the database at ${host}. Check the host and port in DATABASE_URL, and that the database accepts connections from the internet.`
  }
  if (code === '28P01') {
    return 'The database rejected the username or password in DATABASE_URL.'
  }
  if (code === '3D000') {
    return `The database "${database}" does not exist at ${host}. Check the name at the end of DATABASE_URL (on Supabase and Neon it is usually "postgres" or "neondb").`
  }
  if (/ssl|encrypt/i.test(message) || (code === '28000' && /pg_hba/i.test(message))) {
    return 'The database requires an encrypted connection. Add ?sslmode=require to the end of DATABASE_URL.'
  }
  return `Could not connect to the database at ${host}: ${message || code || 'unknown error'}`
}

function fail(text) {
  console.error(text)
  process.exit(1)
}
