import type { NextApiRequest, NextApiResponse } from 'next'
import { SignJWT } from 'jose'
import { requireOwnerSession, cookieSameSite } from '@/lib/auth'
import { authorizeUrl, metaConfig } from '@/lib/meta'

/** Starts the official Meta OAuth dialog. The state is signed so a callback can be trusted. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const session = await requireOwnerSession(req)
  if (!session) return res.redirect('/login?next=/facebook')

  if (!metaConfig().configured) {
    return res.redirect('/facebook?error=config')
  }

  const secret = process.env.JWT_SECRET
  if (!secret) return res.redirect('/facebook?error=secret')

  const state = await new SignJWT({ purpose: 'meta-oauth' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(session.ownerId)
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(new TextEncoder().encode(secret))

  res.setHeader(
    'Set-Cookie',
    `cwa_meta_state=${state}; Path=/; HttpOnly; Secure; SameSite=${cookieSameSite}; Max-Age=600`
  )

  const origin = (req.headers.origin as string | undefined) ?? `https://${req.headers.host}`
  const url = authorizeUrl(origin, state)
  if (!url) return res.redirect('/facebook?error=config')
  return res.redirect(url)
}
