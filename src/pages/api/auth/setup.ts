import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { ownerAccount } from '@/lib/db/schema'
import { createSessionToken, sessionCookie } from '@/lib/auth'
import { logActivity } from '@/lib/data'
import { isAllowedOwnerEmail, isRestricted } from '@/lib/owner-access'

const Body = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(80),
  email: z.string().trim().toLowerCase().email('Alamat email tidak valid'),
  password: z.string().min(10, 'Kata sandi minimal 10 karakter').max(200),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' })
  }

  if (!isAllowedOwnerEmail(parsed.data.email)) {
    return res.status(403).json({
      error: 'Alamat email ini bukan pemilik aplikasi. Masuk dengan alamat yang ditetapkan pemilik.',
    })
  }

  const existing = await db.select({ n: sql<number>`count(*)::int` }).from(ownerAccount)
  if ((existing[0]?.n ?? 0) > 0) {
    return res.status(409).json({ error: 'Akun pemilik sudah ada. Silakan masuk.' })
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)
  const [owner] = await db
    .insert(ownerAccount)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
    })
    .returning()

  const token = await createSessionToken(owner.id, owner.email)
  if (!token) return res.status(500).json({ error: 'Kunci keamanan belum siap. Coba lagi.' })

  await logActivity({
    actor: 'system',
    action: 'Akun pemilik dibuat',
    detail: `${owner.email} terdaftar sebagai satu-satunya pemilik.`,
  })

  res.setHeader('Set-Cookie', sessionCookie(token))
  return res.status(200).json({ ok: true })
}
