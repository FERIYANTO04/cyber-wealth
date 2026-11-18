import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contactMessages } from '@/lib/db/schema'
import { requireOwnerSession } from '@/lib/auth'
import { logActivity } from '@/lib/data'

const Patch = z.object({
  id: z.string().uuid(),
  status: z.enum(['new', 'answered']),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await requireOwnerSession(req))) return res.status(401).json({ error: 'Sesi pemilik tidak ditemukan.' })
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Metode tidak diizinkan.' })

  const parsed = Patch.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Permintaan tidak valid.' })

  const [row] = await db
    .update(contactMessages)
    .set({ status: parsed.data.status })
    .where(eq(contactMessages.id, parsed.data.id))
    .returning()

  if (!row) return res.status(404).json({ error: 'Pesan tidak ditemukan.' })

  await logActivity({
    actor: 'owner',
    action: 'Status pesan kontak diubah',
    detail: `${row.subject} — ${parsed.data.status === 'answered' ? 'sudah dijawab' : 'dibuka kembali'}.`,
  })

  return res.status(200).json({ ok: true })
}
