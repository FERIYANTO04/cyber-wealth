import { createHash, randomBytes } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import type { NextApiRequest } from 'next'
import type { GetServerSidePropsContext } from 'next'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { db } from './db'
import { customerAccounts, customerTokens } from './db/schema'

const COOKIE = 'cwa_customer_session'
const MAX_AGE = 60 * 60 * 24 * 30

// Same rule as the other two sessions: inside the playground iframe the browser drops
// SameSite=Lax/Strict cookies, so sign-in would silently fail there.
const cookieSameSite: 'None' | 'Strict' =
  process.env.NEXT_PUBLIC_IS_PLAYGROUND === 'true' ? 'None' : 'Strict'

function secret(): Uint8Array | null {
  const value = process.env.JWT_SECRET
  return value ? new TextEncoder().encode(value) : null
}

function cookieParts(value: string, maxAge: number): string {
  const parts = [value, 'Path=/', 'HttpOnly', 'Secure', `SameSite=${cookieSameSite}`, `Max-Age=${maxAge}`]
  if (cookieSameSite === 'None') parts.push('Partitioned')
  return parts.join('; ')
}

export function customerCookie(token: string) {
  return cookieParts(`${COOKIE}=${token}`, MAX_AGE)
}

export function clearCustomerCookie() {
  return cookieParts(`${COOKIE}=`, 0)
}

export async function createCustomerToken(id: string, email: string): Promise<string | null> {
  const key = secret()
  if (!key) return null
  return new SignJWT({ email, role: 'customer' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key)
}

function tokenFromRequest(req: NextApiRequest | GetServerSidePropsContext['req']): string | undefined {
  const header = req.headers.cookie
  if (!header) return undefined
  for (const chunk of header.split(';')) {
    const [name, ...rest] = chunk.trim().split('=')
    if (name === COOKIE) return rest.join('=')
  }
  return undefined
}

export type CustomerSession = { id: string; email: string }

export async function getCustomer(
  req: NextApiRequest | GetServerSidePropsContext['req']
): Promise<CustomerSession | null> {
  const key = secret()
  if (!key) return null
  const token = tokenFromRequest(req)
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] })
    if (payload.role !== 'customer' || !payload.sub) return null
    return { id: payload.sub, email: String(payload.email ?? '') }
  } catch {
    return null
  }
}

/** For getServerSideProps: `{ redirectTo }` when there is no customer session. */
export async function requireCustomerPage(ctx: GetServerSidePropsContext) {
  const session = await getCustomer(ctx.req)
  if (!session) return { redirectTo: `/masuk?next=${encodeURIComponent(ctx.resolvedUrl)}` }
  return { session }
}

/** A random one-off token; only its SHA-256 hash is stored, so a leak is not a key. */
export function issueToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('hex')
  return { token, tokenHash: hashToken(token) }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Finds a live token of the given kind, or null when it is used, expired, or unknown. */
export async function findLiveToken(kind: 'verify' | 'reset', token: string) {
  if (!/^[a-f0-9]{64}$/i.test(token)) return null
  const rows = await db
    .select()
    .from(customerTokens)
    .where(
      and(
        eq(customerTokens.tokenHash, hashToken(token)),
        eq(customerTokens.kind, kind),
        isNull(customerTokens.usedAt),
        gt(customerTokens.expiresAt, new Date())
      )
    )
    .limit(1)
  return rows[0] ?? null
}

export async function markTokenUsed(id: string) {
  await db.update(customerTokens).set({ usedAt: new Date() }).where(eq(customerTokens.id, id))
}

export async function findCustomerByEmail(email: string) {
  const rows = await db
    .select()
    .from(customerAccounts)
    .where(eq(customerAccounts.email, email.trim().toLowerCase()))
    .limit(1)
  return rows[0] ?? null
}

export async function findCustomerById(id: string) {
  const rows = await db.select().from(customerAccounts).where(eq(customerAccounts.id, id)).limit(1)
  return rows[0] ?? null
}
