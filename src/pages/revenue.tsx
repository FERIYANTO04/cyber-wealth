import type { GetServerSideProps } from 'next'
import { desc } from 'drizzle-orm'
import { ConsoleFrame } from '@/components/ConsoleFrame'
import { EngineHub, buildHub } from '@/components/EngineHub'
import { LeadDesk, type Lead } from '@/components/LeadDesk'
import { MarketBoard, type SignalRow } from '@/components/MarketBoard'
import { PageStack } from '@/components/ui'
import { requireOwnerPage } from '@/lib/auth'
import { db } from '@/lib/db'
import { marketSignals, revenueLeads } from '@/lib/db/schema'
import { getEngineCounts } from '@/lib/data'
import { aiConfigured } from '@/lib/ai'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }

  const [leads, engines, signals] = [
    await db.select().from(revenueLeads).orderBy(desc(revenueLeads.createdAt)).limit(50),
    await getEngineCounts(),
    await db.select().from(marketSignals).orderBy(desc(marketSignals.createdAt)).limit(40),
  ]

  return {
    props: {
      engines,
      aiReady: aiConfigured(),
      signals: signals.map(
        (row): SignalRow => ({
          id: row.id,
          title: row.title,
          market: row.market,
          evidence: row.evidence,
          metric: row.metric,
          confidence: row.confidence,
          dataSource: row.dataSource as 'live' | 'demo',
          createdAt: row.createdAt.toISOString(),
        })
      ),
      leads: leads.map(
        (row): Lead => ({
          id: row.id,
          name: row.name,
          email: row.email,
          market: row.market,
          interest: row.interest,
          status: row.status,
          notes: row.notes,
          outreachBody: row.outreachBody,
          outreachSource: row.outreachSource,
          lastContactedAt: row.lastContactedAt ? row.lastContactedAt.toISOString() : null,
          createdAt: row.createdAt.toISOString(),
        })
      ),
    },
  }
}

type Props = {
  leads: Lead[]
  aiReady: boolean
  engines: Awaited<ReturnType<typeof getEngineCounts>>
  signals: SignalRow[]
}

function RevenuePage({ leads, engines, aiReady, signals }: Props) {
  return (
    <PageStack>
      <EngineHub engines={buildHub(engines)} />
      <MarketBoard signals={signals} />
      <LeadDesk initial={leads} aiReady={aiReady} />
    </PageStack>
  )
}

const Page = RevenuePage as PageWithFrame<Props>
Page.getLayout = (page) => (
  <ConsoleFrame
    eyebrow="Pertumbuhan bisnis"
    title="Mesin pendapatan"
    intent="Empat mesin pendapatan dan pipeline calon pelanggan dalam satu tempat."
  >
    {page}
  </ConsoleFrame>
)
export default Page
