import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { loginAttempt, ownerAccount } from '@/lib/db/schema'
import { createSessionToken, sessionCookie } from '@/lib/auth'
import { logActivity } from '@/lib/data'
import { isAllowedOwnerEmail } from '@/lib/owner-access'

const Body = z.object({
  email: z.string().trim().toLowerCase().email('Alamat email tidak valid'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
})

const MAX_FAILURES = 5
const LOCK_MINUTES = 15

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' })
  }
  const { email, password } = parsed.data

  const attempts = await db.select().from(loginAttempt).where(eq(loginAttempt.email, email)).limit(1)
  const record = attempts[0]
  if (record?.lockedUntil && record.lockedUntil.getTime() > Date.now()) {
    return res.status(429).json({
      error: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.',
    })
  }

  if (!isAllowedOwnerEmail(email)) {
    return res.status(401).json({ error: 'Email atau kata sandi tidak cocok.' })
  }

  const owners = await db.select().from(ownerAccount).where(eq(ownerAccount.email, email)).limit(1)
  const owner = owners[0]
  const valid = owner ? await bcrypt.compare(password, owner.passwordHash) : false

  if (!valid) {
    const failures = (record?.failures ?? 0) + 1
    const lockedUntil = failures >= MAX_FAILURES ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null
    await db
      .insert(loginAttempt)
      .values({ email, failures, lockedUntil, windowStart: new Date() })
      .onConflictDoUpdate({
        target: loginAttempt.email,
        set: { failures, lockedUntil },
      })
    return res.status(401).json({ error: 'Email atau kata sandi tidak cocok.' })
  }

  await db.delete(loginAttempt).where(eq(loginAttempt.email, email))

  const token = await createSessionToken(owner.id, owner.email)
  if (!token) return res.status(500).json({ error: 'Kunci keamanan belum siap. Coba lagi.' })

  await logActivity({ actor: 'owner', action: 'Masuk', detail: `${owner.email} membuka konsol.` })

  res.setHeader('Set-Cookie', sessionCookie(token))
  return res.status(200).json({ ok: true })
}
