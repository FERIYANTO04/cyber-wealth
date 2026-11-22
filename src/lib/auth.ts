import type { GetServerSidePropsContext, NextApiRequest } from 'next'
import { SignJWT, jwtVerify } from 'jose'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { ownerAccount } from '@/lib/db/schema'

export const COOKIE_NAME = 'cwa_session'
const SESSION_SECONDS = 60 * 60 * 24 * 7

export const cookieSameSite: 'None' | 'Lax' =
  process.env.NEXT_PUBLIC_IS_PLAYGROUND === 'true' ? 'None' : 'Lax'

function key(): Uint8Array | null {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    console.warn('JWT_SECRET is not set — sign-in is unavailable until it is configured.')
    return null
  }
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(ownerId: string, email: string): Promise<string | null> {
  const secret = key()
  if (!secret) return null
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(ownerId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(secret)
}

export async function readSession(
  token: string | undefined
): Promise<{ ownerId: string; email: string } | null> {
  if (!token) return null
  const secret = key()
  if (!secret) return null
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })
    if (!payload.sub) return null
    return { ownerId: payload.sub, email: String(payload.email ?? '') }
  } catch {
    return null
  }
}

export function sessionCookie(token: string): string {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    `SameSite=${cookieSameSite}`,
    `Max-Age=${SESSION_SECONDS}`,
  ]
  if (cookieSameSite === 'None') parts.push('Partitioned')
  return parts.join('; ')
}

export function clearedSessionCookie(): string {
  const parts = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'Secure',
    `SameSite=${cookieSameSite}`,
    'Max-Age=0',
  ]
  if (cookieSameSite === 'None') parts.push('Partitioned')
  return parts.join('; ')
}

function cookieFromRequest(
  req: NextApiRequest | GetServerSidePropsContext['req']
): string | undefined {
  const header = req.headers.cookie
  if (!header) return undefined
  for (const chunk of header.split(';')) {
    const [name, ...rest] = chunk.trim().split('=')
    if (name === COOKIE_NAME) return rest.join('=')
  }
  return undefined
}

export async function getSession(
  req: NextApiRequest | GetServerSidePropsContext['req']
): Promise<{ ownerId: string; email: string } | null> {
  return readSession(cookieFromRequest(req))
}

export type Session = { ownerId: string; email: string }

/** A valid signature is not enough: the session must still belong to the current owner row. */
export async function requireOwnerSession(
  req: NextApiRequest | GetServerSidePropsContext['req']
): Promise<Session | null> {
  const session = await getSession(req)
  if (!session) return null
  const [owner] = await db
    .select({ id: ownerAccount.id, email: ownerAccount.email })
    .from(ownerAccount)
    .where(and(eq(ownerAccount.id, session.ownerId), eq(ownerAccount.email, session.email)))
    .limit(1)
  return owner ? session : null
}

/** For getServerSideProps: `{ redirectTo }` when there is no owner session. */
export async function requireOwnerPage(
  ctx: GetServerSidePropsContext
): Promise<{ redirectTo: string } | { session: Session }> {
  const session = await requireOwnerSession(ctx.req)
  if (!session) return { redirectTo: `/login?next=${encodeURIComponent(ctx.resolvedUrl)}` }
  return { session }
}
