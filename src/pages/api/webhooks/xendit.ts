import type { NextApiRequest, NextApiResponse } from 'next'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { orders } from '@/lib/db/schema'
import { settlePaidOrder } from '@/lib/revenue'
import { timingSafeEqual } from 'node:crypto'

type SessionEvent = {
  event?: string
  data?: {
    payment_session_id?: string
    reference_id?: string
    status?: string
    session_type?: string
    currency?: string
    amount?: number
    payment_id?: string | null
  }
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

/** Xendit Payment Session webhook. Only authenticated, completed, matching payments are booked. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const expected = process.env.XENDIT_WEBHOOK_TOKEN ?? ''
  const supplied = String(req.headers['x-callback-token'] ?? '')
  if (!expected || !supplied || !safeEqual(expected, supplied)) {
    return res.status(401).json({ error: 'Invalid webhook token' })
  }

  const event = req.body as SessionEvent
  if (event?.event === 'payment_session.expired') return res.status(200).json({ received: true })
  if (event?.event !== 'payment_session.completed') return res.status(200).json({ received: true, ignored: true })

  const data = event.data
  if (
    !data?.payment_session_id ||
    !data.reference_id ||
    data.status !== 'COMPLETED' ||
    data.session_type !== 'PAY' ||
    data.currency !== 'IDR' ||
    !Number.isFinite(data.amount) ||
    !data.payment_id
  ) {
    return res.status(400).json({ error: 'Incomplete or invalid completed-payment event' })
  }

  const [order] = await db.select().from(orders).where(
    and(eq(orders.code, data.reference_id), eq(orders.provider, 'xendit'))
  ).limit(1)

  if (!order || order.invoiceId !== data.payment_session_id) {
    return res.status(404).json({ error: 'Order/session reference not found' })
  }
  if (Number(order.amountIdr) !== Number(data.amount)) {
    return res.status(409).json({ error: 'Payment amount does not match the order' })
  }
  if (order.status === 'paid') return res.status(200).json({ received: true, settled: false, duplicate: true })

  const result = await settlePaidOrder({
    orderId: order.id,
    provider: 'xendit',
    paidAmountIdr: Number(data.amount),
    invoiceId: data.payment_session_id,
  })
  return res.status(200).json({ received: true, settled: result.settled })
}
