import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { requireOwnerSession } from '@/lib/auth'
import { decideBillingRequest } from '@/lib/billing'

const Body = z.object({
  requestId: z.string().trim().min(1).max(80),
  approved: z.boolean(),
  note: z.string().trim().max(400).optional(),
})

/** The owner decides a cancellation or refund. A refund only reaches the provider from here. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const session = await requireOwnerSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Keputusan tidak valid.' })

  const result = await decideBillingRequest(parsed.data)
  if (!result.ok) return res.status(409).json({ error: result.error })

  return res.status(200).json({ ok: true, refund: result.refund ?? null, warning: result.warning ?? null })
}
