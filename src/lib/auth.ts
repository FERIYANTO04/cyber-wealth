import type { GetServerSidePropsContext, NextApiRequest } from 'next'
import { SignJWT, jwtVerify } from 'jose'

export const COOKIE_NAME = 'cwa_session'
const SESSION_SECONDS = 60 * 60 * 24 * 7

export const cookieSameSite: 'None' | 'Strict' =
  process.env.NEXT_PUBLIC_IS_PLAYGROUND === 'true' ? 'None' : 'Strict'

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

/** For getServerSideProps: `{ redirectTo }` when there is no owner session. */
export async function requireOwnerPage(
  ctx: GetServerSidePropsContext
): Promise<{ redirectTo: string } | { session: Session }> {
  const session = await getSession(ctx.req)
  if (!session) return { redirectTo: `/login?next=${encodeURIComponent(ctx.resolvedUrl)}` }
  return { session }
}
