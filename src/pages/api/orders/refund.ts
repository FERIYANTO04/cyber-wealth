import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { refundOrder } from '@/lib/revenue'

const Body = z.object({
  orderId: z.string().trim().min(1).max(80),
  note: z.string().trim().max(400).optional(),
})

/**
 * Refunds one paid order. The owner is the only person who can reach this, and the
 * order only becomes `refunded` once the payment provider accepts the request.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const session = await getSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Permintaan tidak valid.' })

  const result = await refundOrder({ orderId: parsed.data.orderId, note: parsed.data.note })
  if (!result.ok) return res.status(409).json({ error: result.error })
  return res.status(200).json({ ok: true, refundId: result.refundId })
}
