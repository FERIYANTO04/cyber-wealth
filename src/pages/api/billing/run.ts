import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from '@/lib/auth'
import { runBillingPass } from '@/lib/billing'

let running = false

/**
 * The billing pass, run on request. Like the autopilot it does all its work before
 * answering, because a published app has no process left running after a response.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const session = await getSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  if (running) return res.status(200).json({ ok: true, remindersSent: 0, invoicesCreated: 0, expired: 0, scheduled: 0, notes: ['Putaran sebelumnya masih berjalan.'] })

  running = true
  try {
    const result = await runBillingPass('owner')
    return res.status(200).json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Kesalahan tidak diketahui'
    console.error('[billing run]', message)
    return res.status(500).json({ error: `Putaran penagihan gagal: ${message}` })
  } finally {
    running = false
  }
}
