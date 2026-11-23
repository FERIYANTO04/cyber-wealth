import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { db } from '@/lib/db'
import { activity, orders, products } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { orderCode } from '@/lib/revenue'
import { sendOrderRecordedEmail } from '@/lib/saas'
import { inspectProductDeliverable } from '@/lib/quality'

const Body = z.object({
  slug: z.string().trim().min(1).max(120),
  ref: z.string().trim().max(40).optional(),
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(120),
  email: z.string().trim().toLowerCase().email('Alamat email tidak valid').max(200),
})

function refFromCookie(req: NextApiRequest): string | null {
  const cookie = req.cookies.cwa_ref
  return typeof cookie === 'string' && cookie.length > 0 && cookie.length <= 40 ? cookie : null
}

const recent = new Map<string, { hits: number; since: number }>()
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 6

async function failCheckout(orderId: string, code: string, reason: string) {
  await db.update(orders).set({ status: 'failed' }).where(eq(orders.id, orderId))
  await db.insert(activity).values({
    actor: 'system',
    action: 'Checkout gagal — pesanan ditutup',
    detail: code + ': ' + reason.slice(0, 300) + '. Tidak ada pembayaran yang dibuat.',
    dataSource: 'live',
  })
}

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'unknown').split(',')[0]
  if (rateLimited(ip)) return res.status(429).json({ error: 'Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.' })

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Data pembelian tidak valid.' })

  const rows = await db.select().from(products).where(and(
    eq(products.slug, parsed.data.slug),
    eq(products.status, 'published'),
    eq(products.dataSource, 'live')
  )).limit(1)
  const product = rows[0]
  if (!product) return res.status(404).json({ error: 'Produk tidak ditemukan atau belum dijual.' })

  const inspection = await inspectProductDeliverable(product.fileKey, product.fileName)
  if (!inspection.passed) {
    return res.status(409).json({
      error: 'Produk sedang ditahan pemeriksaan kualitas. Silakan coba kembali setelah berkas diperbaiki.',
      checks: inspection.issues,
    })
  }

  const code = orderCode()
  const accessToken = crypto.randomUUID().replace(/-/g, '')
  const amount = Number(product.priceIdr)
  const isFree = amount === 0
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim() ?? ''
  const production = process.env.MIDTRANS_IS_PRODUCTION === 'true'

  const [order] = await db.insert(orders).values({
    code,
    accessToken,
    productId: product.id,
    productSlug: product.slug,
    productName: product.name,
    buyerName: parsed.data.name,
    buyerEmail: parsed.data.email,
    amountIdr: amount,
    status: isFree ? 'pending' : serverKey ? 'pending' : 'unpaid',
    provider: isFree ? 'free' : serverKey ? 'midtrans' : 'midtrans',
    refCode: parsed.data.ref ?? refFromCookie(req) ?? null,
    dataSource: 'live',
  }).returning()

  if (isFree) {
    await sendOrderRecordedEmail({ code, productName: product.name, buyerName: parsed.data.name, buyerEmail: parsed.data.email, amountIdr: amount, accessToken })
    await db.insert(activity).values({ actor: 'system', action: 'Pesanan gratis dibuat', detail: product.name + ' — ' + code + '. Tidak ada pembayaran.', dataSource: 'live' })
    return res.status(201).json({ ok: true, token: accessToken, free: true })
  }

  if (!serverKey) {
    await db.insert(activity).values({
      actor: 'system',
      action: 'Checkout menunggu aktivasi Midtrans',
      detail: product.name + ' — ' + code + '. Kunci merchant Midtrans belum terpasang; tidak ada tagihan atau pembayaran dibuat.',
      dataSource: 'live',
    })
    return res.status(201).json({ ok: true, token: accessToken, provider: 'midtrans', paymentUnavailable: true })
  }

  const base = production ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com'
  try {
    const response = await fetch(base + '/snap/v1/transactions', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(serverKey + ':').toString('base64'),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        transaction_details: { order_id: code, gross_amount: amount },
        customer_details: { first_name: parsed.data.name, email: parsed.data.email },
        item_details: [{ id: product.id, price: amount, quantity: 1, name: product.name.slice(0, 50) }],
        callbacks: { finish: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cyber-wealth-web-production.up.railway.app') + '/pesanan/' + accessToken },
      }),
      signal: AbortSignal.timeout(15000),
    })
    const payload = await response.json().catch(() => ({})) as { token?: string; redirect_url?: string; error_messages?: string[] }
    if (!response.ok || !payload.redirect_url || !payload.token) {
      await failCheckout(order.id, code, (payload.error_messages ?? ['Midtrans menolak pembuatan transaksi']).join('; '))
      return res.status(502).json({ error: 'Gerbang pembayaran belum dapat membuat tagihan. Coba lagi nanti.' })
    }

    await db.update(orders).set({ invoiceId: payload.token, invoiceUrl: payload.redirect_url }).where(eq(orders.id, order.id))
    await sendOrderRecordedEmail({ code, productName: product.name, buyerName: parsed.data.name, buyerEmail: parsed.data.email, amountIdr: amount, accessToken })
    await db.insert(activity).values({
      actor: 'system',
      action: 'Tagihan Midtrans diterbitkan',
      detail: product.name + ' — ' + code + '. Menunggu konfirmasi pembayaran resmi; belum dihitung sebagai pendapatan.',
      dataSource: 'live',
    })
    return res.status(201).json({ ok: true, token: accessToken, provider: 'midtrans', paymentUrl: payload.redirect_url })
  } catch {
    await failCheckout(order.id, code, 'koneksi ke Midtrans gagal atau timeout')
    return res.status(502).json({ error: 'Tidak dapat menghubungi gerbang pembayaran. Tidak ada pembayaran yang dibuat.' })
  }
}
