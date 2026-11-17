import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { db } from '@/lib/db'
import { activity, orders } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { products } from '@/lib/db/schema'
import { orderCode } from '@/lib/revenue'
import { sendOrderRecordedEmail } from '@/lib/saas'

const Body = z.object({
  slug: z.string().trim().min(1).max(120),
  ref: z.string().trim().max(40).optional(),
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(120),
  email: z.string().trim().toLowerCase().email('Alamat email tidak valid').max(200),
})

/** The tracked link the buyer arrived through, if the redirect set one. */
function refFromCookie(req: NextApiRequest): string | null {
  const cookie = req.cookies.cwa_ref
  return typeof cookie === 'string' && cookie.length > 0 && cookie.length <= 40 ? cookie : null
}

// The published app may run several instances, so this is a best-effort brake, not a
// guarantee: it stops one instance being hammered by a single buyer.
const recent = new Map<string, { hits: number; since: number }>()
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 6

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = recent.get(ip)
  if (!entry || now - entry.since > WINDOW_MS) {
    recent.set(ip, { hits: 1, since: now })
    if (recent.size > 5000) recent.clear()
    return false
  }
  entry.hits += 1
  return entry.hits > MAX_PER_WINDOW
}

/**
 * Starts a purchase using manual bank transfer. An owner must verify receipt
 * before the order is marked paid and the digital product is delivered.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'unknown').split(',')[0]
  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.' })
  }

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Data pembelian tidak valid.' })
  }

  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.slug, parsed.data.slug), eq(products.status, 'published')))
    .limit(1)
  const product = rows[0]
  if (!product) return res.status(404).json({ error: 'Produk tidak ditemukan atau belum dijual.' })

  const code = orderCode()
  const accessToken = crypto.randomUUID().replace(/-/g, '')
  const amount = Number(product.priceIdr)

  const [order] = await db
    .insert(orders)
    .values({
      code,
      accessToken,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      buyerName: parsed.data.name,
      buyerEmail: parsed.data.email,
      amountIdr: amount,
      status: 'pending',
      provider: 'manual_transfer',
      refCode: parsed.data.ref ?? refFromCookie(req) ?? null,
      dataSource: 'live',
    })
    .returning()

  await sendOrderRecordedEmail({
    code,
    productName: product.name,
    buyerName: parsed.data.name,
    buyerEmail: parsed.data.email,
    amountIdr: amount,
    accessToken,
  })

  if (amount === 0) {
    await db.insert(activity).values({
      actor: 'system',
      action: 'Pesanan gratis dibuat',
      detail: `${product.name} — ${code}. Tidak ada pembayaran yang perlu dikonfirmasi.`,
      dataSource: 'live',
    })
    return res.status(201).json({ ok: true, token: accessToken, free: true })
  }

  await db.insert(activity).values({
    actor: 'system',
    action: 'Pesanan menunggu transfer manual',
    detail: `${product.name} — ${code}. Pemilik harus memeriksa dana masuk sebelum menandai lunas.`,
    dataSource: 'live',
  })

  return res.status(201).json({ ok: true, token: accessToken, manualPayment: true })
}
