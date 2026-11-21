import type { NextApiRequest, NextApiResponse } from 'next'
import { randomBytes } from 'node:crypto'
import { SignJWT } from 'jose'
import { requireOwnerSession } from '@/lib/auth'

const CALLBACK_PATH = '/api/integrations/social/callback'

function appOrigin(): string {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN ? 'https://' + process.env.RAILWAY_PUBLIC_DOMAIN.replace(/^https?:\/\//, '').split('/')[0] : '')
  if (!configured) throw new Error('APP_URL belum diatur di Railway.')
  const url = new URL(configured)
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('APP_URL harus berupa alamat HTTPS produksi yang valid.')
  return url.origin
}

function jwtKey(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET belum memenuhi syarat keamanan.')
  return new TextEncoder().encode(secret)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metode tidak diizinkan.' })
  const session = await requireOwnerSession(req)
  if (!session) return res.status(401).json({ error: 'Silakan masuk sebagai owner.' })

  const platform = String(req.query.platform || '')
  if (platform !== 'youtube' && platform !== 'tiktok') return res.status(404).json({ error: 'Kanal tidak dikenal.' })

  try {
    const redirectUri = appOrigin() + CALLBACK_PATH
    const state = randomBytes(32).toString('base64url')
    const signedState = await new SignJWT({ platform, nonce: state })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(session.ownerId)
      .setIssuer('cyber-wealth-social-oauth')
      .setIssuedAt()
      .setExpirationTime('10m')
      .sign(jwtKey())

    const url = new URL(platform === 'youtube'
      ? 'https://accounts.google.com/o/oauth2/v2/auth'
      : 'https://www.tiktok.com/v2/auth/authorize/')

    if (platform === 'youtube') {
      const clientId = process.env.YOUTUBE_CLIENT_ID
      if (!clientId || !process.env.YOUTUBE_CLIENT_SECRET) return res.status(503).json({ error: 'Kredensial OAuth YouTube belum diisi di Railway.' })
      url.searchParams.set('client_id', clientId)
      url.searchParams.set('redirect_uri', redirectUri)
      url.searchParams.set('response_type', 'code')
      url.searchParams.set('scope', 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly')
      url.searchParams.set('access_type', 'offline')
      url.searchParams.set('prompt', 'consent')
      url.searchParams.set('state', signedState)
    } else {
      const clientKey = process.env.TIKTOK_CLIENT_KEY
      if (!clientKey || !process.env.TIKTOK_CLIENT_SECRET) return res.status(503).json({ error: 'Kredensial OAuth TikTok belum diisi di Railway.' })
      url.searchParams.set('client_key', clientKey)
      url.searchParams.set('redirect_uri', redirectUri)
      url.searchParams.set('response_type', 'code')
      url.searchParams.set('scope', 'user.info.basic,video.publish')
      url.searchParams.set('state', signedState)
    }

    return res.redirect(302, url.toString())
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'OAuth tidak dapat dimulai.' })
  }
}
