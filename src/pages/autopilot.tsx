import type { GetServerSideProps } from 'next'
import { ConsoleFrame } from '@/components/ConsoleFrame'
import { AutopilotPanel, type RunRow } from '@/components/AutopilotPanel'
import { AgentTeam, type AgentItem } from '@/components/AgentList'
import { TASKS } from '@/lib/labels'
import { PageStack } from '@/components/ui'
import { requireOwnerPage } from '@/lib/auth'
import { getAgentRuns, getLastRun } from '@/lib/autopilot'
import { getAgents, getSettings } from '@/lib/data'
import { aiConfigured } from '@/lib/ai'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }

  const [runs, agents, settings, last] = await Promise.all([
    getAgentRuns(30),
    getAgents(),
    getSettings(),
    getLastRun(),
  ])

  return {
    props: {
      aiReady: aiConfigured(),
      paused: settings.aiPaused,
      lastRunAt: last ? last.startedAt.toISOString() : null,
      runs: runs.map(
        (row): RunRow => ({
          id: row.id,
          agentName: row.agentName,
          task: row.task,
          trigger: row.trigger,
          status: row.status,
          summary: row.summary,
          detail: row.detail,
          itemsCreated: row.itemsCreated,
          startedAt: row.startedAt.toISOString(),
          finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
        })
      ),
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
    },
  }
}

type Props = {
  aiReady: boolean
  paused: boolean
  lastRunAt: string | null
  runs: RunRow[]
  agents: AgentItem[]
}

function AutopilotPage({ runs, agents, paused, aiReady }: Props) {
  return (
    <PageStack>
      <AutopilotPanel runs={runs} paused={paused} aiReady={aiReady} />
      <AgentTeam agents={agents} globalPaused={paused} runnableRoles={TASKS.map((task) => task.agentRole)} />
    </PageStack>
  )
}

const Page = AutopilotPage as PageWithFrame<Props>
Page.getLayout = (page) => (
  <ConsoleFrame
    eyebrow="Autopilot"
    title="Operasi otomatis"
    intent="Jalankan putaran kerja agen, jeda satu agen, dan lihat hasil setiap pekerjaan."
  >
    {page}
  </ConsoleFrame>
)
export default Page
