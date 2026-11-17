import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { agents } from '@/lib/db/schema'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/data'

const Body = z.object({ status: z.enum(['active', 'paused']) })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const session = await getSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  const id = String(req.query.id ?? '')
  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Status tidak valid' })

  const rows = await db.select().from(agents).where(eq(agents.id, id)).limit(1)
  if (rows.length === 0) return res.status(404).json({ error: 'Agen tidak ditemukan.' })

  await db.update(agents).set({ status: parsed.data.status }).where(eq(agents.id, id))

  await logActivity({
    actor: 'owner',
    agentName: rows[0].name,
    action: parsed.data.status === 'active' ? 'Agen diaktifkan' : 'Agen dijeda',
    detail:
      parsed.data.status === 'active'
        ? `${rows[0].name} kembali menjalankan mandatnya.`
        : `${rows[0].name} berhenti sampai diaktifkan lagi.`,
  })

  return res.status(200).json({ ok: true, status: parsed.data.status })
}
