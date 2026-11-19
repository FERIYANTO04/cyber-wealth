import type { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import { and, desc, eq } from 'drizzle-orm'
import { ConsoleFrame } from '@/components/ConsoleFrame'
import { FinanceLedger, type LedgerRow } from '@/components/FinanceLedger'
import { TransactionForm } from '@/components/TransactionForm'
import { SalesOutcomeCard } from '@/components/SalesOutcomeCard'
import { CompanyFinanceSummary } from '@/components/CompanyFinanceSummary'
import { PageStack, Toolbar } from '@/components/ui'
import { requireOwnerPage } from '@/lib/auth'
import { db } from '@/lib/db'
import { transactions } from '@/lib/db/schema'
import { getFinance } from '@/lib/data'
import { getOrderCounts } from '@/lib/revenue'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }
  ctx.res.setHeader('Cache-Control', 'private, no-store, max-age=0')

  const [finance, orderCounts, rows] = await Promise.all([
    getFinance(),
    getOrderCounts(),
    db.select().from(transactions)
      .where(and(eq(transactions.dataSource, 'live'), eq(transactions.ledger, 'company')))
      .orderBy(desc(transactions.occurredAt)).limit(40),
  ])
  const live: LedgerRow[] = rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    category: row.category,
    description: row.description,
    amountIdr: Number(row.amountIdr),
    occurredAt: row.occurredAt.toISOString(),
    dataSource: 'live',
  }))
  return { props: { company: finance.company, orderCounts, live } }
}

type Props = {
  company: Awaited<ReturnType<typeof getFinance>>['company']
  orderCounts: Awaited<ReturnType<typeof getOrderCounts>>
  live: LedgerRow[]
}

function CompanyFinancePage({ company, orderCounts, live }: Props) {
  const router = useRouter()
  return (
    <PageStack>
      <SalesOutcomeCard netCash={company.netCash} paid={orderCounts.paid} pending={orderCounts.pending} revenue={orderCounts.revenueIdr} />
      <CompanyFinanceSummary live={company} />
      <Toolbar><TransactionForm ledger="company" onSaved={() => router.replace(router.asPath)} /></Toolbar>
      <FinanceLedger live={live} demo={[]} title="Buku besar perusahaan" />
    </PageStack>
  )
}

const Page = CompanyFinancePage as PageWithFrame<Props>
Page.getLayout = (page) => (
  <ConsoleFrame eyebrow="Keuangan bisnis" title="Keuangan Perusahaan"
    intent="Pendapatan penjualan, biaya operasional, aset, dan kas buku Cyber Wealth. Angka ini bukan kekayaan pribadi Owner."
  >{page}</ConsoleFrame>
)
export default Page
