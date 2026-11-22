import type { NextApiRequest, NextApiResponse } from 'next'
import { randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { SignJWT } from 'jose'
import { db } from '@/lib/db'
import { ownerAccount } from '@/lib/db/schema'
import { requireOwnerSession } from '@/lib/auth'
import { sendEmail } from '@/lib/email'

const CALLBACK_PATH = '/api/integrations/social/callback'

function appOrigin(): string {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN ? 'https://' + process.env.RAILWAY_PUBLIC_DOMAIN.split('/')[0] : '')
  if (!configured) throw new Error('APP_URL belum diatur.')
  const url = new URL(configured)
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('APP_URL harus HTTPS.')
  return url.origin
}

function jwtKey(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET belum memenuhi syarat.')
  return new TextEncoder().encode(secret)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metode tidak diizinkan.' })

  const session = await requireOwnerSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi owner tidak aktif. Masuk ke dashboard dahulu.' })

  try {
    const [owner] = await db.select({ id: ownerAccount.id })
      .from(ownerAccount)
      .where(eq(ownerAccount.id, session.ownerId))
      .limit(1)
    if (!owner) return res.status(404).json({ error: 'Akun owner tidak ditemukan.' })

    const clientKey = process.env.TIKTOK_CLIENT_KEY
    if (!clientKey || !process.env.TIKTOK_CLIENT_SECRET) {
      return res.status(503).json({ error: 'Kredensial TikTok belum lengkap.' })
    }

    const state = await new SignJWT({ platform: 'tiktok', nonce: randomBytes(32).toString('base64url') })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(session.ownerId)
      .setIssuer('cyber-wealth-social-oauth')
      .setIssuedAt()
      .setExpirationTime('10m')
      .sign(jwtKey())

    const redirectUri = appOrigin() + CALLBACK_PATH
    const authorize = new URL('https://www.tiktok.com/v2/auth/authorize/')
    authorize.searchParams.set('client_key', clientKey)
    authorize.searchParams.set('redirect_uri', redirectUri)
    authorize.searchParams.set('response_type', 'code')
    authorize.searchParams.set('scope', 'user.info.basic,video.publish')
    authorize.searchParams.set('state', state)

    const result = await sendEmail({
      to: 'kinggepenkfx@gmail.com',
      subject: 'Persetujuan koneksi TikTok — Cyber Wealth',
      body: [
        'Permintaan koneksi TikTok untuk Cyber Wealth.',
        '',
        'Buka tautan berikut dalam 10 menit untuk masuk ke TikTok dan menyetujui akses:',
        authorize.toString(),
        '',
        'Jika kamu tidak meminta koneksi ini, abaikan email ini.',
        'Cyber Wealth tidak meminta kata sandi atau kode OTP melalui email.',
      ].join('\\n'),
      kind: 'tiktok_oauth_approval',
      relatedType: 'social',
      relatedId: 'tiktok',
      dataSource: 'live',
    })

    if (!result.sent) return res.status(503).json({ error: 'Email belum terkirim.', detail: result.detail })
    return res.status(200).json({ ok: true, message: 'Tautan persetujuan TikTok berhasil dikirim ke email owner.' })
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Gagal membuat tautan persetujuan.' })
  }
}
