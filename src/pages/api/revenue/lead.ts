import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { db } from '@/lib/db'
import { revenueLeads } from '@/lib/db/schema'
import { requireOwnerSession } from '@/lib/auth'
import { logActivity } from '@/lib/data'

const Body = z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(200), market: z.enum(['Indonesia', 'International']), interest: z.string().trim().min(2).max(300) })
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })
  if (!await requireOwnerSession(req)) return res.status(401).json({ error: 'Silakan login sebagai OWNER.' })
  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Periksa nama, email, pasar, dan minat calon pelanggan.' })
  const [lead] = await db.insert(revenueLeads).values(parsed.data).returning()
  await logActivity({ actor: 'owner', action: 'Calon pelanggan ditambahkan', detail: `${lead.name} — ${lead.market}; belum menjadi penjualan.` })
  return res.status(201).json({ lead })
}
