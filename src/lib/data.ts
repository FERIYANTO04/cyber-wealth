import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from './db'
import {
  activity,
  affiliateCommissions,
  affiliateLinks,
  affiliatePrograms,
  agents,
  assets,
  orders,
  plans,
  products,
  proposals,
  serviceRequests,
  services,
  settings,
  subscriptions,
  transactions,
} from './db/schema'

export const SETTINGS_ID = 'singleton'
export const NET_WORTH_TARGET = 500_000_000_000

export type Settings = {
  aiPaused: boolean
  netWorthTargetIdr: number
  pausedAt: Date | null
  updatedAt: Date
}

export async function getSettings(): Promise<Settings> {
  const rows = await db.select().from(settings).where(eq(settings.id, SETTINGS_ID)).limit(1)
  if (rows.length > 0) {
    const row = rows[0]
    return {
      aiPaused: row.aiPaused,
      netWorthTargetIdr: Number(row.netWorthTargetIdr),
      pausedAt: row.pausedAt,
      updatedAt: row.updatedAt,
    }
  }
  const inserted = await db
    .insert(settings)
    .values({ id: SETTINGS_ID, aiPaused: false, netWorthTargetIdr: NET_WORTH_TARGET })
    .onConflictDoNothing()
    .returning()
  if (inserted.length > 0) {
    return {
      aiPaused: inserted[0].aiPaused,
      netWorthTargetIdr: Number(inserted[0].netWorthTargetIdr),
      pausedAt: inserted[0].pausedAt,
      updatedAt: inserted[0].updatedAt,
    }
  }
  return { aiPaused: false, netWorthTargetIdr: NET_WORTH_TARGET, pausedAt: null, updatedAt: new Date() }
}

export type Ledger = {
  revenue: number
  expenses: number
  netCash: number
  assets: number
  netWorth: number
  rows: number
}

async function buildLedger(source: 'live' | 'demo'): Promise<Ledger> {
  const txRows = await db
    .select({ kind: transactions.kind, amount: transactions.amountIdr })
    .from(transactions)
    .where(eq(transactions.dataSource, source))
  const assetRows = await db
    .select({ value: assets.valueIdr })
    .from(assets)
    .where(eq(assets.dataSource, source))

  let revenue = 0
  let expenses = 0
  for (const row of txRows) {
    if (row.kind === 'revenue') revenue += Number(row.amount)
    else expenses += Number(row.amount)
  }
  let assetTotal = 0
  for (const row of assetRows) assetTotal += Number(row.value)

  const netCash = revenue - expenses
  return {
    revenue,
    expenses,
    netCash,
    assets: assetTotal,
    netWorth: assetTotal + netCash,
    rows: txRows.length + assetRows.length,
  }
}

export async function getFinance() {
  const live = await buildLedger('live')
  const demo = await buildLedger('demo')
  return { live, demo }
}

export async function getAgents() {
  return db.select().from(agents).orderBy(agents.sortOrder)
}

export async function getPendingProposals() {
  return db
    .select({ proposal: proposals, agentName: agents.name, agentRole: agents.role })
    .from(proposals)
    .leftJoin(agents, eq(proposals.agentId, agents.id))
    .where(eq(proposals.status, 'pending'))
    .orderBy(desc(proposals.createdAt))
}

export async function getRecentDecisions(limit = 8) {
  return db
    .select()
    .from(proposals)
    .where(sql`${proposals.status} <> 'pending'`)
    .orderBy(desc(proposals.decidedAt))
    .limit(limit)
}

export async function getActivity(limit = 40) {
  return db.select().from(activity).orderBy(desc(activity.createdAt)).limit(limit)
}

export async function getCounts() {
  const pending = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(proposals)
    .where(eq(proposals.status, 'pending'))
  const activeAgents = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(agents)
    .where(eq(agents.status, 'active'))
  const totalAgents = await db.select({ n: sql<number>`count(*)::int` }).from(agents)
  const decided = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(proposals)
    .where(sql`${proposals.status} <> 'pending'`)
  return {
    pending: pending[0]?.n ?? 0,
    activeAgents: activeAgents[0]?.n ?? 0,
    totalAgents: totalAgents[0]?.n ?? 0,
    decided: decided[0]?.n ?? 0,
  }
}

export async function logActivity(entry: {
  actor: 'owner' | 'agent' | 'system'
  action: string
  detail: string
  agentName?: string | null
  dataSource?: 'live' | 'demo'
}) {
  await db.insert(activity).values({
    actor: entry.actor,
    action: entry.action,
    detail: entry.detail,
    agentName: entry.agentName ?? null,
    dataSource: entry.dataSource ?? 'live',
  })
}

