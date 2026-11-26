import type { NextApiRequest, NextApiResponse } from 'next'
import { getOrderByToken } from '@/lib/revenue'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Metode tidak diizinkan.' })
  }

  const token = typeof req.query.token === 'string' ? req.query.token : ''
  if (!/^[a-f0-9]{32}$/i.test(token)) {
    return res.status(404).json({ error: 'Pesanan tidak ditemukan.' })
  }

  const order = await getOrderByToken(token)
  if (!order) return res.status(404).json({ error: 'Pesanan tidak ditemukan.' })

  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  return res.status(200).json({
    status: order.status,
    paidAt: order.paidAt ? order.paidAt.toISOString() : null,
  })
}
