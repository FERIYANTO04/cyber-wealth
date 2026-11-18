import type { NextApiRequest, NextApiResponse } from 'next'
import { requireOwnerSession } from '@/lib/auth'
import { connectInstagram } from '@/lib/instagram'

/**
 * Connects the Instagram business account linked to the Facebook Page the owner already
 * authorised. No second login and no pasted token: Meta itself names the account, and the
 * route answers with its name only — never a token.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const session = await requireOwnerSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  const result = await connectInstagram({ connectedBy: session.ownerId })
  if (!result.ok) return res.status(409).json({ error: result.error })
  return res.status(200).json({ ok: true, account: result.account })
}
