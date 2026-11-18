import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { subscriptions } from '@/lib/db/schema'
import { requireOwnerSession } from '@/lib/auth'
import { settlePaidSubscription } from '@/lib/saas'

const Body = z.object({ token: z.string().min(1) })

/** Owner-only: call only after independently confirming the bank deposit in the bank account. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })
  if (!(await requireOwnerSession(req))) return res.status(401).json({ error: 'Sesi pemilik tidak ditemukan.' })
  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'ID langganan tidak valid.' })
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.accessToken, parsed.data.token)).limit(1)
  if (!row || row.dataSource !== 'live') return res.status(404).json({ error: 'Langganan tidak ditemukan.' })
  const result = await settlePaidSubscription({ subscriptionId: row.id, provider: 'manual_bank_transfer', paidAmountIdr: Number(row.amountIdr) })
  return res.status(200).json({ ok: true, settled: result.settled, status: result.settled ? 'active' : row.status })
}
