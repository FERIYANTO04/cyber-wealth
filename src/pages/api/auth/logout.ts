import type { NextApiRequest, NextApiResponse } from 'next'
import { clearedSessionCookie } from '@/lib/auth'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })
  res.setHeader('Set-Cookie', clearedSessionCookie())
  return res.redirect(303, '/login')
}
