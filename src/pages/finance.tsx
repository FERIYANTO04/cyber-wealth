import type { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import { and, desc, eq } from 'drizzle-orm'
import { ConsoleFrame } from '@/components/ConsoleFrame'
import { FinanceLedger, type LedgerRow } from '@/components/FinanceLedger'
import { TransactionForm } from '@/components/TransactionForm'
import { PageStack, Toolbar } from '@/components/ui'
import { FinanceSummary } from '@/components/FinanceSummary'
import { ProfitReport } from '@/components/ProfitReport'
import { requireOwnerPage } from '@/lib/auth'
import { db } from '@/lib/db'
import { transactions } from '@/lib/db/schema'
import { getFinance, getMonthlyReport, getSettings } from '@/lib/data'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }
  ctx.res.setHeader('Cache-Control', 'private, no-store, max-age=0')

  const [finance, settings, liveRows, demoRows] = await Promise.all([
    getFinance(),
    getSettings(),
    db.select().from(transactions)
      .where(and(eq(transactions.dataSource, 'live'), eq(transactions.ledger, 'owner')))
      .orderBy(desc(transactions.occurredAt)).limit(30),
    db.select().from(transactions)
      .where(and(eq(transactions.dataSource, 'demo'), eq(transactions.ledger, 'owner')))
      .orderBy(desc(transactions.occurredAt)).limit(12),
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

  return { props: { finance, monthly, target: settings.netWorthTargetIdr, live: liveRows.map(map), demo: demoRows.map(map) } }
}

type Props = {
  finance: Awaited<ReturnType<typeof getFinance>>
  monthly: Awaited<ReturnType<typeof getMonthlyReport>>
  target: number
  live: LedgerRow[]
  demo: LedgerRow[]
}

function FinancePage({ finance, monthly, target, live, demo }: Props) {
  const router = useRouter()
  return (
    <PageStack>
      <FinanceSummary live={finance.live} target={target} />
      <ProfitReport points={monthly.points} total={monthly.total} />
      <Toolbar><TransactionForm ledger="owner" onSaved={() => router.replace(router.asPath)} /></Toolbar>
      <FinanceLedger live={live} demo={demo} title="Buku besar Owner" />
    </PageStack>
  )
}

const Page = FinancePage as PageWithFrame<Props>
Page.getLayout = (page) => (
  <ConsoleFrame eyebrow="Keuangan pribadi" title="Keuangan Owner"
    intent="Aset, pemasukan, pengeluaran, dan kekayaan pribadi Anda. Pendapatan serta aset perusahaan ditampilkan terpisah."
  >{page}</ConsoleFrame>
)
export default Page
