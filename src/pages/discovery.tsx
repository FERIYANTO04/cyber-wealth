import type { GetServerSideProps } from 'next'
import { desc, eq } from 'drizzle-orm'
import { ConsoleFrame } from '@/components/ConsoleFrame'
import { AgentRow, type AgentItem } from '@/components/AgentList'
import { MarketBoard, type SignalRow } from '@/components/MarketBoard'
import { EmptyState, PageStack, Panel, PanelBody, PanelHead } from '@/components/ui'
import { requireOwnerPage } from '@/lib/auth'
import { db } from '@/lib/db'
import { agents, marketSignals } from '@/lib/db/schema'
import { getSettings } from '@/lib/data'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }
  ctx.res.setHeader('Cache-Control', 'private, no-store, max-age=0')

  const [settings, agentRows, signalRows] = await Promise.all([
    getSettings(),
    db.select().from(agents).where(eq(agents.role, 'AI Market Research')).limit(1),
    db.select().from(marketSignals).orderBy(desc(marketSignals.createdAt)).limit(60),
  ])

  return {
    props: {
      paused: settings.aiPaused,
      agent: agentRows[0] ? {
        id: agentRows[0].id,
        name: agentRows[0].name,
        role: agentRows[0].role,
        mandate: agentRows[0].mandate,
        status: agentRows[0].status,
        dataSource: agentRows[0].dataSource as 'live' | 'demo',
        lastRunAt: agentRows[0].lastRunAt ? agentRows[0].lastRunAt.toISOString() : null,
      } satisfies AgentItem : null,
      signals: signalRows.map((row): SignalRow => ({
        id: row.id,
        title: row.title,
        market: row.market,
        evidence: row.evidence,
        metric: row.metric,
        confidence: row.confidence,
        dataSource: row.dataSource as 'live' | 'demo',
        createdAt: row.createdAt.toISOString(),
      })),
    },
  }
}

type Props = { paused: boolean; agent: AgentItem | null; signals: SignalRow[] }

function DiscoveryPage({ paused, agent, signals }: Props) {
  const measured = signals.filter((row) => row.confidence === 'measured').length
  const proposed = signals.filter((row) => row.confidence !== 'measured').length

  return (
    <PageStack>
      <div className="grid gap-3 sm:grid-cols-2">
        <Panel><PanelBody><p className="eyebrow">Bukti permintaan</p><p className="mt-2 text-2xl font-semibold tabular-nums">{measured}</p><p className="mt-1 text-xs text-ink-quiet">Sinyal terukur dari transaksi/permintaan tercatat</p></PanelBody></Panel>
        <Panel><PanelBody><p className="eyebrow">Peluang untuk diuji</p><p className="mt-2 text-2xl font-semibold tabular-nums">{proposed}</p><p className="mt-1 text-xs text-ink-quiet">Usulan AI, belum dianggap sebagai permintaan terbukti</p></PanelBody></Panel>
      </div>

      <Panel>
        <PanelHead label="Tim riset peluang bisnis" />
        {agent ? (
          <AgentRow agent={agent} globalPaused={paused} runnable />
        ) : (
          <PanelBody>
            <EmptyState title="Agen riset belum tersedia" body="Agen AI Market Research belum terdaftar. Tidak ada riset otomatis yang dijalankan." />
          </PanelBody>
        )}
      </Panel>

      <section className="space-y-2">
        <div>
          <h2 className="heading-tight text-base">Hasil penemuan peluang</h2>
          <p className="mt-1 text-xs text-ink-quiet">Pisahkan bukti yang sudah tercatat dari ide yang masih perlu diuji. Tidak ada estimasi yang dihitung sebagai pendapatan.</p>
        </div>
        <MarketBoard signals={signals} />
      </section>

      <Panel>
        <PanelHead label="Alur keputusan" />
        <PanelBody>
          <ol className="grid gap-3 text-sm sm:grid-cols-3">
            <li><span className="font-semibold">1. Temukan</span><p className="mt-1 text-xs text-ink-quiet">AI membaca katalog, transaksi lunas, dan permintaan jasa yang tercatat.</p></li>
            <li><span className="font-semibold">2. Validasi</span><p className="mt-1 text-xs text-ink-quiet">Owner memeriksa bukti, pelanggan sasaran, biaya, dan risiko sebelum menguji ide.</p></li>
            <li><span className="font-semibold">3. Bangun</span><p className="mt-1 text-xs text-ink-quiet">Peluang yang lolos validasi masuk ke tahap MVP. Pengeluaran dan komitmen dana tetap perlu persetujuan owner.</p></li>
          </ol>
        </PanelBody>
      </Panel>
    </PageStack>
  )
}

const Page = DiscoveryPage as PageWithFrame<Props>
Page.getLayout = (page) => (
  <ConsoleFrame
    eyebrow="Strategi pertumbuhan"
    title="Business Discovery"
    intent="Temukan peluang usaha, bedakan bukti dari usulan AI, lalu tentukan eksperimen yang layak dibangun."
  >
    {page}
  </ConsoleFrame>
)
export default Page
