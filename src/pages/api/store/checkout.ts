import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { activity, orders, products } from '@/lib/db/schema'
import { orderCode } from '@/lib/revenue'
import { sendOrderRecordedEmail } from '@/lib/saas'
import { hasConfiguredBankTransferDetails } from '@/lib/bank-transfer'
import { createMidtransSnapPayment, midtransConfigured } from '@/lib/midtrans'

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
 * Starts a purchase. Midtrans Snap is preferred when configured; otherwise the
 * existing manual-transfer path is used only when complete bank instructions exist.
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
    .where(and(
      eq(products.slug, parsed.data.slug),
      eq(products.status, 'published'),
      eq(products.dataSource, 'live')
    ))
    .limit(1)
  const product = rows[0]
  if (!product) return res.status(404).json({ error: 'Produk tidak ditemukan atau belum dijual.' })

  const code = orderCode()
  const accessToken = crypto.randomUUID().replace(/-/g, '')
  const amount = Number(product.priceIdr)
  const useMidtrans = amount > 0 && midtransConfigured()
  const useManualTransfer = amount > 0 && !useMidtrans && hasConfiguredBankTransferDetails()
  const provider = useMidtrans ? 'midtrans' : 'manual_transfer'
  const status = amount > 0 && !useMidtrans && !useManualTransfer ? 'unpaid' : 'pending'

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
      status,
      provider,
      refCode: parsed.data.ref ?? refFromCookie(req) ?? null,
      dataSource: 'live',
    })
    .returning()

  if (amount === 0) {
    await sendOrderRecordedEmail({
      code,
      productName: product.name,
      buyerName: parsed.data.name,
      buyerEmail: parsed.data.email,
      amountIdr: amount,
      accessToken,
    })
    await db.insert(activity).values({
      actor: 'system',
      action: 'Pesanan gratis dibuat',
      detail: product.name + ' — ' + code + '. Tidak ada pembayaran yang perlu dikonfirmasi.',
      dataSource: 'live',
    })
    return res.status(201).json({ ok: true, token: accessToken, free: true })
  }

  if (useMidtrans) {
    try {
      const payment = await createMidtransSnapPayment({
        orderCode: code,
        amountIdr: amount,
        productId: product.id,
        productName: product.name,
        buyerName: parsed.data.name,
        buyerEmail: parsed.data.email,
        accessToken,
      })
      await db
        .update(orders)
        .set({ invoiceId: payment.token, invoiceUrl: payment.redirectUrl })
        .where(eq(orders.id, order.id))

      await sendOrderRecordedEmail({
        code,
        productName: product.name,
        buyerName: parsed.data.name,
        buyerEmail: parsed.data.email,
        amountIdr: amount,
        accessToken,
      })
      await db.insert(activity).values({
        actor: 'system',
        action: 'Halaman pembayaran Midtrans dibuat',
        detail: product.name + ' — ' + code + '. Pembayaran menunggu konfirmasi server Midtrans.',
        dataSource: 'live',
      })
      return res.status(201).json({ ok: true, token: accessToken, paymentUrl: payment.redirectUrl })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kesalahan pembayaran tidak diketahui.'
      await db.update(orders).set({ status: 'unpaid' }).where(eq(orders.id, order.id))
      await db.insert(activity).values({
        actor: 'system',
        action: 'Pembuatan pembayaran gagal',
        detail: code + ' — ' + message.slice(0, 400),
        dataSource: 'live',
      })
      return res.status(502).json({
        token: accessToken,
        error: 'Halaman pembayaran belum berhasil dibuat. Pesanan belum dibayar; coba lagi nanti.',
      })
    }
  }

  if (!useManualTransfer) {
    await db.insert(activity).values({
      actor: 'system',
      action: 'Checkout belum siap',
      detail: code + ' — rekening bank belum dikonfigurasi dan payment gateway belum aktif. Tidak ada pembayaran yang diminta.',
      dataSource: 'live',
    })
    return res.status(201).json({
      ok: true,
      token: accessToken,
      unpaid: true,
      message: 'Pembayaran belum tersedia untuk sementara.',
    })
  }

  await sendOrderRecordedEmail({
    code,
    productName: product.name,
    buyerName: parsed.data.name,
    buyerEmail: parsed.data.email,
    amountIdr: amount,
    accessToken,
  })
  await db.insert(activity).values({
    actor: 'system',
    action: 'Pesanan menunggu transfer manual',
    detail: product.name + ' — ' + code + '. Pemilik harus memeriksa dana masuk sebelum menandai lunas.',
    dataSource: 'live',
  })

  return res.status(201).json({ ok: true, token: accessToken, manualPayment: true })
}
