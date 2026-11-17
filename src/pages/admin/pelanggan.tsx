import type { GetServerSideProps } from 'next'
import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm'
import { ConsoleFrame } from '@/components/ConsoleFrame'
import { BusinessStats, type BusinessFigures } from '@/components/BusinessStats'
import { CustomerList, type CustomerRow } from '@/components/CustomerList'
import { ContactInbox, type ContactRow } from '@/components/ContactInbox'
import { PageStack } from '@/components/ui'
import { requireOwnerPage } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  contactMessages,
  customerAccounts,
  memberAccounts,
  orders,
  subscriptions,
} from '@/lib/db/schema'
import { getBillingTotals } from '@/lib/billing'
import { getOrderCounts } from '@/lib/revenue'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }
  ctx.res.setHeader('Cache-Control', 'no-store')

  const accounts = await db.select().from(customerAccounts).orderBy(desc(customerAccounts.createdAt)).limit(200)
  const emails = accounts.map((row) => row.email.toLowerCase())

  const orderRows = emails.length
    ? await db
        .select({
          email: sql<string>`lower(${orders.buyerEmail})`,
          orderCount: sql<number>`count(*)::int`,
          spentIdr: sql<number>`coalesce(sum(case when ${orders.status} = 'paid' then ${orders.amountIdr} else 0 end), 0)::bigint`,
        })
        .from(orders)
        .where(inArray(sql`lower(${orders.buyerEmail})`, emails))
        .groupBy(sql`lower(${orders.buyerEmail})`)
    : []

  const subRows = emails.length
    ? await db
        .select({ email: sql<string>`lower(${subscriptions.accountEmail})`, n: sql<number>`count(*)::int` })
        .from(subscriptions)
        .where(
          and(
            inArray(sql`lower(${subscriptions.accountEmail})`, emails),
            eq(subscriptions.status, 'active'),
            eq(subscriptions.dataSource, 'live')
          )
        )
        .groupBy(sql`lower(${subscriptions.accountEmail})`)
    : []

  const orderByEmail = new Map(orderRows.map((row) => [row.email, row]))
  const subByEmail = new Map(subRows.map((row) => [row.email, row.n]))

  const customers: CustomerRow[] = accounts.map((row) => {
    const email = row.email.toLowerCase()
    const stats = orderByEmail.get(email)
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      verified: Boolean(row.emailVerifiedAt),
      createdAt: row.createdAt.toISOString(),
      orderCount: Number(stats?.orderCount ?? 0),
      spentIdr: Number(stats?.spentIdr ?? 0),
      activeSubscriptions: Number(subByEmail.get(email) ?? 0),
    }
  })

  const [[memberCount], [pendingSubs], [openMessages], orderCounts, billing] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(memberAccounts),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(subscriptions)
      .where(and(eq(subscriptions.status, 'pending'), eq(subscriptions.dataSource, 'live'))),
    db.select({ n: sql<number>`count(*)::int` }).from(contactMessages).where(eq(contactMessages.status, 'new')),
    getOrderCounts(),
    getBillingTotals(),
  ])

  const messages = await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(40)

  const [pendingOrders] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(eq(orders.status, 'pending'), ne(orders.dataSource, 'demo')))

  const figures: BusinessFigures = {
    customers: accounts.length,
    verifiedCustomers: accounts.filter((row) => row.emailVerifiedAt).length,
    members: Number(memberCount?.n ?? 0),
    paidOrders: orderCounts.paid,
    orderRevenueIdr: orderCounts.revenueIdr,
    activeSubscriptions: billing.active,
    mrrIdr: billing.mrrIdr,
    pendingPayments: Number(pendingOrders?.n ?? 0) + Number(pendingSubs?.n ?? 0),
    openMessages: Number(openMessages?.n ?? 0),
  }

  const contactRows: ContactRow[] = messages.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    body: row.body,
    status: row.status,
    ownerNote: row.ownerNote,
    createdAt: row.createdAt.toISOString(),
  }))

  return { props: { figures, customers, messages: contactRows } }
}

type Props = {
  figures: BusinessFigures
  customers: CustomerRow[]
  messages: ContactRow[]
}

function PelangganPage({ figures, customers, messages }: Props) {
  return (
    <PageStack>
      <BusinessStats figures={figures} />
      <CustomerList customers={customers} />
      <ContactInbox messages={messages} />
    </PageStack>
  )
}

const Page = PelangganPage as PageWithFrame<Props>
Page.getLayout = (page) => (
  <ConsoleFrame
    eyebrow="Pemilik"
    title="Pelanggan & pesan"
    intent="Angka utama bisnis, daftar akun pembeli, dan pesan yang masuk dari halaman kontak."
  >
    {page}
  </ConsoleFrame>
)
export default Page
