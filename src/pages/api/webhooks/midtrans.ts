import type { NextApiRequest, NextApiResponse } from 'next'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { activity, orders, servicePayments, serviceRequests, transactions } from '@/lib/db/schema'
import { settlePaidOrder } from '@/lib/revenue'

type Notification = { order_id?: string; transaction_id?: string }

async function verifyMidtrans(orderCode: string, serverKey: string, production: boolean) {
  const base = production ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com'
  const response = await fetch(base + '/v2/' + encodeURIComponent(orderCode) + '/status', {
    headers: {
      Authorization: 'Basic ' + Buffer.from(serverKey + ':').toString('base64'),
      Accept: 'application/json',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error('Could not verify transaction with Midtrans')
  const status = await response.json() as {
    order_id?: string
    transaction_id?: string
    transaction_status?: string
    fraud_status?: string
    gross_amount?: string
  }
  if (status.order_id !== orderCode) throw new Error('Transaction reference mismatch')
  return status
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim() ?? ''
  if (!serverKey) return res.status(503).json({ error: 'Midtrans is not configured' })

  const notification = req.body as Notification
  const orderCode = notification?.order_id
  if (!orderCode || typeof orderCode !== 'string') return res.status(400).json({ error: 'Missing order_id' })
  const production = process.env.MIDTRANS_IS_PRODUCTION === 'true'

  // Digital-product checkout.
  const [order] = await db.select().from(orders).where(and(
    eq(orders.code, orderCode),
    eq(orders.provider, 'midtrans'),
    eq(orders.dataSource, 'live')
  )).limit(1)

  if (order) {
    if (order.status === 'paid') return res.status(200).json({ received: true, duplicate: true })
    try {
      const status = await verifyMidtrans(orderCode, serverKey, production)
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

  // Service proposal checkout. This path records service revenue only after a
  // provider-confirmed payment and only once, even when Midtrans retries a webhook.
  const [payment] = await db.select().from(servicePayments).where(and(
    eq(servicePayments.code, orderCode),
    eq(servicePayments.provider, 'midtrans'),
    eq(servicePayments.dataSource, 'live')
  )).limit(1)
  if (!payment) return res.status(404).json({ error: 'Order not found' })
  if (payment.status === 'paid') return res.status(200).json({ received: true, duplicate: true })

  try {
    const status = await verifyMidtrans(orderCode, serverKey, production)
    const paidAmount = Number(status.gross_amount)
    if (!Number.isFinite(paidAmount) || paidAmount !== Number(payment.amountIdr)) {
      return res.status(400).json({ error: 'Payment amount mismatch' })
    }
    const isPaid = status.transaction_status === 'settlement' ||
      (status.transaction_status === 'capture' && (!status.fraud_status || status.fraud_status === 'accept'))

    if (isPaid) {
      const settled = await db.transaction(async (tx) => {
        const [updated] = await tx.update(servicePayments).set({
          status: 'paid',
          paidAt: new Date(),
          invoiceId: status.transaction_id ?? notification.transaction_id ?? payment.invoiceId,
        }).where(and(eq(servicePayments.id, payment.id), inArray(servicePayments.status, ['pending', 'failed']))).returning()

        if (!updated) return false
        await tx.update(serviceRequests).set({ status: 'won', updatedAt: new Date() })
          .where(eq(serviceRequests.id, payment.serviceRequestId))
        await tx.insert(transactions).values({
          kind: 'revenue',
          category: 'Jasa digital',
          description: `Layanan jasa — pembayaran ${payment.code}`,
          amountIdr: paidAmount,
          dataSource: 'live',
        })
        await tx.insert(activity).values({
          actor: 'system',
          action: 'Pembayaran jasa terverifikasi',
          detail: `Permintaan ${payment.serviceRequestId} dibayar ${paidAmount.toLocaleString('id-ID')} melalui Midtrans.`,
          dataSource: 'live',
        })
        return true
      })
      return res.status(200).json({ received: true, settled: Boolean(settled) })
    }

    if (['expire', 'cancel', 'deny'].includes(status.transaction_status ?? '')) {
      await db.update(servicePayments).set({ status: 'expired' })
        .where(and(eq(servicePayments.id, payment.id), eq(servicePayments.status, 'pending')))
    }
    return res.status(200).json({ received: true, settled: false, transactionStatus: status.transaction_status ?? 'unknown' })
  } catch {
    return res.status(502).json({ error: 'Midtrans status verification failed; retry notification' })
  }
}
