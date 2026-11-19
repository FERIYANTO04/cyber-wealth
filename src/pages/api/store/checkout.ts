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
    .where(and(eq(products.slug, parsed.data.slug), eq(products.status, 'published'), eq(products.dataSource, 'live')))
    .limit(1)
  const product = rows[0]
  if (!product) return res.status(404).json({ error: 'Produk tidak ditemukan atau belum dijual.' })

  // Never accept money for a missing or explicitly draft-labelled deliverable.
  // Storefront filtering is the first guard; this server-side check protects direct API calls too.
  if (!product.fileKey || /(?:draft|draf)/i.test(product.fileName ?? '')) {
    return res.status(409).json({
      error: 'Berkas produk masih dalam pemeriksaan dan belum tersedia untuk dibeli.',
    })
  }

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
      detail: `${product.name} — ${code}. Tidak ada pembayaran yang perlu dikonfirmasi.`,
      dataSource: 'live',
    })
    return res.status(201).json({ ok: true, token: accessToken, free: true })
  }

  const paddleApiKey = process.env.PADDLE_API_KEY ?? ''
  if (!paddleApiKey) {
    return res.status(503).json({ error: 'Pembayaran Paddle belum diaktifkan. Pesanan belum dibayar.' })
  }
  const priceMapRaw = process.env.PADDLE_PRICE_IDS ?? '{}'
  let paddlePriceId: string | undefined
  try {
    const priceMap = JSON.parse(priceMapRaw) as Record<string, string>
    paddlePriceId = priceMap[product.slug] || process.env.PADDLE_DEFAULT_PRICE_ID
  } catch {
    return res.status(503).json({ error: 'Konfigurasi katalog pembayaran belum valid. Pesanan belum dibayar.' })
  }

  if (paddleApiKey) {
    const apiBase = process.env.PADDLE_ENV === 'sandbox' ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com'
    let transactionItem: Record<string, unknown>

    if (paddlePriceId && /^pri_[a-z0-9]{26}$/i.test(paddlePriceId)) {
      transactionItem = { price_id: paddlePriceId, quantity: 1 }
    } else {
      // Paddle does not list IDR as a supported payment currency. Convert the
      // catalog's IDR price using a live FX quote, then send a one-off non-catalog
      // USD price. No hard-coded exchange rate and no silent fallback.
      const fxResponse = await fetch('https://open.er-api.com/v6/latest/IDR', { cache: 'no-store' }).catch(() => null)
      const fxPayload = await fxResponse?.json().catch(() => null) as {
        result?: string
        rates?: { USD?: number }
      } | null
      const usdPerIdr = fxPayload?.result === 'success' ? Number(fxPayload.rates?.USD) : 0
      if (!Number.isFinite(usdPerIdr) || usdPerIdr <= 0) {
        await db.insert(activity).values({
          actor: 'system', action: 'Konversi harga Paddle gagal',
          detail: code + ': kurs IDR/USD tidak tersedia. Tidak ada pembayaran yang dibuat.',
          dataSource: 'live',
        })
        return res.status(503).json({ error: 'Kurs pembayaran sedang tidak tersedia. Pesanan belum dibayar; coba lagi.' })
      }

      const usdCents = Math.round(amount * usdPerIdr * 100)
      if (usdCents < 70) {
        return res.status(409).json({ error: 'Harga produk berada di bawah minimum pembayaran Paddle (USD 0,70). Pesanan belum dibayar.' })
      }

      transactionItem = {
        quantity: 1,
        price: {
          description: 'One-time digital product purchase ' + code,
          name: product.name.slice(0, 150),
          billing_cycle: null,
          tax_mode: 'account_setting',
          unit_price: { amount: String(usdCents), currency_code: 'USD' },
          product: {
            name: product.name.slice(0, 200),
            description: product.summary.slice(0, 2048),
            tax_category: 'digital-goods',
          },
        },
      }
    }

    const response = await fetch(apiBase + '/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + paddleApiKey },
      body: JSON.stringify({
        items: [transactionItem],
        custom_data: { order_code: code, access_token: accessToken, product_slug: product.slug, amount_idr: amount },
      }),
      cache: 'no-store',
    })
    const payload = await response.json().catch(() => null) as {
      data?: { id?: string; status?: string; checkout?: { url?: string | null } }
      error?: { detail?: string; code?: string }
    } | null

    if (!response.ok || !payload?.data?.id || !payload.data.checkout?.url) {
      await db.insert(activity).values({
        actor: 'system', action: 'Pembuatan checkout Paddle gagal',
        detail: code + ': ' + String(payload?.error?.detail ?? payload?.error?.code ?? response.status).slice(0, 300),
        dataSource: 'live',
      })
      return res.status(502).json({ error: 'Paddle belum dapat membuat checkout. Pesanan belum dibayar; coba lagi.' })
    }

    await db.update(orders).set({ provider: 'paddle', invoiceId: payload.data.id, invoiceUrl: payload.data.checkout.url }).where(eq(orders.id, order.id))
    await db.insert(activity).values({
      actor: 'system', action: 'Checkout Paddle dibuat',
      detail: product.name + ' — ' + code + '. Menunggu konfirmasi pembayaran resmi dari Paddle.',
      dataSource: 'live',
    })
    return res.status(201).json({ ok: true, token: accessToken, paymentUrl: payload.data.checkout.url, provider: 'paddle' })
  }

  await sendOrderRecordedEmail({ code, productName: product.name, buyerName: parsed.data.name, buyerEmail: parsed.data.email, amountIdr: amount, accessToken })
  await db.insert(activity).values({ actor: 'system', action: 'Pesanan menunggu transfer manual',
    detail: `${product.name} — ${code}. Pemilik harus memeriksa dana masuk sebelum menandai lunas.`, dataSource: 'live' })
  return res.status(201).json({ ok: true, token: accessToken, manualPayment: true })
}
