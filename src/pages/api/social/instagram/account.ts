import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { checkInstagramConnection, disconnectInstagram } from '@/lib/instagram'

const Body = z.object({ action: z.enum(['check', 'disconnect']) })

/** Live status and disconnect for Instagram. Never returns a token. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const session = await getSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Permintaan tidak valid.' })

  if (parsed.data.action === 'disconnect') {
    await disconnectInstagram()
    return res.status(200).json({ ok: true })
  }

  return res.status(200).json({ ok: true, result: await checkInstagramConnection() })
}
