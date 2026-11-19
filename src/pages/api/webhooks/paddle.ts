import type { NextApiRequest, NextApiResponse } from 'next'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { orders } from '@/lib/db/schema'
import { settlePaidOrder } from '@/lib/revenue'

export const config = { api: { bodyParser: false } }

async function readRawBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  return Buffer.concat(chunks)
}

function verifySignature(rawBody: Buffer, header: string, secret: string): boolean {
  const parts = header.split(';')
  const timestamp = parts.find((part) => part.startsWith('ts='))?.slice(3)
  const signatures = parts.filter((part) => part.startsWith('h1=')).map((part) => part.slice(3))
  if (!timestamp || !signatures.length) return false
  const expected = createHmac('sha256', secret).update(timestamp + ':').update(rawBody).digest('hex')
  return signatures.some((signature) => {
    const a = Buffer.from(expected)
    const b = Buffer.from(signature)
    return a.length === b.length && timingSafeEqual(a, b)
  })
}

/** Paddle notifications are signature-verified; only completed transactions settle orders. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const secret = process.env.PADDLE_WEBHOOK_SECRET ?? ''
  const signature = String(req.headers['paddle-signature'] ?? '')
  const rawBody = await readRawBody(req)
  if (!secret || !signature || !verifySignature(rawBody, signature, secret)) {
    return res.status(401).json({ error: 'Invalid Paddle signature' })
  }
  let event: { event_type?: string; data?: { id?: string; status?: string; custom_data?: { order_code?: string; access_token?: string } } }
  try { event = JSON.parse(rawBody.toString('utf8')) }
  catch { return res.status(400).json({ error: 'Invalid JSON payload' }) }
  if (event.event_type !== 'transaction.completed' && event.event_type !== 'transaction.paid') {
    return res.status(200).json({ received: true, ignored: true })
  }
  const data = event.data
  const orderCode = data?.custom_data?.order_code
  const accessToken = data?.custom_data?.access_token
  if (!data?.id || !orderCode || !accessToken || (data.status && !['paid', 'completed'].includes(data.status))) {
    return res.status(400).json({ error: 'Incomplete or invalid paid transaction event' })
  }
  const [order] = await db.select().from(orders).where(and(
    eq(orders.code, orderCode), eq(orders.provider, 'paddle'), eq(orders.accessToken, accessToken)
  )).limit(1)
  if (!order || order.invoiceId !== data.id) return res.status(404).json({ error: 'Order/transaction reference not found' })
  if (order.status === 'paid') return res.status(200).json({ received: true, settled: false, duplicate: true })
  const result = await settlePaidOrder({ orderId: order.id, provider: 'paddle', paidAmountIdr: Number(order.amountIdr), invoiceId: data.id })
  return res.status(200).json({ received: true, settled: result.settled })
}
