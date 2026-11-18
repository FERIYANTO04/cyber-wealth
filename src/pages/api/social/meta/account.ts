import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { requireOwnerSession } from '@/lib/auth'
import { checkFacebookConnection, disconnectFacebook } from '@/lib/meta'

const Body = z.object({ action: z.enum(['check', 'disconnect']) })

/** Live status and disconnect for the connected page. Never returns the token. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const session = await requireOwnerSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Permintaan tidak valid.' })

  if (parsed.data.action === 'disconnect') {
    await disconnectFacebook()
    return res.status(200).json({ ok: true })
  }

  const result = await checkFacebookConnection()
  return res.status(200).json({ ok: true, result })
}
