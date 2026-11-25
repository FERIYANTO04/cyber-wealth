import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { and, desc, eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { db } from '@/lib/db'
import { servicePayments, serviceRequests } from '@/lib/db/schema'

const Body = z.object({ token: z.string().trim().min(24).max(64) })

function paymentCode() {
  const stamp = new Date().toISOString().slice(2, 10).replace(/-/g, '')
  return `CWS-${stamp}-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

/** Creates or resumes a customer-approved service invoice; the token is the customer's private access credential. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })
  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Tautan permintaan tidak valid.' })

  const [request] = await db.select().from(serviceRequests)
    .where(eq(serviceRequests.proposalToken, parsed.data.token)).limit(1)
  if (!request) return res.status(404).json({ error: 'Permintaan tidak ditemukan.' })
  if (!request.proposalBody || request.proposalAmountIdr === null || Number(request.proposalAmountIdr) <= 0) {
    return res.status(409).json({ error: 'Penawaran belum tersedia atau belum memiliki nilai pembayaran.' })
  }
  if (['lost', 'delivered'].includes(request.status)) {
    return res.status(409).json({ error: 'Permintaan ini sudah ditutup.' })
  }

  const payments = await db.select().from(servicePayments)
    .where(and(eq(servicePayments.serviceRequestId, request.id), eq(servicePayments.dataSource, 'live')))
    .orderBy(desc(servicePayments.createdAt)).limit(1)
  const current = payments[0]
  if (current?.status === 'paid') return res.status(200).json({ ok: true, paid: true })
  if (current?.status === 'pending' && current.invoiceUrl) {
    return res.status(200).json({ ok: true, paymentUrl: current.invoiceUrl })
  }

  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim() ?? ''
  if (!serverKey) return res.status(503).json({ error: 'Pembayaran online belum dikonfigurasi. Tidak ada tagihan dibuat.' })
  const production = process.env.MIDTRANS_IS_PRODUCTION === 'true'
  const base = production ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com'
  const amount = Number(request.proposalAmountIdr)
  const payment = current ?? (await db.insert(servicePayments).values({
    code: paymentCode(),
    serviceRequestId: request.id,
    amountIdr: amount,
    buyerName: request.name,
    buyerEmail: request.email,
    status: 'pending',
    provider: 'midtrans',
    dataSource: 'live',
  }).returning())[0]

  if (!payment) return res.status(500).json({ error: 'Catatan pembayaran tidak dapat dibuat.' })

  const site = (process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || 'https://cyber-wealth-web-production.up.railway.app').replace(/\/$/, '')
  try {
    const response = await fetch(base + '/snap/v1/transactions', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(serverKey + ':').toString('base64'),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        transaction_details: { order_id: payment.code, gross_amount: amount },
        customer_details: { first_name: request.name, email: request.email },
        item_details: [{ id: request.id, price: amount, quantity: 1, name: request.serviceName.slice(0, 50) }],
        callbacks: { finish: site + '/permintaan/' + parsed.data.token },
        notification_url: site + '/api/webhooks/midtrans',
      }),
      signal: AbortSignal.timeout(15000),
    })
    const payload = await response.json().catch(() => ({})) as { token?: string; redirect_url?: string; error_messages?: string[] }
    if (!response.ok || !payload.token || !payload.redirect_url) {
      await db.update(servicePayments).set({ status: 'failed' }).where(eq(servicePayments.id, payment.id))
      return res.status(502).json({ error: 'Midtrans belum dapat membuat tagihan. Coba lagi nanti.' })
    }

    await db.update(servicePayments).set({
      invoiceId: payload.token,
      invoiceUrl: payload.redirect_url,
      status: 'pending',
    }).where(eq(servicePayments.id, payment.id))
    return res.status(201).json({ ok: true, paymentUrl: payload.redirect_url })
  } catch {
    await db.update(servicePayments).set({ status: 'failed' }).where(eq(servicePayments.id, payment.id))
    return res.status(502).json({ error: 'Tidak dapat menghubungi Midtrans. Tidak ada pembayaran yang diproses.' })
  }
}
