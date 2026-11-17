import { bankTransferInstructions } from './bank-transfer'
import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import { db } from './db'
import {
  activity,
  billingCycles,
  billingRequests,
  customers,
  plans,
  proposals,
  subscriptions,
  transactions,
} from './db/schema'
import { sendEmail, notifyOwner, emailConfigured } from './email'
import {
  cyclePaidEmail,
  cycleReminderEmail,
} from './messages'
import { dateTime, money } from './format'

/**
 * Recurring billing.
 *
 * The rules this file keeps, in order of importance:
 * 1. A renewal invoice is only ever created for a subscription whose subscriber
 *    ticked "perpanjang otomatis" themselves. No consent, no invoice.
 * 2. Recurring revenue is booked only by `settlePaidCycle`, and only the verified
 *    webhook calls it — the same rule as one-off orders.
 * 3. Reminders and emails state what happened; they never claim money arrived before
 *    the provider confirmed it.
 */

export const INTERVALS = {
  month: { label: 'Bulanan', months: 1, per: 'bulan' },
  year: { label: 'Tahunan', months: 12, per: 'tahun' },
} as const

export type Interval = keyof typeof INTERVALS

export function intervalOf(value: string): Interval {
  return value === 'year' ? 'year' : 'month'
}

/** Adds one billing period without drifting off the calendar day. */
export function addInterval(from: Date, interval: Interval): Date {
  const next = new Date(from.getTime())
  if (interval === 'year') next.setUTCFullYear(next.getUTCFullYear() + 1)
  else next.setUTCMonth(next.getUTCMonth() + 1)
  return next
}

/** A year's price expressed per month, so MRR mixes intervals honestly. */
export function monthlyValue(amountIdr: number, interval: string): number {
  return intervalOf(interval) === 'year' ? Math.round(amountIdr / 12) : amountIdr
}

export type BillingTotals = {
  active: number
  mrrIdr: number
  annualisedIdr: number
  newThisMonth: number
  churnedThisMonth: number
  churnRate: number
  overdue: number
  dueSoon: number
  autoRenewShare: number
  demoActive: number
  collectedByMonth: { month: string; amountIdr: number; count: number }[]
}

