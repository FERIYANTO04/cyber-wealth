import type { NextApiRequest, NextApiResponse } from 'next'
import { requireOwnerSession } from '@/lib/auth'
import { runAutopilot } from '@/lib/autopilot'
import { logActivity } from '@/lib/data'

// A whole pass does database work and, when configured, a few model calls. Thirty
// seconds is the hard limit on the published app, so this refuses to start twice at
// once and reports exactly what each task produced.
let running = false

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const session = await requireOwnerSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  if (running) {
    return res.status(429).json({ error: 'Autopilot sedang berjalan. Tunggu sampai putaran ini selesai.' })
  }

  running = true
  try {
    const result = await runAutopilot('owner')
    if (result.paused) {
      return res.status(409).json({ error: 'Operasi dijeda. Lanjutkan operasi untuk menjalankan autopilot.', paused: true })
    }
    await logActivity({
      actor: 'system',
      action: 'Autopilot dijalankan pemilik',
      detail: result.results.map((item) => `${item.label}: ${item.summary}`).join(' · '),
    })
    return res.status(200).json(result)
  } finally {
    running = false
  }
}
