import type { NextApiRequest, NextApiResponse } from 'next'
import { and, eq } from 'drizzle-orm'
import { jwtVerify } from 'jose'
import { db } from '@/lib/db'
import { ownerAccount, socialAccounts } from '@/lib/db/schema'
import { sealSocialToken } from '@/lib/social-token-vault'

const CALLBACK_PATH = '/api/integrations/social/callback'

function appOrigin(): string {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN ? 'https://' + process.env.RAILWAY_PUBLIC_DOMAIN.replace(/^https?:\/\//, '').split('/')[0] : '')
  if (!configured) throw new Error('APP_URL belum diatur di Railway.')
  const url = new URL(configured)
  if (url.protocol !== 'https:') throw new Error('APP_URL harus HTTPS.')
  return url.origin
}

function jwtKey(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET belum memenuhi syarat keamanan.')
  return new TextEncoder().encode(secret)
}

type TokenPayload = {
  access_token: string
  refresh_token?: string
  expires_in?: number
  refresh_token_expires_in?: number
  scope?: string
  token_type?: string
}

async function providerJson(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, cache: 'no-store', signal: AbortSignal.timeout(20000) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error('Provider OAuth menolak permintaan (' + response.status + ').')
  return data
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metode tidak diizinkan.' })
  const code = typeof req.query.code === 'string' ? req.query.code : ''
  const state = typeof req.query.state === 'string' ? req.query.state : ''
  if (!code || !state) return res.redirect(302, '/social?connection=cancelled')

  try {
    const verified = await jwtVerify(state, jwtKey(), {
      algorithms: ['HS256'],
      issuer: 'cyber-wealth-social-oauth',
    })
    const platform = String(verified.payload.platform || '')
    const ownerId = String(verified.payload.sub || '')
    if (!ownerId || !verified.payload.nonce || (platform !== 'youtube' && platform !== 'tiktok')) {
      return res.status(403).send('State OAuth tidak valid.')
    }
    const [owner] = await db.select({ id: ownerAccount.id }).from(ownerAccount).where(eq(ownerAccount.id, ownerId)).limit(1)
    if (!owner) return res.status(403).send('Pemilik sesi OAuth tidak ditemukan.')

    const redirectUri = appOrigin() + CALLBACK_PATH
    let token: TokenPayload
    let externalId = ''
    let displayName = ''

    if (platform === 'youtube') {
      const body = new URLSearchParams({
        code,
        client_id: process.env.YOUTUBE_CLIENT_ID || '',
        client_secret: process.env.YOUTUBE_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      })
      token = await providerJson('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
      }) as TokenPayload
      const channels = await providerJson('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
        headers: { Authorization: 'Bearer ' + token.access_token },
      })
      const channel = channels?.items?.[0]
      externalId = String(channel?.id || '')
      displayName = String(channel?.snippet?.title || '')
      if (!externalId) throw new Error('Google tidak mengembalikan kanal YouTube. Pastikan akun memiliki kanal.')
    } else {
      const body = new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY || '',
        client_secret: process.env.TIKTOK_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      })
      const response = await providerJson('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
      })
      if (response?.error) throw new Error(String(response.error_description || response.error))
      token = response as TokenPayload
      externalId = String(response?.open_id || '')
      const profile = await providerJson('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name', {
        headers: { Authorization: 'Bearer ' + token.access_token },
      })
      displayName = String(profile?.data?.user?.display_name || '')
      if (!externalId) throw new Error('TikTok tidak mengembalikan open_id.')
    }

    if (!token.access_token) throw new Error('Provider tidak mengembalikan access token.')
    const sealed = sealSocialToken({
      accessToken: token.access_token,
      refreshToken: token.refresh_token || null,
      tokenType: token.token_type || 'Bearer',
      refreshExpiresAt: (token as TokenPayload & { refresh_expires_in?: number }).refresh_expires_in ? Date.now() + (token as TokenPayload & { refresh_expires_in?: number }).refresh_expires_in! * 1000 : null,
    })
    await db.delete(socialAccounts).where(and(
      eq(socialAccounts.channel, platform),
      eq(socialAccounts.externalId, externalId),
    ))
    await db.insert(socialAccounts).values({
      channel: platform,
      externalId,
      name: displayName || (platform === 'youtube' ? 'YouTube channel' : 'TikTok account'),
      tokenSealed: sealed,
      tokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
      scopes: token.scope || (platform === 'youtube' ? 'https://www.googleapis.com/auth/youtube.upload' : 'user.info.basic,video.publish'),
      status: 'connected',
      lastCheckedAt: new Date(),
    })

    return res.redirect(302, '/social?connection=' + platform + '_connected')
  } catch (error) {
    console.error('[social oauth callback]', error instanceof Error ? error.message : 'unknown error')
    return res.redirect(302, '/social?connection=error')
  }
}
