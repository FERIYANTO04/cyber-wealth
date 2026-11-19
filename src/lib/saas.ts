import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from './db'
import { activity, customers, plans, subscriptions, transactions } from './db/schema'
import { sendEmail, notifyOwner } from './email'
import { subscriptionPaidEmail, orderPendingEmail } from './messages'
import { addInterval, intervalOf } from './billing'
import { dateTime, money } from './format'

export async function getPublishedPlans() {
  return db.select().from(plans).where(eq(plans.status, 'published')).orderBy(plans.priceIdr)
}

export async function getOwnerPlans() {
  return db.select().from(plans).orderBy(plans.priceIdr)
}

export async function getSubscriptions(limit = 60) {
  return db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt)).limit(limit)
}

export async function getSubscriptionByToken(token: string) {
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.accessToken, token)).limit(1)
  return rows[0] ?? null
}

export type SaasTotals = { active: number; pending: number; mrrIdr: number }

export async function getSaasTotals(): Promise<SaasTotals> {
  const activeRows = await db
    .select({ amountIdr: subscriptions.amountIdr, interval: subscriptions.interval })
    .from(subscriptions)
    .where(and(eq(subscriptions.status, 'active'), eq(subscriptions.dataSource, 'live')))
  const [pending] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(subscriptions)
    .where(eq(subscriptions.status, 'pending'))

  const mrrIdr = activeRows.reduce((sum, row) => {
    const amount = Number(row.amountIdr)
    return sum + (intervalOf(row.interval) === 'year' ? Math.round(amount / 12) : amount)
  }, 0)

  return { active: activeRows.length, pending: pending?.n ?? 0, mrrIdr }
}

/**
 * Activates a subscription after the provider confirms the payment. As with orders,
 * this is the only path that creates subscription revenue and it is idempotent.
 */
export async function settlePaidSubscription(args: {
  subscriptionId: string
  provider: string
  paidAmountIdr?: number
  invoiceId?: string
}): Promise<{ settled: boolean }> {
  const [current] = await db.select().from(subscriptions).where(eq(subscriptions.id, args.subscriptionId)).limit(1)
  if (!current || current.status === 'active') return { settled: false }

  const amount = args.paidAmountIdr && args.paidAmountIdr > 0 ? args.paidAmountIdr : Number(current.amountIdr)
  const periodEnd = addInterval(new Date(), intervalOf(current.interval))

  const [updated] = await db
    .update(subscriptions)
    .set({
      status: 'active',
      paidAt: new Date(),
      periodEnd,
      invoiceId: args.invoiceId ?? current.invoiceId,
    })
    .where(and(eq(subscriptions.id, current.id), eq(subscriptions.status, 'pending')))
    .returning()
  if (!updated) return { settled: false }

  await db
    .insert(customers)
    .values({ email: updated.accountEmail.toLowerCase(), name: updated.accountName })
    .onConflictDoNothing()

  await db.insert(transactions).values({
    kind: 'revenue',
    category: 'Langganan aplikasi',
    description: `${updated.planName} — ${updated.accountEmail}`,
    amountIdr: amount,
    dataSource: 'live',
    ledger: 'company',
  })

  await db.insert(activity).values({
    actor: 'system',
    action: 'Langganan aktif',
    detail: `${updated.planName} untuk ${updated.accountEmail}. Dikonfirmasi oleh ${args.provider}.`,
    dataSource: 'live',
  })

  const email = subscriptionPaidEmail({
    name: updated.accountName,
    planName: updated.planName,
    amountIdr: amount,
    periodEnd: dateTime(periodEnd),
    link: `/langganan/status/${updated.accessToken}`,
    interval: intervalOf(updated.interval),
  })
  await sendEmail({
    to: updated.accountEmail,
    subject: email.subject,
    body: email.body,
    kind: 'subscription-paid',
    relatedType: 'subscription',
    relatedId: updated.id,
  })

  await notifyOwner({
    subject: `Langganan baru dibayar: ${updated.planName}`,
    lines: [
      `${updated.accountName} (${updated.accountEmail}) berlangganan ${updated.planName}.`,
      `Jumlah: ${money(amount)}`,
      `Berlaku sampai: ${dateTime(periodEnd)}`,
    ],
    kind: 'owner-subscription-paid',
    relatedId: updated.id,
  }).catch(() => undefined)

  return { settled: true }
}

/** The confirmation email a buyer gets the moment an order exists, before paying. */
export async function sendOrderRecordedEmail(order: {
  code: string
  productName: string
  buyerName: string
  buyerEmail: string
  amountIdr: number
  accessToken: string
}) {
  const email = orderPendingEmail({
    code: order.code,
    productName: order.productName,
    buyerName: order.buyerName,
    amountIdr: order.amountIdr,
    link: `/pesanan/${order.accessToken}`,
  })
  await sendEmail({
    to: order.buyerEmail,
    subject: email.subject,
    body: email.body,
    kind: 'order-pending',
    relatedType: 'order',
    relatedId: order.code,
  })
}
