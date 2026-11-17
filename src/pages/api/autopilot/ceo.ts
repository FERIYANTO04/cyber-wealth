import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from '@/lib/auth'
import { runAgentTask } from '@/lib/autopilot'

// Keep the CEO test isolated from the seven-agent autopilot pass. This lets us
// verify model latency and persisted CEO output without triggering other work.
let running = false

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Metode tidak diizinkan' })
  }

  const session = await getSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  if (running) return res.status(429).json({ error: 'Uji AI CEO sedang berjalan.' })

  running = true
  try {
    const result = await runAgentTask('ceo')
    if (!result.ok) {
      const status = result.blocked === 'paused' || result.blocked === 'agent-paused' ? 409 : 502
      return res.status(status).json(result)
    }
    return res.status(200).json({ ran: true, agent: 'ceo', ...result })
  } catch (error) {
    console.error('[autopilot ceo test]', error)
    return res.status(500).json({ error: 'Uji AI CEO gagal. Periksa catatan agen dan log server.' })
  } finally {
    running = false
  }
}
