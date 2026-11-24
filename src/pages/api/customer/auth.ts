import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'
import { customerAccounts, customerTokens } from '@/lib/db/schema'
import {
  clearCustomerCookie,
  createCustomerToken,
  customerCookie,
  findCustomerByEmail,
  issueToken,
} from '@/lib/customer-auth'
import { sendEmail } from '@/lib/email'
import { logActivity } from '@/lib/data'

const Body = z.object({
  action: z.enum(['register', 'login', 'logout']),
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter').max(200).optional(),
})

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
  return entry.n > 10
}

/**
 * Buyer accounts. A session is only issued for a verified address, so an email never
 * ends up owning someone else's orders because it was typed with a typo.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Metode tidak diizinkan' })
  }
  if (req.body?.action === 'logout') {
    res.setHeader('Set-Cookie', clearCustomerCookie())
    return res.status(200).json({ ok: true })
  }

  const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'unknown').split(',')[0]
  if (limited(ip)) return res.status(429).json({ error: 'Terlalu banyak percobaan. Tunggu sebentar.' })

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' })
  }
  const { action, email, password, name } = parsed.data
  if (!email || !password) return res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' })

  const origin = (req.headers.origin as string | undefined) ?? `https://${req.headers.host}`

  if (action === 'register') {
    if (!name) return res.status(400).json({ error: 'Nama wajib diisi.' })
    const existing = await findCustomerByEmail(email)
    if (existing) {
      return res.status(409).json({
        error: 'Email ini sudah terdaftar. Masuk saja, atau gunakan lupa kata sandi bila perlu.',
      })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const [account] = await db
      .insert(customerAccounts)
      .values({ email, name, passwordHash })
      .returning({ id: customerAccounts.id, email: customerAccounts.email })

    const { token, tokenHash } = issueToken()
    await db.insert(customerTokens).values({
      customerId: account.id,
      kind: 'verify',
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })

    const verificationEmail = await sendEmail({
      to: email,
      subject: 'Konfirmasi alamat email Anda',
      body: [
        `Halo ${name},`,
        '',
        'Terima kasih sudah membuat akun. Klik tautan berikut untuk mengonfirmasi alamat email Anda:',
        `${origin}/verifikasi?token=${token}`,
        '',
        'Tautan berlaku 24 jam. Bila Anda tidak membuat akun ini, abaikan saja email ini.',
      ].join('\n'),
      kind: 'customer-verify',
      relatedType: 'customer',
      relatedId: account.id,
    })

    await logActivity({
      actor: 'system',
      action: 'Akun pelanggan dibuat',
      detail: `${email} mendaftar dan menunggu konfirmasi email.`,
    })

    return res.status(201).json({
      ok: true,
      needsVerification: true,
      emailSent: verificationEmail.sent,
      message: verificationEmail.sent
        ? 'Akun dibuat. Buka tautan konfirmasi di email Anda untuk mulai masuk.'
        : 'Akun sudah tercatat, tetapi email konfirmasi belum terkirim. Tim Cyber Wealth perlu mengaktifkan layanan email sebelum Anda bisa masuk. Jangan daftar ulang.' ,
    })
  }

  const account = await findCustomerByEmail(email)
  const valid = account ? await bcrypt.compare(password, account.passwordHash) : false
  if (!account || !valid) {
    return res.status(401).json({ error: 'Email atau kata sandi tidak cocok.' })
  }
  if (!account.emailVerifiedAt) {
    return res.status(403).json({
      error: 'Alamat email belum dikonfirmasi. Buka tautan di email Anda, atau minta tautan baru.',
      needsVerification: true,
    })
  }

  const token = await createCustomerToken(account.id, account.email)
  if (!token) return res.status(500).json({ error: 'Kunci keamanan belum siap. Coba lagi.' })

  res.setHeader('Set-Cookie', customerCookie(token))
  return res.status(200).json({ ok: true })
}
