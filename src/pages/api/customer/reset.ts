import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { customerAccounts } from '@/lib/db/schema'
import { findLiveToken, markTokenUsed } from '@/lib/customer-auth'
import { sendEmail } from '@/lib/email'

const Body = z.object({
  token: z.string().trim().min(20).max(200),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter').max(200),
})

/** Sets a new password from a reset link. Each link works once, then dies. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Metode tidak diizinkan' })
  }

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' })
  }

  const row = await findLiveToken('reset', parsed.data.token)
  if (!row) {
    return res.status(410).json({
      error: 'Tautan ini sudah dipakai atau kedaluwarsa. Minta tautan baru dari halaman lupa kata sandi.',
    })
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)
  const [account] = await db
    .update(customerAccounts)
    .set({ passwordHash })
    .where(eq(customerAccounts.id, row.customerId))
    .returning({ email: customerAccounts.email, name: customerAccounts.name })

  await markTokenUsed(row.id)

  if (account) {
    await sendEmail({
      to: account.email,
      subject: 'Kata sandi akun Anda sudah diubah',
      body: [
        `Halo ${account.name},`,
        '',
        'Kata sandi akun Anda baru saja diubah. Bila bukan Anda yang melakukannya, segera hubungi kami lewat halaman kontak.',
      ].join('\n'),
      kind: 'customer-reset-done',
      relatedType: 'customer',
      relatedId: row.customerId,
    }).catch(() => undefined)
  }

  return res.status(200).json({ ok: true, message: 'Kata sandi baru tersimpan. Silakan masuk.' })
}
