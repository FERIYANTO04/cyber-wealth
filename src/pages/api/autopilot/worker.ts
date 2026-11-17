import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from '@/lib/auth'
import { processNextQueuedAgentTask } from '@/lib/autopilot'

// One request claims and processes at most one durable queue item.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Metode tidak diizinkan' })
  }
  const session = await getSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  try {
    const result = await processNextQueuedAgentTask()
    return res.status(200).json(result)
  } catch (error) {
    console.error('[agent queue worker]', error)
    return res.status(500).json({ error: 'Worker antrean gagal. Periksa log server.' })
  }
}
