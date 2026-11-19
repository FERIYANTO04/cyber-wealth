import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from './db'
import { activity, customers, orders, products, transactions } from './db/schema'
import { sendEmail, notifyOwner } from './email'
import { orderPaidEmail } from './messages'
import { fileUrl } from './storage'
import { money } from './format'

/** Storefront-visible products: published and authored by the owner, never sample rows. */
export async function getStoreProducts() {
  return db
    .select()
    .from(products)
    .where(and(eq(products.status, 'published'), eq(products.dataSource, 'live')))
    .orderBy(desc(products.createdAt))
}

export async function getPublishedProduct(slug: string) {
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.slug, slug), eq(products.status, 'published'), eq(products.dataSource, 'live')))
    .limit(1)
  return rows[0] ?? null
}

export async function getOwnerProducts() {
  return db.select().from(products).orderBy(desc(products.createdAt))
}

export async function getProductById(id: string) {
  const rows = await db.select().from(products).where(eq(products.id, id)).limit(1)
  return rows[0] ?? null
}

export async function getOrders(limit = 60) {
  return db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit)
}

export async function getOrderByToken(token: string) {
  const rows = await db.select().from(orders).where(eq(orders.accessToken, token)).limit(1)
  return rows[0] ?? null
}

export type OrderCounts = { paid: number; pending: number; revenueIdr: number }