/** Every figure here is computed from subscriptions the provider has confirmed. */
export async function getBillingTotals(): Promise<BillingTotals> {
  const activeRows = await db
    .select({
      amountIdr: subscriptions.amountIdr,
      interval: subscriptions.interval,
      autoRenew: subscriptions.autoRenew,
    })
    .from(subscriptions)
    .where(and(eq(subscriptions.status, 'active'), eq(subscriptions.dataSource, 'live')))

  const mrrIdr = activeRows.reduce((sum, row) => sum + monthlyValue(Number(row.amountIdr), row.interval), 0)
  const autoRenewing = activeRows.filter((row) => row.autoRenew).length

  const [demoRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(subscriptions)
    .where(and(eq(subscriptions.status, 'active'), eq(subscriptions.dataSource, 'demo')))

  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)

  const [started] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(subscriptions)
    .where(and(eq(subscriptions.status, 'active'), eq(subscriptions.dataSource, 'live'), gte(subscriptions.paidAt, monthStart)))

  const [churned] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(subscriptions)
    .where(
      and(
        inArray(subscriptions.status, ['cancelled', 'expired']),
        eq(subscriptions.dataSource, 'live'),
        gte(subscriptions.cancelledAt, monthStart)
      )
    )

  const [overdue] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(billingCycles)
    .innerJoin(subscriptions, eq(billingCycles.subscriptionId, subscriptions.id))
    .where(
      and(eq(billingCycles.status, 'invoiced'), eq(subscriptions.dataSource, 'live'), lte(billingCycles.dueAt, new Date()))
    )

  const soon = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  const [dueSoon] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(billingCycles)
    .innerJoin(subscriptions, eq(billingCycles.subscriptionId, subscriptions.id))
    .where(
      and(eq(billingCycles.status, 'scheduled'), eq(subscriptions.dataSource, 'live'), lte(billingCycles.dueAt, soon))
    )

  const collected = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${billingCycles.paidAt}), 'YYYY-MM')`,
      amountIdr: sql<number>`coalesce(sum(${billingCycles.amountIdr}), 0)::bigint`,
      count: sql<number>`count(*)::int`,
    })
    .from(billingCycles)
    .innerJoin(subscriptions, eq(billingCycles.subscriptionId, subscriptions.id))
    .where(and(eq(billingCycles.status, 'paid'), eq(subscriptions.dataSource, 'live')))
    .groupBy(sql`date_trunc('month', ${billingCycles.paidAt})`)
    .orderBy(sql`date_trunc('month', ${billingCycles.paidAt})`)

  const activeCount = activeRows.length
  const churnRate = activeCount + (churned?.n ?? 0) > 0 ? ((churned?.n ?? 0) / (activeCount + (churned?.n ?? 0))) * 100 : 0

  return {
    active: activeCount,
    mrrIdr,
    annualisedIdr: mrrIdr * 12,
    newThisMonth: started?.n ?? 0,
    churnedThisMonth: churned?.n ?? 0,
    churnRate: Math.round(churnRate * 10) / 10,
    overdue: overdue?.n ?? 0,
    dueSoon: dueSoon?.n ?? 0,
    autoRenewShare: activeCount === 0 ? 0 : Math.round((autoRenewing / activeCount) * 100),
    demoActive: demoRow?.n ?? 0,
    collectedByMonth: collected.map((row) => ({
      month: row.month,
      amountIdr: Number(row.amountIdr),
      count: row.count,
    })),
  }
}

export async function getSubscriptionCycles(subscriptionId: string) {
  return db
    .select()
    .from(billingCycles)
    .where(eq(billingCycles.subscriptionId, subscriptionId))
    .orderBy(desc(billingCycles.dueAt))
}

export async function getUpcomingCycles(limit = 40) {
  return db
    .select({
      cycle: billingCycles,
      subscription: subscriptions,
    })
    .from(billingCycles)
    .leftJoin(subscriptions, eq(billingCycles.subscriptionId, subscriptions.id))
    .orderBy(asc(billingCycles.dueAt))
    .limit(limit)
}

/**
 * Books a renewal payment the provider has confirmed. Idempotent: a cycle that is
 * already paid is left alone, and the subscription's paid-through date only extends
 * on the first confirmation of that cycle.
 */
export async function settlePaidCycle(args: {
  cycleId: string
  provider: string
  paidAmountIdr?: number
  invoiceId?: string
}): Promise<{ settled: boolean }> {
  const [cycle] = await db.select().from(billingCycles).where(eq(billingCycles.id, args.cycleId)).limit(1)
  if (!cycle || cycle.status === 'paid') return { settled: false }

  const [updated] = await db
    .update(billingCycles)
    .set({
      status: 'paid',
      paidAt: new Date(),
      invoiceId: args.invoiceId ?? cycle.invoiceId,
    })
    .where(and(eq(billingCycles.id, cycle.id), inArray(billingCycles.status, ['scheduled', 'invoiced', 'failed'])))
    .returning()
  if (!updated) return { settled: false }

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, cycle.subscriptionId))
    .limit(1)

  if (!subscription) return { settled: false }

  const amount = args.paidAmountIdr && args.paidAmountIdr > 0 ? args.paidAmountIdr : Number(cycle.amountIdr)
  const periodEnd = cycle.periodEnd

  await db
    .update(subscriptions)
    .set({
      status: 'active',
      paidAt: updated.paidAt ?? new Date(),
      periodEnd,
      invoiceId: updated.invoiceId ?? subscription.invoiceId,
    })
    .where(eq(subscriptions.id, subscription.id))

  await db
    .insert(customers)
    .values({ email: subscription.accountEmail.toLowerCase(), name: subscription.accountName })
    .onConflictDoNothing()

  await db.insert(transactions).values({
    kind: 'revenue',
    category: 'Langganan berulang',
    description: `${subscription.planName} — perpanjangan ${subscription.accountEmail}`,
    amountIdr: amount,
    dataSource: 'live',
  })

  await db.insert(activity).values({
    actor: 'system',
    action: 'Perpanjangan terverifikasi',
    detail: `${subscription.planName} untuk ${subscription.accountEmail}, ${money(amount)}. Dikonfirmasi oleh ${args.provider}.`,
    dataSource: 'live',
  })

  const email = cyclePaidEmail({
    name: subscription.accountName,
    planName: subscription.planName,
    amountIdr: amount,
    periodEnd: dateTime(periodEnd),
    link: `/langganan/status/${subscription.accessToken}`,
  })
  await sendEmail({
    to: subscription.accountEmail,
    subject: email.subject,
    body: email.body,
    kind: 'cycle-paid',
    relatedType: 'cycle',
    relatedId: cycle.id,
  })

  await notifyOwner({
    subject: `Perpanjangan dibayar: ${subscription.planName}`,
    lines: [
      `${subscription.accountName} (${subscription.accountEmail}) memperpanjang ${subscription.planName}.`,
      `Jumlah: ${money(amount)}`,
      `Berlaku sampai: ${dateTime(periodEnd)}`,
    ],
    kind: 'owner-cycle-paid',
    relatedId: cycle.id,
  }).catch(() => undefined)

  return { settled: true }
}

export type BillingRunResult = {
  remindersSent: number
  invoicesCreated: number
  expired: number
  scheduled: number
  notes: string[]
}

/**
 * The billing pass, run on request like the autopilot: schedule the next period for
 * consented subscriptions, remind ahead of the due date, invoice what is due, and
 * close out what lapsed. It never invents consent and never marks anything paid.
 */
export async function runBillingPass(trigger: 'owner' | 'schedule'): Promise<BillingRunResult> {
  const now = new Date()
  const result: BillingRunResult = { remindersSent: 0, invoicesCreated: 0, expired: 0, scheduled: 0, notes: [] }

  // Demo subscriptions are never billed and never emailed: they are sample rows, and a
  // real reminder to a sample address would be a lie dressed as a customer.
  const active = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.status, 'active'), eq(subscriptions.dataSource, 'live')))
    .orderBy(asc(subscriptions.periodEnd))

  for (const subscription of active) {
    const periodEnd = subscription.periodEnd ?? now
    const interval = intervalOf(subscription.interval)

    if (periodEnd.getTime() <= now.getTime()) {
      const [openCycle] = await db
        .select()
        .from(billingCycles)
        .where(
          and(
            eq(billingCycles.subscriptionId, subscription.id),
            inArray(billingCycles.status, ['scheduled', 'invoiced', 'failed'])
          )
        )
        .orderBy(asc(billingCycles.dueAt))
        .limit(1)

      if (!openCycle && subscription.autoRenew) {
        const cycle = await ensureCycle(subscription, periodEnd, interval)
        if (cycle.created) {
          result.scheduled += 1
          result.notes.push(`Periode baru dijadwalkan untuk ${subscription.accountEmail}.`)
        }
        await invoiceCycleIfDue(subscription, cycle.row, result)
      } else if (!openCycle) {
        // No consent for another period: the subscription simply runs out. Nothing
        // is charged and no invoice is created.
        await db
          .update(subscriptions)
          .set({
            status: 'expired',
            cancelReason: subscription.cancelReason ?? 'Periode berakhir tanpa perpanjangan otomatis',
          })
          .where(eq(subscriptions.id, subscription.id))
        await db.insert(activity).values({
          actor: 'system',
          action: 'Langganan berakhir',
          detail: `${subscription.planName} untuk ${subscription.accountEmail} berakhir karena tidak ada perpanjangan otomatis. Tidak ada tagihan yang dibuat.`,
          dataSource: 'live',
        })
        result.expired += 1
      } else {
        await invoiceCycleIfDue(subscription, openCycle, result)
      }
      continue
    }

    // Still inside the paid period. Make sure the next period exists, and remind.
    const next = await ensureCycle(subscription, periodEnd, interval)
    if (next.created) result.scheduled += 1
    if (next.row && subscription.autoRenew) {
      await remindIfNeeded(subscription, next.row, result)
      await invoiceCycleIfDue(subscription, next.row, result)
    }
  }

  if (result.remindersSent + result.invoicesCreated + result.expired > 0) {
    await db.insert(activity).values({
      actor: 'system',
      action: 'Putaran penagihan berjalan',
      detail: `${result.remindersSent} pengingat, ${result.invoicesCreated} tagihan baru, ${result.expired} langganan berakhir. Dipicu oleh ${trigger === 'owner' ? 'pemilik' : 'jadwal harian'}.`,
      dataSource: 'live',
    })
  }

  return result
}

async function ensureCycle(subscription: typeof subscriptions.$inferSelect, periodStart: Date, interval: Interval) {
  const [existing] = await db
    .select()
    .from(billingCycles)
    .where(and(eq(billingCycles.subscriptionId, subscription.id), eq(billingCycles.periodStart, periodStart)))
    .limit(1)
  if (existing) return { row: existing, created: false }

  const periodEnd = addInterval(periodStart, interval)
  const [row] = await db
    .insert(billingCycles)
    .values({
      subscriptionId: subscription.id,
      periodStart,
      periodEnd,
      dueAt: periodStart,
      amountIdr: Number(subscription.amountIdr),
      status: 'scheduled',
    })
    .returning()
  return { row, created: true }
}

/** Reminders at 7 days, 3 days and 1 day before the due date. Each stage sends once. */
async function remindIfNeeded(
  subscription: typeof subscriptions.$inferSelect,
  cycle: typeof billingCycles.$inferSelect,
  result: BillingRunResult
) {
  if (cycle.status === 'paid' || cycle.reminderStage >= 3) return
  const daysLeft = Math.ceil((cycle.dueAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  const stage = daysLeft <= 1 ? 3 : daysLeft <= 3 ? 2 : daysLeft <= 7 ? 1 : 0
  if (stage === 0 || stage <= cycle.reminderStage) return

  const email = cycleReminderEmail({
    name: subscription.accountName,
    planName: subscription.planName,
    amountIdr: Number(cycle.amountIdr),
    dueLabel: dateTime(cycle.dueAt),
    link: `/langganan/status/${subscription.accessToken}`,
    final: stage === 3,
  })
  await sendEmail({
    to: subscription.accountEmail,
    subject: email.subject,
    body: email.body,
    kind: 'cycle-reminder',
    relatedType: 'cycle',
    relatedId: cycle.id,
  })
  await db
    .update(billingCycles)
    .set({ reminderStage: stage, reminderAt: new Date() })
    .where(eq(billingCycles.id, cycle.id))
  result.remindersSent += 1
}

/** Manual bank-transfer subscriptions cannot be charged automatically.
 * When a cycle becomes due, notify the subscriber and wait for a new transfer.
 */
async function invoiceCycleIfDue(
  subscription: typeof subscriptions.$inferSelect,
  cycle: typeof billingCycles.$inferSelect,
  result: BillingRunResult
) {
  if (cycle.status !== 'scheduled' && cycle.status !== 'failed') return
  if (cycle.dueAt.getTime() > Date.now()) return
  if (!subscription.autoRenew) return

  await db
    .update(billingCycles)
    .set({ note: 'Pembayaran transfer manual: pelanggan harus transfer ulang. Tidak ada auto-debit.' })
    .where(eq(billingCycles.id, cycle.id))
  result.notes.push(`Perpanjangan ${subscription.accountEmail} menunggu transfer manual; tidak ada tagihan otomatis.`)
  await sendEmail({
    to: subscription.accountEmail,
    subject: `Perpanjangan ${subscription.planName} menunggu transfer`,
    body: [
      `Halo ${subscription.accountName},`,
      '',
      `Periode ${subscription.planName} telah jatuh tempo. Untuk melanjutkan, lakukan transfer manual sebesar ${money(Number(cycle.amountIdr))}.`,
      bankTransferInstructions(),
      `Status langganan: /langganan/status/${subscription.accessToken}`,
      '',
      'Tidak ada auto-debit atau penagihan otomatis.',
    ].join('\n'),
    kind: 'cycle-manual-transfer',
    relatedType: 'cycle',
    relatedId: cycle.id,
  }).catch(() => undefined)
}

/** The subscriber turns automatic renewal on or off. Their own click, their own record. */
export async function setAutoRenew(token: string, enabled: boolean) {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.accessToken, token))
    .limit(1)
  if (!subscription) return { ok: false as const, error: 'Langganan tidak ditemukan.' }

  if (subscription.status === 'cancelled') {
    return { ok: false as const, error: 'Langganan ini sudah dibatalkan. Hubungi pemilik untuk mengaktifkannya kembali.' }
  }

  if (enabled) {
    return { ok: false as const, error: 'Perpanjangan otomatis tidak tersedia untuk transfer manual. Pelanggan perlu transfer ulang setiap periode.' }
  }

  await db
    .update(subscriptions)
    .set({ autoRenew: enabled, autoRenewAt: enabled ? new Date() : subscription.autoRenewAt })
    .where(eq(subscriptions.id, subscription.id))

  if (!enabled) {
    await db
      .update(billingCycles)
      .set({ status: 'skipped', note: 'Pelanggan mematikan perpanjangan otomatis.' })
      .where(and(eq(billingCycles.subscriptionId, subscription.id), inArray(billingCycles.status, ['scheduled', 'failed'])))
  }

  await db.insert(activity).values({
    actor: 'system',
    action: enabled ? 'Perpanjangan otomatis dinyalakan pelanggan' : 'Perpanjangan otomatis dimatikan pelanggan',
    detail: `${subscription.planName} — ${subscription.accountEmail}.`,
    dataSource: 'live',
  })

  return { ok: true as const, autoRenew: enabled }
}

/**
 * A cancellation or refund request. Both stop at the owner's desk: nothing is
 * cancelled and no money moves until the owner decides. The refund itself is issued
 * by the owner from here, against the provider, after approval.
 */
export async function createBillingRequest(args: {
  kind: 'cancel' | 'refund'
  token: string
  reason: string
}) {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.accessToken, args.token))
    .limit(1)
  if (!subscription) return { ok: false as const, error: 'Langganan tidak ditemukan.' }

  if (args.kind === 'cancel' && (subscription.status === 'cancelled' || subscription.status === 'expired')) {
    return { ok: false as const, error: 'Langganan ini sudah tidak aktif.' }
  }

  const paidCycles = await db
    .select()
    .from(billingCycles)
    .where(and(eq(billingCycles.subscriptionId, subscription.id), eq(billingCycles.status, 'paid')))
    .orderBy(desc(billingCycles.paidAt))
    .limit(1)

  if (args.kind === 'refund' && paidCycles.length === 0) {
    return { ok: false as const, error: 'Belum ada pembayaran terkonfirmasi untuk langganan ini, jadi tidak ada yang bisa direfund.' }
  }

  const existing = await db
    .select({ id: billingRequests.id })
    .from(billingRequests)
    .where(and(eq(billingRequests.subscriptionId, subscription.id), eq(billingRequests.kind, args.kind), eq(billingRequests.status, 'pending')))
    .limit(1)
  if (existing.length > 0) {
    return { ok: false as const, error: 'Permintaan yang sama masih menunggu keputusan pemilik.' }
  }

  const reference = args.kind === 'refund' ? paidCycles[0] : null
  const [request] = await db
    .insert(billingRequests)
    .values({
      kind: args.kind,
      subscriptionId: subscription.id,
      cycleId: reference?.id ?? null,
      email: subscription.accountEmail,
      reason: args.reason,
      amountIdr: reference ? Number(reference.amountIdr) : Number(subscription.amountIdr),
      status: 'pending',
    })
    .returning()

  const [proposal] = await db
    .insert(proposals)
    .values({
      title: args.kind === 'refund' ? `Refund ${money(Number(request.amountIdr ?? 0))} — ${subscription.planName}` : `Pembatalan langganan — ${subscription.planName}`,
      summary:
        args.kind === 'refund'
          ? `Pelanggan ${subscription.accountEmail} meminta refund untuk pembayaran terakhir. Alasan: ${args.reason}`
          : `Pelanggan ${subscription.accountEmail} meminta pembatalan langganan. Alasan: ${args.reason}`,
      category: 'finance',
      amountIdr: args.kind === 'refund' ? Number(request.amountIdr ?? 0) : null,
      risk: 'medium',
      status: 'pending',
      dataSource: 'live',
    })
    .returning()

  await db.update(billingRequests).set({ proposalId: proposal.id }).where(eq(billingRequests.id, request.id))

  await db.insert(activity).values({
    actor: 'system',
    action: args.kind === 'refund' ? 'Permintaan refund masuk' : 'Permintaan pembatalan masuk',
    detail: `${subscription.planName} — ${subscription.accountEmail}. Menunggu keputusan pemilik. Alasan: ${args.reason}`,
    dataSource: 'live',
  })

  await notifyOwner({
    subject: args.kind === 'refund' ? 'Permintaan refund baru' : 'Permintaan pembatalan langganan',
    lines: [
      `${subscription.accountName} (${subscription.accountEmail}) mengajukan ${args.kind === 'refund' ? 'refund' : 'pembatalan'}.`,
      `Paket: ${subscription.planName}`,
      `Alasan: ${args.reason}`,
      'Buka Pusat persetujuan untuk memutuskan.',
    ],
    kind: `owner-${args.kind}-request`,
    relatedId: request.id,
  }).catch(() => undefined)

  return { ok: true as const, requestId: request.id }
}

export async function getBillingRequests(status = 'pending') {
  return db
    .select({ request: billingRequests, subscription: subscriptions })
    .from(billingRequests)
    .leftJoin(subscriptions, eq(billingRequests.subscriptionId, subscriptions.id))
    .where(eq(billingRequests.status, status))
    .orderBy(desc(billingRequests.createdAt))
}

export async function decideBillingRequest(args: {
  requestId: string
  approved: boolean
  note?: string
}) {
  const [row] = await db
    .select({ request: billingRequests, subscription: subscriptions })
    .from(billingRequests)
    .leftJoin(subscriptions, eq(billingRequests.subscriptionId, subscriptions.id))
    .where(and(eq(billingRequests.id, args.requestId), eq(billingRequests.status, 'pending')))
    .limit(1)

  if (!row) return { ok: false as const, error: 'Permintaan ini sudah diputuskan atau tidak ditemukan.' }

  const { request, subscription } = row
  await db
    .update(billingRequests)
    .set({ status: args.approved ? 'approved' : 'rejected', decisionNote: args.note ?? null, decidedAt: new Date() })
    .where(eq(billingRequests.id, request.id))

  if (request.proposalId) {
    await db
      .update(proposals)
      .set({
        status: args.approved ? 'approved' : 'rejected',
        decisionNote: args.note ?? null,
        decidedAt: new Date(),
      })
      .where(eq(proposals.id, request.proposalId))
  }

  if (!subscription) return { ok: true as const, refund: null }

  if (!args.approved) {
    const email = {
      subject: `Permintaan ${request.kind === 'refund' ? 'refund' : 'pembatalan'} belum dapat disetujui`,
      body: [
        `Halo ${subscription.accountName},`,
        '',
        `Permintaan ${request.kind === 'refund' ? 'refund' : 'pembatalan'} Anda belum dapat disetujui.`,
        args.note ? `Catatan pemilik: ${args.note}` : '',
        '',
        `Kelola langganan: /langganan/status/${subscription.accessToken}`,
      ]
        .filter(Boolean)
        .join('\n'),
    }
    await sendEmail({
      to: subscription.accountEmail,
      subject: email.subject,
      body: email.body,
      kind: 'request-rejected',
      relatedType: 'request',
      relatedId: request.id,
    })
    return { ok: true as const, refund: null }
  }

  if (request.kind === 'cancel') {
    await db
      .update(subscriptions)
      .set({ status: 'cancelled', cancelledAt: new Date(), cancelReason: request.reason, autoRenew: false })
      .where(eq(subscriptions.id, subscription.id))
    await db
      .update(billingCycles)
      .set({ status: 'skipped', note: 'Langganan dibatalkan.' })
      .where(and(eq(billingCycles.subscriptionId, subscription.id), inArray(billingCycles.status, ['scheduled', 'failed'])))

    const email = {
      subject: `Langganan ${subscription.planName} dibatalkan`,
      body: [
        `Halo ${subscription.accountName},`,
        '',
        `Pembatalan langganan ${subscription.planName} sudah diproses. Tidak ada tagihan berikutnya yang dibuat.`,
        args.note ? `Catatan pemilik: ${args.note}` : '',
        '',
        `Rincian: /langganan/status/${subscription.accessToken}`,
      ]
        .filter(Boolean)
        .join('\n'),
    }
    await sendEmail({
      to: subscription.accountEmail,
      subject: email.subject,
      body: email.body,
      kind: 'cancel-approved',
      relatedType: 'request',
      relatedId: request.id,
    })
    await db.insert(activity).values({
      actor: 'owner',
      action: 'Pembatalan langganan disetujui',
      detail: `${subscription.planName} — ${subscription.accountEmail}.`,
      dataSource: 'live',
    })
    return { ok: true as const, refund: null }
  }

  const cycle = request.cycleId
    ? (await db.select().from(billingCycles).where(eq(billingCycles.id, request.cycleId)).limit(1))[0]
    : null
  const amount = Number(request.amountIdr ?? cycle?.amountIdr ?? 0)
  const message = `Refund disetujui untuk ${money(amount)}, tetapi transfer pengembalian harus dilakukan manual dari rekening pemilik. Jangan tandai lunas sebelum transfer benar-benar dilakukan.`
  await db.update(billingRequests).set({ status: 'approved-unpaid', decisionNote: message }).where(eq(billingRequests.id, request.id))
  await db.insert(activity).values({
    actor: 'owner',
    action: 'Refund disetujui — menunggu transfer manual',
    detail: `${subscription.planName} — ${subscription.accountEmail}. ${message}`,
    dataSource: 'live',
  })
  return { ok: true as const, refund: null, warning: message }
}

export async function billingConfigStatus() {
  return {
    paymentReady: Boolean(process.env.BANK_NAME?.trim() && process.env.BANK_ACCOUNT_NAME?.trim() && process.env.BANK_ACCOUNT_NUMBER?.trim()),
    emailReady: emailConfigured(),
  }
}

/** Plans with their interval, so a yearly plan is not shown as a monthly price. */
export async function getPlanIntervals() {
  const rows = await db.select({ code: plans.code, interval: plans.interval }).from(plans)
  return new Map(rows.map((row) => [row.code, intervalOf(row.interval)]))
}
