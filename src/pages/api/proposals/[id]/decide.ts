import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { agents, proposals, transactions } from '@/lib/db/schema'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/data'

const Body = z.object({
  decision: z.enum(['approved', 'rejected']),
  note: z.string().trim().max(400).optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const session = await getSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  const id = String(req.query.id ?? '')
  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Keputusan tidak valid' })

  const rows = await db
    .select({ proposal: proposals, agentName: agents.name })
    .from(proposals)
    .leftJoin(agents, eq(proposals.agentId, agents.id))
    .where(and(eq(proposals.id, id), eq(proposals.status, 'pending')))
    .limit(1)

  const found = rows[0]
  if (!found) {
    return res.status(409).json({ error: 'Usulan ini sudah diputuskan atau tidak ditemukan.' })
  }

  const { decision, note } = parsed.data

  await db
    .update(proposals)
    .set({ status: decision, decisionNote: note ?? null, decidedAt: new Date() })
    .where(eq(proposals.id, id))

  // An approved live financial proposal is booked into the ledger so the money
  // picture moves with the decision. Demo proposals never touch real figures, and
  // no external payment is executed here.
  if (
    decision === 'approved' &&
    found.proposal.dataSource === 'live' &&
    found.proposal.amountIdr &&
    found.proposal.category === 'finance'
  ) {
    await db.insert(transactions).values({
      kind: 'expense',
      category: 'Disetujui pemilik',
      description: found.proposal.title,
      amountIdr: Number(found.proposal.amountIdr),
      dataSource: 'live',
    })
  }

  await logActivity({
    actor: 'owner',
    action: decision === 'approved' ? 'Usulan disetujui' : 'Usulan ditolak',
    agentName: found.agentName ?? null,
    detail: `${found.proposal.title}${note ? ` — catatan: ${note}` : ''}`,
  })

  return res.status(200).json({ ok: true, status: decision })
}
