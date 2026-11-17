import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { db } from '@/lib/db'
import { customerTokens } from '@/lib/db/schema'
import { findCustomerByEmail, issueToken } from '@/lib/customer-auth'
import { sendEmail } from '@/lib/email'

const Body = z.object({ email: z.string().trim().toLowerCase().email().max(200) })

const hits = new Map<string, { n: number; at: number }>()
function limited(ip: string): boolean {
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now - entry.at > 60_000) {
    hits.set(ip, { n: 1, at: now })
    if (hits.size > 5000) hits.clear()
    return false
  }
  entry.n += 1
  return entry.n > 3
}

/**
 * Starts a password reset. The reply never says whether the address exists, so this
 * endpoint cannot be used to enumerate accounts.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Metode tidak diizinkan' })
  }

  const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'unknown').split(',')[0]
  if (limited(ip)) return res.status(429).json({ error: 'Terlalu banyak permintaan. Tunggu sebentar.' })

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Alamat email tidak valid.' })

  const account = await findCustomerByEmail(parsed.data.email)
  const origin = (req.headers.origin as string | undefined) ?? `https://${req.headers.host}`

  if (account) {
    const { token, tokenHash } = issueToken()
    await db.insert(customerTokens).values({
      customerId: account.id,
      kind: 'reset',
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    })
    await sendEmail({
      to: account.email,
      subject: 'Atur ulang kata sandi akun Anda',
      body: [
        `Halo ${account.name},`,
        '',
        'Kami menerima permintaan untuk mengatur ulang kata sandi akun ini. Buka tautan berikut:',
        `${origin}/atur-ulang?token=${token}`,
        '',
        'Tautan berlaku satu jam dan hanya bisa dipakai sekali.',
        'Bila Anda tidak meminta ini, abaikan email ini — kata sandi Anda tidak berubah.',
      ].join('\n'),
      kind: 'customer-reset',
      relatedType: 'customer',
      relatedId: account.id,
    })
  }

  return res.status(200).json({
    ok: true,
    message: 'Bila alamat itu terdaftar, tautan pengaturan ulang sudah dikirim ke email tersebut.',
  })
}
