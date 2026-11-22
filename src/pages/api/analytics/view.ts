import type { NextApiRequest, NextApiResponse } from 'next'
import { createHash, createHmac, randomBytes } from 'node:crypto'
import { db } from '@/lib/db'
import { siteVisit } from '@/lib/db/schema'

function readCookie(value: string | undefined, name: string): string | undefined {
  return value?.split(';').map((v) => v.trim()).find((v) => v.startsWith(name + '='))?.slice(name.length + 1)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const path = typeof req.body?.path === 'string' ? req.body.path : ''
  if (!path.startsWith('/') || path.startsWith('//') || path.length > 180 ||
      /^\/(api|owner|login|logout|talent-admin)(\/|$)/i.test(path) ||
      /\.(?:js|css|png|jpe?g|svg|ico|woff2?)$/i.test(path)) {
    return res.status(400).json({ error: 'Invalid page path' })
  }
  const ua = req.headers['user-agent'] || ''
  if (/bot|crawler|spider|headless|preview|facebookexternalhit|whatsapp/i.test(ua)) {
    return res.status(204).end()
  }
  const secret = process.env.JWT_SECRET
  if (!secret) return res.status(503).json({ error: 'Analytics unavailable' })
  let visitor = readCookie(req.headers.cookie, 'cw_visitor')
  const headers: string[] = []
  if (!visitor || !/^[a-f0-9]{48}$/.test(visitor)) {
    visitor = randomBytes(24).toString('hex')
    headers.push(`cw_visitor=${visitor}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`)
  }
  if (headers.length) res.setHeader('Set-Cookie', headers)
  const visitorHash = createHmac('sha256', secret).update(visitor).digest('hex')
  await db.insert(siteVisit).values({
    id: createHash('sha256').update(randomBytes(32)).digest('hex'),
    visitorHash,
    path: path.split('?')[0],
  })
  return res.status(204).end()
}
