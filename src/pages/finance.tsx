import type { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import { desc, eq } from 'drizzle-orm'
import { ConsoleFrame } from '@/components/ConsoleFrame'
import { FinanceLedger, type LedgerRow } from '@/components/FinanceLedger'
import { TransactionForm } from '@/components/TransactionForm'
import { PageStack, Toolbar } from '@/components/ui'
import { FinanceSummary } from '@/components/FinanceSummary'
import { ProfitReport } from '@/components/ProfitReport'
import { SalesOutcomeCard } from '@/components/SalesOutcomeCard'
import { requireOwnerPage } from '@/lib/auth'
import { db } from '@/lib/db'
import { transactions } from '@/lib/db/schema'
import { getFinance, getMonthlyReport, getSettings } from '@/lib/data'
import { getOrderCounts } from '@/lib/revenue'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }

  const [finance, orderCounts, settings, liveRows, demoRows] = await Promise.all([
    getFinance(),
    getOrderCounts(),
    getSettings(),
    db
      .select()
      .from(transactions)
      .where(eq(transactions.dataSource, 'live'))
      .orderBy(desc(transactions.occurredAt))
      .limit(30),
    db
      .select()
      .from(transactions)
      .where(eq(transactions.dataSource, 'demo'))
      .orderBy(desc(transactions.occurredAt))
      .limit(12),
  ])

  const monthly = await getMonthlyReport(6)

  const map = (row: typeof transactions.$inferSelect): LedgerRow => ({
    id: row.id,
    kind: row.kind,
    category: row.category,
    description: row.description,
    amountIdr: Number(row.amountIdr),
    occurredAt: row.occurredAt.toISOString(),
    dataSource: row.dataSource as 'live' | 'demo',
  })

  return {
    props: {
      finance,
      monthly,
      orderCounts,
      target: settings.netWorthTargetIdr,
      live: liveRows.map(map),
      demo: demoRows.map(map),
    },
  }
}

type Props = {
  finance: Awaited<ReturnType<typeof getFinance>>
  monthly: Awaited<ReturnType<typeof getMonthlyReport>>
  orderCounts: Awaited<ReturnType<typeof getOrderCounts>>
  target: number
  live: LedgerRow[]
  demo: LedgerRow[]
}

function FinancePage({ finance, monthly, orderCounts, target, live, demo }: Props) {
  const router = useRouter()

  return (
    <PageStack>
      <SalesOutcomeCard netCash={finance.live.netCash} paid={orderCounts.paid} pending={orderCounts.pending} revenue={orderCounts.revenueIdr} />
      <FinanceSummary live={finance.live} target={target} />

      <ProfitReport points={monthly.points} total={monthly.total} />

      <Toolbar>
        <TransactionForm onSaved={() => router.replace(router.asPath)} />
      </Toolbar>

      <FinanceLedger live={live} demo={demo} />
    </PageStack>
  )
}

const Page = FinancePage as PageWithFrame<Props>
Page.getLayout = (page) => (
  <ConsoleFrame
    eyebrow="Buku besar"
    title="Keuangan"
    intent="Pemasukan, pengeluaran, arus kas, dan kekayaan bersih — hanya dari apa yang benar-benar Anda catat."
  >
    {page}
  </ConsoleFrame>
)
export default Page
