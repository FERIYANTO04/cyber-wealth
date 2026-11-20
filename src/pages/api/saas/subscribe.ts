import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { activity, plans, subscriptions } from '@/lib/db/schema'
import { addInterval, intervalOf } from '@/lib/billing'
import { sendEmail, notifyOwner } from '@/lib/email'
import { money } from '@/lib/format'

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

/** Paid plans stay disabled until recurring Paddle checkout and webhooks are ready. */
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

  const amount = Number(plan.priceIdr)
  if (amount > 0) {
    return res.status(503).json({
      error: 'Pembayaran langganan berbayar belum tersedia melalui Paddle. Pendaftaran tidak dibuat dan tidak ada pembayaran yang diminta.',
    })
  }

  const accessToken = crypto.randomUUID()
  const interval = intervalOf(plan.interval)
  const periodEnd = addInterval(new Date(), interval)
  const [row] = await db.insert(subscriptions).values({
    accessToken,
    planId: plan.id,
    planName: plan.name,
    accountEmail: parsed.data.email,
    accountName: parsed.data.name,
    amountIdr: 0,
    interval,
    status: 'active',
    paidAt: new Date(),
    periodEnd,
    autoRenew: false,
    autoRenewAt: null,
  }).returning()

  await db.insert(activity).values({
    actor: 'system',
    action: 'Paket gratis diaktifkan',
    detail: `${plan.name} untuk ${parsed.data.email}. Tidak ada pembayaran.`,
    dataSource: 'live',
  })

  await sendEmail({
    to: parsed.data.email,
    subject: `Paket gratis ${plan.name} aktif`,
    body: [`Halo ${parsed.data.name},`, '', `Paket gratis ${plan.name} sudah aktif.`, `Berlaku sampai: ${periodEnd.toISOString()}`, `Status: /langganan/status/${accessToken}`].join('\n'),
    kind: 'subscription-created-free',
    relatedType: 'subscription',
    relatedId: row.id,
  })
  await notifyOwner({
    subject: `Paket gratis diaktifkan: ${plan.name}`,
    lines: [`${parsed.data.name} (${parsed.data.email}) mengaktifkan paket gratis.`, `Nilai: ${money(0)}`],
    kind: 'owner-subscription-created-free',
    relatedId: row.id,
  }).catch(() => undefined)

  return res.status(201).json({ ok: true, accessToken, free: true })
}
