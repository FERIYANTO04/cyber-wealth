import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { requireOwnerSession } from '@/lib/auth'
import { SETTINGS_ID, getSettings, logActivity } from '@/lib/data'

const Body = z.object({ paused: z.boolean() })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const session = await requireOwnerSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Permintaan tidak valid' })

  const current = await getSettings()
  if (current.aiPaused === parsed.data.paused) {
    return res.status(200).json({ paused: current.aiPaused })
  }

  await db
    .update(settings)
    .set({ aiPaused: parsed.data.paused, pausedAt: parsed.data.paused ? new Date() : null })
    .where(eq(settings.id, SETTINGS_ID))

  await logActivity({
    actor: 'owner',
    action: parsed.data.paused ? 'Operasi AI dijeda' : 'Operasi AI dilanjutkan',
    detail: parsed.data.paused
      ? 'Pemilik menghentikan semua agen. Tidak ada alur kerja yang berjalan sampai dilanjutkan.'
      : 'Pemilik melanjutkan operasi. Agen kembali menjalankan alur kerja yang sudah disetujui.',
  })

  return res.status(200).json({ paused: parsed.data.paused })
}
