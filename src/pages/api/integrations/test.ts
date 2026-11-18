import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { requireOwnerSession } from '@/lib/auth'
import { logActivity } from '@/lib/data'
import { testAi, storageStatus, bankTransferStatus } from '@/lib/integrations'
import { testEmail } from '@/lib/email'
import { checkFacebookConnection } from '@/lib/meta'
import { checkInstagramConnection } from '@/lib/instagram'

const Body = z.object({
  target: z.enum(['ai', 'bank', 'email', 'social', 'storage', 'all']),
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
  if (target === 'bank' || target === 'all') results.bank = bankTransferStatus()
  if (target === 'email' || target === 'all') results.email = await testEmail()
  if (target === 'storage' || target === 'all') results.storage = await storageStatus()

  if (target === 'social' || target === 'all') {
    // Both channel checks ask Meta about the account that is actually stored.
    const [facebook, instagram] = [await checkFacebookConnection(), await checkInstagramConnection()]
    results.facebook = { state: facebook.state, message: facebook.message }
    results.instagram = { state: instagram.state, message: instagram.message }
    results.social = {
      state:
        facebook.state === 'ready' || instagram.state === 'ready'
          ? 'ready'
          : facebook.state === 'missing' && instagram.state === 'missing'
            ? 'missing'
            : 'error',
      message: `Facebook: ${facebook.message} Instagram: ${instagram.message}`,
    }
  }

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
