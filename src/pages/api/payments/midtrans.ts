import type { NextApiRequest, NextApiResponse } from 'next'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { activity, orders } from '@/lib/db/schema'
import { settlePaidOrder } from '@/lib/revenue'
import { midtransConfigured, verifyMidtransSignature } from '@/lib/midtrans'

const Notification = z.object({
  order_id: z.string().min(1).max(50),
  status_code: z.string().min(1).max(10),
  gross_amount: z.string().min(1).max(40),
  signature_key: z.string().regex(/^[a-f0-9]{128}$/i),
  transaction_status: z.string().min(1).max(40),
  transaction_id: z.string().max(120).optional(),
  fraud_status: z.string().max(40).optional(),
  currency: z.string().max(8).optional(),
})

/** Midtrans server-to-server notification. Only signed, amount-matched events can settle an order. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Metode tidak diizinkan.' })
  }
  if (!midtransConfigured()) return res.status(503).json({ error: 'Pembayaran otomatis belum diaktifkan.' })

  const parsed = Notification.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Notifikasi pembayaran tidak valid.' })
  const notice = parsed.data

  if (!verifyMidtransSignature(notice)) {
    return res.status(401).json({ error: 'Tanda tangan notifikasi tidak valid.' })
  }
  if (notice.currency && notice.currency !== 'IDR') {
    return res.status(400).json({ error: 'Mata uang pembayaran tidak sesuai.' })
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.code, notice.order_id), eq(orders.provider, 'midtrans')))
    .limit(1)
  if (!order) return res.status(404).json({ error: 'Pesanan Midtrans tidak ditemukan.' })

  const paidAmount = Number(notice.gross_amount)
  if (!Number.isFinite(paidAmount) || Math.round(paidAmount) !== Number(order.amountIdr)) {
    return res.status(400).json({ error: 'Nominal notifikasi tidak cocok dengan pesanan.' })
  }

  const successful =
    notice.transaction_status === 'settlement' ||
    (notice.transaction_status === 'capture' && notice.fraud_status === 'accept')

  if (successful) {
    await settlePaidOrder({
      orderId: order.id,
      provider: 'Midtrans',
      paidAmountIdr: Math.round(paidAmount),
      invoiceId: notice.transaction_id,
    })
    return res.status(200).json({ ok: true })
  }

  if (notice.transaction_status === 'expire' || notice.transaction_status === 'cancel') {
    await db
      .update(orders)
      .set({ status: 'expired' })
      .where(and(eq(orders.id, order.id), eq(orders.status, 'pending')))
    await db.insert(activity).values({
      actor: 'system',
      action: 'Pembayaran Midtrans kedaluwarsa',
      detail: order.code + ' — status ' + notice.transaction_status + '. Tidak ada pendapatan dicatat.',
      dataSource: 'live',
    })
  }

  // Pending and other non-success states are acknowledged but never booked as revenue.
  return res.status(200).json({ ok: true })
}
