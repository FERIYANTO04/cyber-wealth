import type { NextApiRequest, NextApiResponse } from 'next'
import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { db, sqlClient } from '@/lib/db'
import { activity, orders } from '@/lib/db/schema'
import { settlePaidOrder } from '@/lib/revenue'

type Notification = { order_id?: string; transaction_id?: string }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim() ?? ''
  if (!serverKey) return res.status(503).json({ error: 'Midtrans is not configured' })

  const notification = req.body as Notification
  const orderCode = notification?.order_id
  if (!orderCode || typeof orderCode !== 'string') return res.status(400).json({ error: 'Missing order_id' })

  const [order] = await db.select().from(orders).where(and(
    eq(orders.code, orderCode),
    eq(orders.provider, 'midtrans'),
    eq(orders.dataSource, 'live')
  )).limit(1)
  const [servicePayment] = order ? [] : await sqlClient`SELECT * FROM service_payment
    WHERE code=${orderCode} AND provider='midtrans' AND data_source='live' LIMIT 1`

  if (!order && !servicePayment) return res.status(404).json({ error: 'Order not found' })
  if (order?.status === 'paid' || servicePayment?.status === 'paid') {
    return res.status(200).json({ received: true, duplicate: true })
  }

  const production = process.env.MIDTRANS_IS_PRODUCTION === 'true'
  const base = production ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com'
  try {
    // Never trust the webhook body alone. Confirm status and amount against Midtrans.
    const response = await fetch(base + '/v2/' + encodeURIComponent(orderCode) + '/status', {
      headers: {
        Authorization: 'Basic ' + Buffer.from(serverKey + ':').toString('base64'),
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) return res.status(502).json({ error: 'Could not verify transaction with Midtrans' })

    const status = await response.json() as {
      order_id?: string
      transaction_id?: string
      transaction_status?: string
      fraud_status?: string
      gross_amount?: string
    }
    if (status.order_id !== orderCode) return res.status(400).json({ error: 'Transaction reference mismatch' })

    const paidAmount = Number(status.gross_amount)
    const expectedAmount = Number(order?.amountIdr ?? servicePayment?.amount_idr)
    if (!Number.isFinite(paidAmount) || paidAmount !== expectedAmount) {
      return res.status(400).json({ error: 'Payment amount mismatch' })
    }

    const isPaid = status.transaction_status === 'settlement' ||
      (status.transaction_status === 'capture' && (!status.fraud_status || status.fraud_status === 'accept'))

    if (isPaid && order) {
      const result = await settlePaidOrder({
        orderId: order.id,
        provider: 'Midtrans',
        paidAmountIdr: paidAmount,
        invoiceId: status.transaction_id ?? notification.transaction_id ?? order.invoiceId ?? undefined,
      })
      return res.status(200).json({ received: true, settled: result.settled, type: 'product-order' })
    }

    if (isPaid && servicePayment) {
      let settled = false
      await sqlClient.begin(async (tx) => {
        const updated = await tx`UPDATE service_payment SET status='paid', paid_at=now(),
          invoice_id=${status.transaction_id ?? notification.transaction_id ?? servicePayment.invoice_id}
          WHERE id=${servicePayment.id} AND status='pending' RETURNING id`
        if (updated.length === 0) return
        await tx`UPDATE service_request SET status='won', updated_at=now()
          WHERE id=${servicePayment.service_request_id} AND status='proposal_sent'`
        await tx`INSERT INTO "transaction" (id,kind,category,description,amount_idr,data_source)
          VALUES (${randomUUID()},'revenue','Layanan digital',${'Pembayaran layanan '+servicePayment.code},${paidAmount},'live')`
        await tx`INSERT INTO activity_entry (id,actor,action,detail,data_source)
          VALUES (${randomUUID()},'system','Pembayaran layanan terverifikasi',
            ${servicePayment.code+' — '+servicePayment.buyer_email+'. Dikonfirmasi oleh Midtrans; proyek kini boleh dijadwalkan.'},'live')`
        settled = true
      })
      return res.status(200).json({ received: true, settled, type: 'service-payment' })
    }

    if (['expire', 'cancel', 'deny'].includes(status.transaction_status ?? '')) {
      if (order) {
        await db.update(orders).set({ status: 'expired' }).where(and(eq(orders.id, order.id), eq(orders.status, 'pending')))
      } else if (servicePayment) {
        await sqlClient`UPDATE service_payment SET status='expired' WHERE id=${servicePayment.id} AND status='pending'`
      }
    }
    return res.status(200).json({ received: true, settled: false, transactionStatus: status.transaction_status ?? 'unknown' })
  } catch {
    return res.status(502).json({ error: 'Midtrans status verification failed; retry notification' })
  }
}
