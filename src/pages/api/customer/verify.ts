import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { customerAccounts } from '@/lib/db/schema'
import { findLiveToken, markTokenUsed } from '@/lib/customer-auth'

const Body = z.object({ token: z.string().trim().min(20).max(200) })

/** Confirms the address behind a verification link. Each link works once. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Metode tidak diizinkan' })
  }

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Tautan tidak valid.' })

  const row = await findLiveToken('verify', parsed.data.token)
  if (!row) {
    return res.status(410).json({
      error: 'Tautan ini sudah dipakai atau kedaluwarsa. Minta tautan baru dari halaman masuk.',
    })
  }

  await db
    .update(customerAccounts)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(customerAccounts.id, row.customerId))
  await markTokenUsed(row.id)

  return res.status(200).json({ ok: true, message: 'Email terkonfirmasi. Silakan masuk.' })
}