export async function getDailyReport() {
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)

  const todayTx = await db
    .select({
      kind: transactions.kind,
      amount: transactions.amountIdr,
      dataSource: transactions.dataSource,
    })
    .from(transactions)
    .where(sql`${transactions.occurredAt} >= ${startOfDay.toISOString()}`)

  let liveRevenue = 0
  let liveExpenses = 0
  let demoRevenue = 0
  let demoExpenses = 0
  for (const row of todayTx) {
    const amount = Number(row.amount)
    if (row.dataSource === 'live') {
      if (row.kind === 'revenue') liveRevenue += amount
      else liveExpenses += amount
    } else if (row.kind === 'revenue') demoRevenue += amount
    else demoExpenses += amount
  }

  const decisionsToday = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(proposals)
    .where(and(sql`${proposals.status} <> 'pending'`, sql`${proposals.decidedAt} >= ${startOfDay.toISOString()}`))

  const finance = await getFinance()
  const counts = await getCounts()

  return {
    liveRevenue,
    liveExpenses,
    demoRevenue,
    demoExpenses,
    decisionsToday: decisionsToday[0]?.n ?? 0,
    pending: counts.pending,
    activeAgents: counts.activeAgents,
    totalAgents: counts.totalAgents,
    netWorth: finance.live.netWorth,
    liveRows: finance.live.rows,
    demoRows: finance.demo.rows,
  }
}

/** Headline figures for the four revenue engines — all counted from real rows. */
export async function getEngineCounts() {
  const [publishedProducts] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(and(eq(products.status, 'published'), eq(products.dataSource, 'live')))
  const [paidOrders] = await db
    .select({ n: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${orders.amountIdr}),0)::bigint` })
    .from(orders)
    .where(and(eq(orders.status, 'paid'), eq(orders.dataSource, 'live')))
  const [publishedServices] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(services)
    .where(eq(services.status, 'published'))
  const [jobRequests] = await db.select({ n: sql<number>`count(*)::int` }).from(serviceRequests)
  const [programs] = await db.select({ n: sql<number>`count(*)::int` }).from(affiliatePrograms)
  const [clicks] = await db
    .select({ n: sql<number>`coalesce(sum(${affiliateLinks.clicks}),0)::int` })
    .from(affiliateLinks)
  const [commission] = await db
    .select({ total: sql<number>`coalesce(sum(${affiliateCommissions.amountIdr}),0)::bigint` })
    .from(affiliateCommissions)
  const [publishedPlans] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(plans)
    .where(eq(plans.status, 'published'))
  const activeSubs = await db
    .select({
      n: sql<number>`count(*)::int`,
      // A yearly plan is divided by twelve here so the figure stays a monthly one.
      total: sql<number>`coalesce(sum(case when ${subscriptions.interval} = 'year' then round(${subscriptions.amountIdr} / 12) else ${subscriptions.amountIdr} end),0)::bigint`,
    })
    .from(subscriptions)
    .where(and(eq(subscriptions.status, 'active'), eq(subscriptions.dataSource, 'live')))

  return {
    services: publishedServices?.n ?? 0,
    jobs: jobRequests?.n ?? 0,
    products: publishedProducts?.n ?? 0,
    orders: paidOrders?.n ?? 0,
    revenueIdr: Number(paidOrders?.total ?? 0),
    programs: programs?.n ?? 0,
    clicks: clicks?.n ?? 0,
    commissionIdr: Number(commission?.total ?? 0),
    plans: publishedPlans?.n ?? 0,
    activeSubs: activeSubs[0]?.n ?? 0,
    mrrIdr: Number(activeSubs[0]?.total ?? 0),
  }
}

export type MonthlyPoint = { month: string; label: string; revenue: number; expenses: number; profit: number }

/**
 * Six months of real ledger rows, newest last. Profit is revenue minus expenses for the
 * same month — never a projection, and demo rows are excluded from the owner's figures.
 */
export async function getMonthlyReport(months = 6): Promise<{ points: MonthlyPoint[]; total: MonthlyPoint }> {
  const start = new Date()
  start.setUTCDate(1)
  start.setUTCHours(0, 0, 0, 0)
  start.setUTCMonth(start.getUTCMonth() - (months - 1))

  const rows = await db
    .select({
      kind: transactions.kind,
      amount: transactions.amountIdr,
      occurredAt: transactions.occurredAt,
    })
    .from(transactions)
    .where(and(eq(transactions.dataSource, 'live'), sql`${transactions.occurredAt} >= ${start.toISOString()}`))

  const buckets = new Map<string, { revenue: number; expenses: number }>()
  for (let i = 0; i < months; i += 1) {
    const d = new Date(start)
    d.setUTCMonth(start.getUTCMonth() + i)
    buckets.set(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`, { revenue: 0, expenses: 0 })
  }

  for (const row of rows) {
    const d = new Date(row.occurredAt)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    const bucket = buckets.get(key)
    if (!bucket) continue
    const amount = Number(row.amount)
    if (row.kind === 'revenue') bucket.revenue += amount
    else bucket.expenses += amount
  }

  const points: MonthlyPoint[] = []
  for (const [key, value] of buckets) {
    const [year, month] = key.split('-').map(Number)
    const label = new Date(Date.UTC(year!, month! - 1, 1)).toLocaleDateString('id-ID', {
      month: 'short',
      timeZone: 'UTC',
    })
    points.push({ month: key, label, revenue: value.revenue, expenses: value.expenses, profit: value.revenue - value.expenses })
  }

  const total = points.reduce<MonthlyPoint>(
    (acc, point) => ({
      month: 'total',
      label: 'Total',
      revenue: acc.revenue + point.revenue,
      expenses: acc.expenses + point.expenses,
      profit: acc.profit + point.profit,
    }),
    { month: 'total', label: 'Total', revenue: 0, expenses: 0, profit: 0 }
  )

  return { points, total }
}