export async function getOrderCounts(): Promise<OrderCounts> {
  const [paid] = await db
    .select({ n: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${orders.amountIdr}), 0)::bigint` })
    .from(orders)
    .where(and(eq(orders.status, 'paid'), eq(orders.dataSource, 'live')))
  const [pending] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(eq(orders.status, 'pending'), eq(orders.dataSource, 'live')))
  return {
    paid: paid?.n ?? 0,
    pending: pending?.n ?? 0,
    revenueIdr: Number(paid?.total ?? 0),
  }
}

/** A short, readable order code the buyer can quote back to the owner. */
export function orderCode(): string {
  const stamp = new Date().toISOString().slice(2, 10).replace(/-/g, '')
  const tail = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()
  return `CWA-${stamp}-${tail}`
}

/**
 * Records money that a payment provider has officially confirmed.
 *
 * Idempotent: it only moves an order out of `pending`, so a webhook replayed five
 * times still books exactly one payment. Nothing else in the app may insert a
 * revenue row for an order.
 */
export async function settlePaidOrder(args: {
  orderId: string
  provider: string
  paidAmountIdr?: number
  invoiceId?: string
}): Promise<{ settled: boolean; order: typeof orders.$inferSelect | null }> {
  // The order transition and its ledger/audit rows must commit together. Otherwise a
  // database error after setting status=paid could leave a paid order with no revenue.
  const settlement = await db.transaction(async (tx) => {
    const [current] = await tx.select().from(orders).where(eq(orders.id, args.orderId)).limit(1)
    if (!current) return { settled: false as const, order: null, amount: 0 }
    if (current.status !== 'pending') return { settled: false as const, order: current, amount: 0 }

    const amount = args.paidAmountIdr && args.paidAmountIdr > 0
      ? args.paidAmountIdr
      : Number(current.amountIdr)

    const [updated] = await tx
      .update(orders)
      .set({
        status: 'paid',
        paidAt: new Date(),
        invoiceId: args.invoiceId ?? current.invoiceId,
        deliveryCount: current.deliveryCount + 1,
      })
      .where(and(eq(orders.id, current.id), eq(orders.status, 'pending')))
      .returning()

    // Another callback may have settled the order while this transaction was waiting.
    if (!updated) {
      const [fresh] = await tx.select().from(orders).where(eq(orders.id, current.id)).limit(1)
      return { settled: false as const, order: fresh ?? current, amount: 0 }
    }

    await tx
      .insert(customers)
      .values({ email: updated.buyerEmail.toLowerCase(), name: updated.buyerName })
      .onConflictDoNothing()

    const [buyer] = await tx
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.email, updated.buyerEmail.toLowerCase()))
      .limit(1)

    let settledOrder = updated
    if (buyer && !updated.customerId) {
      const [withCustomer] = await tx
        .update(orders)
        .set({ customerId: buyer.id })
        .where(eq(orders.id, updated.id))
        .returning()
      if (withCustomer) settledOrder = withCustomer
    }

    await tx.insert(transactions).values({
      kind: 'revenue',
      category: 'Produk digital',
      description: updated.productName + ' — pesanan ' + updated.code,
      amountIdr: amount,
      dataSource: 'live',
      ledger: 'company',
    })

    await tx.insert(activity).values({
      actor: 'system',
      action: 'Pembayaran terverifikasi',
      detail: updated.productName + ' — ' + updated.code + ', ' + updated.buyerEmail + '. Dikonfirmasi oleh ' + args.provider + '.',
      dataSource: 'live',
    })

    return { settled: true as const, order: settledOrder, amount }
  })

  if (!settlement.settled || !settlement.order) {
    return { settled: false, order: settlement.order }
  }

  // Delivery is outside the ledger transaction: email failure must not roll back a
  // real payment. The paid order remains accessible from its private order URL.
  try {
    await deliverOrder(settlement.order, settlement.amount, args.provider)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Kesalahan pengiriman tidak diketahui'
    console.error('[order delivery]', settlement.order.code, message)
    await db.insert(activity).values({
      actor: 'system',
      action: 'Pengiriman produk perlu diperiksa',
      detail: settlement.order.code + ' — pembayaran sudah tercatat, tetapi email pengiriman gagal: ' + message.slice(0, 500),
      dataSource: 'live',
    }).catch(() => undefined)
  }

  return { settled: true, order: settlement.order }
}

/**
 * Sends what the buyer paid for. Runs only from `settlePaidOrder`, so an unpaid order
 * never produces a delivery email. A missing email provider is recorded, not faked.
 */
async function deliverOrder(order: typeof orders.$inferSelect, amount: number, provider: string) {
  const [product] = await db.select().from(products).where(eq(products.id, order.productId)).limit(1)
  const downloadUrl =
    product?.fileKey && (await fileUrl(product.fileKey, { download: product.fileName ?? undefined }).catch(() => null))

  const email = orderPaidEmail({
    code: order.code,
    productName: order.productName,
    buyerName: order.buyerName,
    amountIdr: amount,
    link: `/pesanan/${order.accessToken}`,
    downloadUrl: downloadUrl ?? null,
    deliverableNote: product?.deliverableNote ?? null,
  })

  await sendEmail({
    to: order.buyerEmail,
    subject: email.subject,
    body: email.body,
    kind: 'order-paid',
    relatedType: 'order',
    relatedId: order.code,
  })

  await notifyOwner({
    subject: `Pesanan lunas: ${order.productName}`,
    lines: [
      `${order.buyerName} (${order.buyerEmail}) membayar ${money(amount)}.`,
      `Pesanan: ${order.code}`,
      `Dikonfirmasi oleh ${provider}.`,
    ],
    kind: 'owner-order-paid',
    relatedId: order.code,
  }).catch(() => undefined)
}

/**
 * A refund for a one-off product order.
 *
 * Money only moves after the provider accepts the request, and only then does the order
 * become `refunded` and an expense row appear. An order without a provider invoice, or
 * an account without a payment key, is refused in plain words rather than half-done.
 */
export async function refundOrder(args: {
  orderId: string
  note?: string
}): Promise<{ ok: true; refundId: string | null } | { ok: false; error: string }> {
  const [order] = await db.select().from(orders).where(eq(orders.id, args.orderId)).limit(1)
  if (!order) return { ok: false, error: 'Pesanan ini tidak ditemukan.' }
  if (order.status === 'refunded') return { ok: false, error: 'Pesanan ini sudah dikembalikan dananya.' }
  if (order.status !== 'paid') {
    return { ok: false, error: 'Hanya pesanan yang sudah lunas yang bisa dikembalikan. Pesanan ini belum dibayar.' }
  }
  return {
    ok: false,
    error: 'Refund transfer bank manual tidak dapat dikirim otomatis oleh website. Lakukan transfer dari rekening bank, lalu catat refund setelah dana benar-benar dikirim.',
  }
}
