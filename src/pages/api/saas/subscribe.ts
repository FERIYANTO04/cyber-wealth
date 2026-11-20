import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { plans } from '@/lib/db/schema'

const Body = z.object({
  code: z.string().trim().min(1).max(60),
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(120),
  email: z.string().trim().toLowerCase().email('Alamat email tidak valid').max(200),
})

const hits = new Map<string, { n: number; at: number }>()
function limited(ip: string): boolean {
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now - entry.at > 60_000) {
    hits.set(ip, { n: 1, at: now })
    if (hits.size > 5000) hits.clear()
    return false
  }
  entry.n += 1
  return entry.n > 5
}

/**
 * Paid subscriptions are disabled until recurring Paddle checkout and its webhook
 * lifecycle are fully implemented. Never fall back to manual bank transfer.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'unknown').split(',')[0]
  if (limited(ip)) return res.status(429).json({ error: 'Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.' })

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' })

  const [plan] = await db
    .select()
    .from(plans)
    .where(and(eq(plans.code, parsed.data.code), eq(plans.status, 'published')))
    .limit(1)
  if (!plan) return res.status(404).json({ error: 'Paket langganan tidak ditemukan.' })

  if (Number(plan.priceIdr) > 0) {
    return res.status(503).json({
      error: 'Pembayaran langganan berbayar belum tersedia melalui Paddle. Pendaftaran tidak dibuat dan tidak ada pembayaran yang diminta.',
    })
  }

  return res.status(503).json({
    error: 'Pendaftaran paket gratis sementara dinonaktifkan. Tidak ada pesanan atau pembayaran yang dibuat.',
  })
}
