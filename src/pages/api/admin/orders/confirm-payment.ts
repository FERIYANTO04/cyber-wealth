import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { orders } from '@/lib/db/schema'
import { requireOwnerSession } from '@/lib/auth'
import { settlePaidOrder } from '@/lib/revenue'

const Body = z.object({ orderId: z.string().min(1) })

/** Owner-only manual settlement: call only after independently verifying bank receipt. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })
  if (!(await requireOwnerSession(req))) return res.status(401).json({ error: 'Sesi pemilik tidak ditemukan.' })
  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'ID pesanan tidak valid.' })
  const [order] = await db.select().from(orders).where(and(eq(orders.id, parsed.data.orderId), eq(orders.provider, 'manual_transfer'))).limit(1)
  if (!order) return res.status(404).json({ error: 'Pesanan transfer manual tidak ditemukan.' })
  const result = await settlePaidOrder({ orderId: order.id, provider: 'manual_transfer' })
  return res.status(200).json({ ok: true, settled: result.settled, status: result.order?.status })
}
