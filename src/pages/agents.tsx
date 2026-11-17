import type { GetServerSideProps } from 'next'
import { ConsoleFrame } from '@/components/ConsoleFrame'
import { AgentTeam, type AgentItem } from '@/components/AgentList'
import { TASKS } from '@/lib/labels'
import { Badge } from '@/components/ui'
import { requireOwnerPage } from '@/lib/auth'
import { getAgents, getSettings } from '@/lib/data'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }
  const [rows, settings] = await Promise.all([getAgents(), getSettings()])
  return {
    props: {
      aiPaused: settings.aiPaused,
      agents: rows.map(
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
    },
  }
}

function AgentsPage({ agents, aiPaused }: { agents: AgentItem[]; aiPaused: boolean }) {
  return <AgentTeam agents={agents} globalPaused={aiPaused} runnableRoles={TASKS.map((task) => task.agentRole)} />
}

const Page = AgentsPage as PageWithFrame<{ agents: AgentItem[]; aiPaused: boolean }>
Page.getLayout = (page, props) => (
  <ConsoleFrame
    eyebrow="Tim AI"
    title="Agen bisnis"
    intent={
      props.aiPaused
        ? 'Operasi global dijeda — semua agen berhenti sampai Anda melanjutkan di ringkasan.'
        : 'Setiap agen punya mandat terbatas. Yang butuh dana, kontrak, atau investasi selalu naik ke meja Anda.'
    }
    actions={<Badge tone="signal">Supervised autonomy</Badge>}
  >
    {page}
  </ConsoleFrame>
)
export default Page
