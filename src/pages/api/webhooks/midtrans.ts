import type { NextApiRequest, NextApiResponse } from 'next'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { orders } from '@/lib/db/schema'
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
  if (!order) return res.status(404).json({ error: 'Order not found' })
  if (order.status === 'paid') return res.status(200).json({ received: true, duplicate: true })

  const production = process.env.MIDTRANS_IS_PRODUCTION === 'true'
  const base = production ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com'
  try {
    // Verify every notification against Midtrans' authenticated Status API.
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
    if (!Number.isFinite(paidAmount) || paidAmount !== Number(order.amountIdr)) {
      return res.status(400).json({ error: 'Payment amount mismatch' })
    }

    const isPaid = status.transaction_status === 'settlement' ||
      (status.transaction_status === 'capture' && (!status.fraud_status || status.fraud_status === 'accept'))

    if (isPaid) {
      const result = await settlePaidOrder({
        orderId: order.id,
        provider: 'Midtrans',
        paidAmountIdr: paidAmount,
        invoiceId: status.transaction_id ?? notification.transaction_id ?? order.invoiceId ?? undefined,
      })
      return res.status(200).json({ received: true, settled: result.settled })
    }

    if (['expire', 'cancel', 'deny'].includes(status.transaction_status ?? '')) {
      await db.update(orders).set({ status: 'expired' }).where(and(eq(orders.id, order.id), eq(orders.status, 'pending')))
    }
    return res.status(200).json({ received: true, settled: false, transactionStatus: status.transaction_status ?? 'unknown' })
  } catch {
    return res.status(502).json({ error: 'Midtrans status verification failed; retry notification' })
  }
}
