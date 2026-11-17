import type { GetServerSideProps } from 'next'
import { desc, eq } from 'drizzle-orm'
import { ConsoleFrame } from '@/components/ConsoleFrame'
import { BillingConsole, type BillingFigures, type CycleItem, type RequestItem } from '@/components/BillingConsole'
import { requireOwnerPage } from '@/lib/auth'
import { db } from '@/lib/db'
import { billingCycles, billingRequests, subscriptions } from '@/lib/db/schema'
import { getBillingTotals } from '@/lib/billing'
import { billingConfigStatus } from '@/lib/billing'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }

  const figures = await getBillingTotals()
  const config = await billingConfigStatus()

  const cycleRows = await db
    .select({ cycle: billingCycles, subscription: subscriptions })
    .from(billingCycles)
    .leftJoin(subscriptions, eq(billingCycles.subscriptionId, subscriptions.id))
    .orderBy(desc(billingCycles.dueAt))
    .limit(60)

  const requestRows = await db
    .select({ request: billingRequests, subscription: subscriptions })
    .from(billingRequests)
    .leftJoin(subscriptions, eq(billingRequests.subscriptionId, subscriptions.id))
    .where(eq(billingRequests.status, 'pending'))
    .orderBy(desc(billingRequests.createdAt))

  return {
    props: {
      figures,
      paymentReady: config.paymentReady,
      emailReady: config.emailReady,
      cycles: cycleRows.map(
        (row): CycleItem => ({
          id: row.cycle.id,
          subscriber: row.subscription?.accountEmail ?? '—',
          planName: row.subscription?.planName ?? '—',
          amountIdr: Number(row.cycle.amountIdr),
          dueAt: row.cycle.dueAt.toISOString(),
          periodEnd: row.cycle.periodEnd.toISOString(),
          status: row.cycle.status,
          invoiceUrl: row.cycle.invoiceUrl,
          note: row.cycle.note,
          dataSource: row.subscription?.dataSource === 'demo' ? 'demo' : 'live',
        })
      ),
      requests: requestRows.map(
        (row): RequestItem => ({
          id: row.request.id,
          kind: row.request.kind as 'cancel' | 'refund',
          subscriber: row.request.email,
          planName: row.subscription?.planName ?? '—',
          reason: row.request.reason,
          amountIdr: row.request.amountIdr === null ? null : Number(row.request.amountIdr),
          createdAt: row.request.createdAt.toISOString(),
          status: row.request.status,
        })
      ),
    },
  }
}

type Props = {
  figures: BillingFigures
  cycles: CycleItem[]
  requests: RequestItem[]
  paymentReady: boolean
  emailReady: boolean
}

function BillingPage(props: Props) {
  return <BillingConsole {...props} />
}

const Page = BillingPage as PageWithFrame<Props>
Page.getLayout = (page) => (
  <ConsoleFrame
    eyebrow="Mesin 4 · Pendapatan berulang"
    title="Tagihan berulang"
    intent="MRR, periode tagihan, pengingat, dan permintaan pembatalan atau refund yang menunggu keputusan Anda."
  >
    {page}
  </ConsoleFrame>
)
export default Page
