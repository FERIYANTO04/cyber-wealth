import type { NextApiRequest, NextApiResponse } from 'next'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { servicePayments, serviceRequests } from '@/lib/db/schema'

const Body = z.object({ requestId: z.string().uuid() })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan.' })
  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Permintaan pembayaran tidak valid.' })

  const [request] = await db.select().from(serviceRequests)
    .where(eq(serviceRequests.id, parsed.data.requestId)).limit(1)
  if (!request || !['proposal_sent', 'proposed'].includes(request.status)) {
    return res.status(409).json({ error: 'Pembayaran hanya tersedia untuk penawaran yang sudah dikirim dan menunggu persetujuan.' })
  }
  const amount = Number(request.proposalAmountIdr ?? 0)
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return res.status(409).json({ error: 'Nilai penawaran belum ditetapkan dengan benar. Hubungi tim Cyber Wealth.' })
  }

  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim() ?? ''
  if (!serverKey) return res.status(503).json({ error: 'Pembayaran online belum tersedia. Tim kami akan menghubungi Anda.' })
  const production = process.env.MIDTRANS_IS_PRODUCTION === 'true'

  const [existing] = await db.select().from(servicePayments)
    .where(and(eq(servicePayments.serviceRequestId, request.id), eq(servicePayments.status, 'pending')))
    .orderBy(desc(servicePayments.createdAt)).limit(1)
  if (existing?.invoiceUrl) {
    return res.status(200).json({ ok: true, paymentUrl: existing.invoiceUrl, code: existing.code })
  }

  const code = 'CWS-' + new Date().toISOString().slice(2,10).replace(/-/g,'') + '-' + randomUUID().slice(0,8).toUpperCase()
  const [payment] = await db.insert(servicePayments).values({
    code,
    serviceRequestId: request.id,
    amountIdr: amount,
    buyerName: request.name,
    buyerEmail: request.email,
    status: 'pending',
    provider: 'midtrans',
    dataSource: 'live',
  }).returning()

  try {
    const base = production ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com'
    const response = await fetch(base + '/snap/v1/transactions', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(serverKey + ':').toString('base64'),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        transaction_details: { order_id: code, gross_amount: amount },
        customer_details: { first_name: request.name, email: request.email },
        item_details: [{ id: request.serviceId ?? request.id, price: amount, quantity: 1, name: request.serviceName.slice(0,50) }],
        callbacks: { finish: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cyber-wealth-web-production.up.railway.app') + '/layanan/pembayaran/' + code },
      }),
      signal: AbortSignal.timeout(15000),
    })
    const payload = await response.json().catch(() => ({})) as { token?: string; redirect_url?: string }
    if (!response.ok || !payload.token || !payload.redirect_url) {
      await db.update(servicePayments).set({ status: 'failed' }).where(eq(servicePayments.id, payment.id))
      return res.status(502).json({ error: 'Gerbang pembayaran belum dapat menerbitkan tagihan. Tidak ada pekerjaan yang dimulai.' })
    }
    await db.update(servicePayments).set({ invoiceId: payload.token, invoiceUrl: payload.redirect_url })
      .where(eq(servicePayments.id, payment.id))
    return res.status(201).json({ ok: true, code, paymentUrl: payload.redirect_url })
  } catch {
    await db.update(servicePayments).set({ status: 'failed' }).where(eq(servicePayments.id, payment.id))
    return res.status(502).json({ error: 'Tidak dapat menghubungi gerbang pembayaran. Tidak ada pekerjaan yang dimulai.' })
  }
}
