import type { GetServerSideProps } from 'next'
import { ConsoleFrame } from '@/components/ConsoleFrame'
import { SupervisionRail } from '@/components/SupervisionRail'
import { WealthRow } from '@/components/NetWorthPanel'
import { TodayReport } from '@/components/TodayReport'
import { AgentMiniList, type AgentItem } from '@/components/AgentList'
import { ActivityFeed, type FeedEntry } from '@/components/ActivityFeed'
import { ProposalCard, type ProposalItem } from '@/components/ProposalCard'
import { EmptyState, PageStack, Panel, SectionHead, PairColumns, BlockColumn } from '@/components/ui'
import { requireOwnerPage } from '@/lib/auth'
import {
  getActivity,
  getAgents,
  getCounts,
  getDailyReport,
  getEngineCounts,
  getFinance,
  getPendingProposals,
  getSettings,
} from '@/lib/data'
import { EngineOverview, enginesFromCounts } from '@/components/EngineOverview'
import { AutopilotScheduler } from '@/components/AutopilotScheduler'
import { AiChat } from '@/components/AiChat'
import { aiConfigured } from '@/lib/ai'
import { getChatTurns, type ChatTurn } from '@/lib/ai-chat'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }
  ctx.res.setHeader('Cache-Control', 'no-store')

  const [settings, finance, counts, pending, agents, report, feed, engines] = await Promise.all([
    getSettings(),
    getFinance(),
    getCounts(),
    getPendingProposals(),
    getAgents(),
    getDailyReport(),
    getActivity(8),
    getEngineCounts(),
  ])

  const chatTurns = await getChatTurns(guard.session.email)

  return {
    props: {
      aiPaused: settings.aiPaused,
      chatConfigured: aiConfigured(),
      chatTurns,
      target: settings.netWorthTargetIdr,
      finance,
      counts,
      report,
      engines,
      agents: agents.map(
        (agent): AgentItem => ({
          id: agent.id,
          name: agent.name,
          role: agent.role,
          mandate: agent.mandate,
          status: agent.status,
          dataSource: agent.dataSource as 'live' | 'demo',
          lastRunAt: agent.lastRunAt ? agent.lastRunAt.toISOString() : null,
        })
      ),
      pending: pending.slice(0, 3).map(
        (row): ProposalItem => ({
          id: row.proposal.id,
          title: row.proposal.title,
          summary: row.proposal.summary,
          category: row.proposal.category,
          amountIdr: row.proposal.amountIdr === null ? null : Number(row.proposal.amountIdr),
          risk: row.proposal.risk,
          status: row.proposal.status,
          decidedAt: row.proposal.decidedAt ? row.proposal.decidedAt.toISOString() : null,
          decisionNote: row.proposal.decisionNote,
          dataSource: row.proposal.dataSource as 'live' | 'demo',
          createdAt: row.proposal.createdAt.toISOString(),
          agentName: row.agentName,
          agentRole: row.agentRole,
        })
      ),
      feed: feed.map(
        (entry): FeedEntry => ({
          id: entry.id,
          actor: entry.actor,
          agentName: entry.agentName,
          action: entry.action,
          detail: entry.detail,
          dataSource: entry.dataSource as 'live' | 'demo',
          createdAt: entry.createdAt.toISOString(),
        })
      ),
    },
  }
}

type Props = {
  aiPaused: boolean
  chatConfigured: boolean
  chatTurns: ChatTurn[]
  target: number
  finance: Awaited<ReturnType<typeof getFinance>>
  counts: Awaited<ReturnType<typeof getCounts>>
  report: Awaited<ReturnType<typeof getDailyReport>>
  agents: AgentItem[]
  pending: ProposalItem[]
  feed: FeedEntry[]
  engines: Awaited<ReturnType<typeof getEngineCounts>>
}

function Dashboard({
  finance,
  target,
  counts,
  agents,
  pending,
  feed,
  aiPaused,
  report,
  engines,
  chatConfigured,
  chatTurns,
}: Props) {
  return (
    <PageStack>
      <AutopilotScheduler enabled={!aiPaused} />
      <SupervisionRail
        activeAgents={counts.activeAgents}
        totalAgents={counts.totalAgents}
        pending={counts.pending}
        paused={aiPaused}
      />

      <WealthRow live={finance.live} demo={finance.demo} target={target} />

      <EngineOverview engines={enginesFromCounts(engines)} pending={counts.pending} />

      <AiChat configured={chatConfigured} initialTurns={chatTurns} />

      <TodayReport report={report} />

      <PairColumns>
        <BlockColumn>
          <SectionHead title="Menunggu keputusan Anda" link={{ href: '/approvals', label: `Lihat semua (${counts.pending})` }} />
          {pending.length === 0 ? (
            <Panel>
              <EmptyState
                title="Tidak ada yang menunggu"
                body="Semua usulan sudah diputuskan. Usulan baru muncul di sini begitu agen mengajukan sesuatu yang butuh persetujuan Anda."
              />
            </Panel>
          ) : (
            pending.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} />)
          )}
        </BlockColumn>

        <BlockColumn>
          <SectionHead title="Agen" link={{ href: '/agents', label: 'Kelola agen' }} />
          <Panel>
            <AgentMiniList agents={agents.slice(0, 5)} />
          </Panel>

          <SectionHead title="Aktivitas terakhir" link={{ href: '/activity', label: 'Log lengkap' }} />
          <Panel>
            <ActivityFeed entries={feed.slice(0, 5)} />
          </Panel>
        </BlockColumn>
      </PairColumns>
    </PageStack>
  )
}

const Page = Dashboard as PageWithFrame<Props>
Page.getLayout = (page, props) => (
  <ConsoleFrame
    eyebrow="Ruang kendali"
    title="Selamat datang kembali"
    intent={
      props.aiPaused
        ? 'Operasi AI sedang dijeda. Putuskan usulan yang tertunda lalu lanjutkan operasi.'
        : 'AI menjalankan alur kerja yang disetujui. Setiap keputusan finansial tetap di tangan Anda.'
    }
  >
    {page}
  </ConsoleFrame>
)
export default Page
