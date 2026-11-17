import { SignJWT, jwtVerify } from 'jose'
import type { NextApiRequest } from 'next'

const COOKIE = 'cwa_member_session'
const MAX_AGE = 60 * 60 * 24 * 7

// Same rule as the owner session: inside the playground iframe the browser drops
// SameSite=Lax/Strict cookies, so member sign-in would silently fail there.
const cookieSameSite: 'None' | 'Strict' =
  process.env.NEXT_PUBLIC_IS_PLAYGROUND === 'true' ? 'None' : 'Strict'

function secret(): Uint8Array | null {
  const value = process.env.JWT_SECRET
  return value ? new TextEncoder().encode(value) : null
}

export async function createMemberToken(id: string, email: string) {
  const key = secret()
  if (!key) return null
  return new SignJWT({ email, role: 'member' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key)
}

function cookieParts(value: string, maxAge: number): string {
  const parts = [value, 'Path=/', 'HttpOnly', 'Secure', `SameSite=${cookieSameSite}`, `Max-Age=${maxAge}`]
  if (cookieSameSite === 'None') parts.push('Partitioned')
  return parts.join('; ')
}

export function memberCookie(token: string) {
  return cookieParts(`${COOKIE}=${token}`, MAX_AGE)
}

export function clearMemberCookie() {
  return cookieParts(`${COOKIE}=`, 0)
}

export async function getMember(req: NextApiRequest) {
  const key = secret()
  if (!key) return null
  const header = req.headers.cookie
  if (!header) return null
  let token: string | undefined
  for (const chunk of header.split(';')) {
    const [name, ...rest] = chunk.trim().split('=')
    if (name === COOKIE) token = rest.join('=')
  }
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] })
    if (payload.role !== 'member' || !payload.sub) return null
    return { id: payload.sub, email: String(payload.email ?? '') }
  } catch {
    return null
  }
}
