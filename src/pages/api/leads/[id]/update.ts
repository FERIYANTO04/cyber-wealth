import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { revenueLeads } from '@/lib/db/schema'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/data'

const Body = z.object({
  status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']).optional(),
  notes: z.string().trim().max(2000).optional(),
  markContacted: z.boolean().optional(),
})

const STAGE: Record<string, string> = {
  new: 'baru',
  contacted: 'sudah dihubungi',
  qualified: 'terkualifikasi',
  proposal: 'penawaran',
  won: 'menang',
  lost: 'tidak lanjut',
}

/** Moves one prospect through the CRM and keeps the audit trail honest. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const session = await getSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Perubahan tidak valid.' })

  const id = String(req.query.id ?? '')
  const [current] = await db.select().from(revenueLeads).where(eq(revenueLeads.id, id)).limit(1)
  if (!current) return res.status(404).json({ error: 'Prospek tidak ditemukan.' })

  const next = {
    status: parsed.data.status ?? current.status,
    notes: parsed.data.notes ?? current.notes,
    lastContactedAt: parsed.data.markContacted ? new Date() : current.lastContactedAt,
  }

  await db.update(revenueLeads).set(next).where(eq(revenueLeads.id, id))

  const changes: string[] = []
  if (parsed.data.status && parsed.data.status !== current.status) {
    changes.push(`tahap ${STAGE[current.status] ?? current.status} → ${STAGE[parsed.data.status] ?? parsed.data.status}`)
  }
  if (parsed.data.notes !== undefined && parsed.data.notes !== current.notes) changes.push('catatan diperbarui')
  if (parsed.data.markContacted) changes.push('ditandai sudah dihubungi')

  await logActivity({
    actor: 'owner',
    action: 'Prospek diperbarui',
    detail: `${current.name} (${current.email}) — ${changes.length > 0 ? changes.join(', ') : 'tanpa perubahan'}. Masih prospek, bukan penjualan.`,
  })

  return res.status(200).json({ ok: true, lead: next })
}
