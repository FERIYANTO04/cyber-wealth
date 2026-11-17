import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { createBillingRequest } from '@/lib/billing'

const Body = z.object({
  token: z.string().trim().min(10).max(120),
  kind: z.enum(['cancel', 'refund']),
  reason: z.string().trim().min(4, 'Tuliskan alasan singkat').max(500),
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
  return entry.n > 6
}

/** A cancellation or refund request — it goes to the owner's decision queue, never straight through. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'unknown').split(',')[0]
  if (limited(ip)) return res.status(429).json({ error: 'Terlalu banyak percobaan. Tunggu sebentar.' })

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' })

  const result = await createBillingRequest({
    kind: parsed.data.kind,
    token: parsed.data.token,
    reason: parsed.data.reason,
  })
  if (!result.ok) return res.status(409).json({ error: result.error })

  return res.status(201).json({ ok: true, requestId: result.requestId })
}
