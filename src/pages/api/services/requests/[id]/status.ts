import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { serviceRequests } from '@/lib/db/schema'
import { requireOwnerSession } from '@/lib/auth'
import { logActivity } from '@/lib/data'

const Body = z.object({
  status: z.enum(['new', 'proposed', 'proposal_sent', 'won', 'in_progress', 'delivered', 'lost']),
})

/**
 * Moves a job through its stages. Marking it delivered is the only place a service
 * becomes revenue, and only when the owner records what the client actually paid —
 * nothing is inferred from the brief.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const session = await requireOwnerSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Status tidak valid.' })

  const id = String(req.query.id ?? '')
  const [current] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id)).limit(1)
  if (!current) return res.status(404).json({ error: 'Permintaan tidak ditemukan.' })

  await db
    .update(serviceRequests)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(serviceRequests.id, id))

  await logActivity({
    actor: 'owner',
    action: 'Status pesanan jasa diperbarui',
    detail: `${current.code} — ${current.serviceName}: ${current.status} → ${parsed.data.status}.`,
  })

  return res.status(200).json({ ok: true })
}

