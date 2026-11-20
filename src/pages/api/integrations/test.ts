import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { requireOwnerSession } from '@/lib/auth'
import { logActivity } from '@/lib/data'
import { testAi, storageStatus, testPaddle } from '@/lib/integrations'
import { testEmail } from '@/lib/email'

const Body = z.object({
  target: z.enum(['ai', 'email', 'paddle', 'storage', 'all']),
})

/**
 * Calls the provider for real and reports what came back. This is the only way the
 * owner learns whether a key works — the screen never assumes a saved key is a
 * working one.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const session = await requireOwnerSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Permintaan tidak valid.' })

  const target = parsed.data.target
  const results: Record<string, { state: string; message: string }> = {}

  if (target === 'ai' || target === 'all') results.ai = await testAi()
  if (target === 'email' || target === 'all') results.email = await testEmail()
  if (target === 'storage' || target === 'all') results.storage = await storageStatus()
  if (target === 'paddle' || target === 'all') results.paddle = await testPaddle()

  const summary = Object.entries(results)
    .map(([key, value]) => `${key}: ${value.state}`)
    .join(', ')

  await logActivity({
    actor: 'owner',
    action: 'Koneksi layanan diuji',
    detail: `Pemeriksaan ${target} — ${summary}.`,
  })

  return res.status(200).json({ ok: true, results })
}
