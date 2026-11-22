import { Badge, CountNote, Panel, PanelHead, SourceTag } from '@/components/ui'
import { relativeTime } from '@/lib/format'

export type AgentItem = {
  id: string
  name: string
  role: string
  mandate: string
  status: string
  dataSource: 'live' | 'demo'
  lastRunAt: string | null
}

export function AgentRow({ agent }: { agent: AgentItem }) {
  return (
    <li className="flex flex-col gap-3 px-page py-stack">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="heading-tight text-[0.9375rem]">{agent.name}</p>
            <Badge tone={agent.status === 'active' ? 'signal' : 'neutral'}>{agent.status === 'active' ? 'Aktif' : 'Dijeda'}</Badge>
            <SourceTag source={agent.dataSource} />
          </div>
          <p className="eyebrow mt-0.5 tracking-[0.1em]">{agent.role}</p>
          <p className="mt-1.5 max-w-prose text-[0.8125rem] leading-relaxed text-ink-quiet">{agent.mandate}</p>
          <p className="mt-1.5 text-xs text-ink-quiet">Terakhir jalan: {relativeTime(agent.lastRunAt)}</p>
        </div>
        <Badge tone="neutral">Diatur AI CEO</Badge>
      </div>
    </li>
  )
}

/** Compact agent summary used on the dashboard. */
export function AgentMiniList({ agents }: { agents: AgentItem[] }) {
  return (
    <ul className="divide-y divide-line">
      {agents.map((agent) => (
        <li key={agent.id} className="flex items-center justify-between gap-3 px-page py-block">
          <div className="min-w-0">
            <p className="item-title">{agent.name}</p>
            <p className="truncate text-xs text-ink-quiet">
              {agent.role} · jalan {relativeTime(agent.lastRunAt)}
            </p>
          </div>
          <Badge tone={agent.status === 'active' ? 'signal' : 'neutral'}>
            {agent.status === 'active' ? 'Aktif' : 'Dijeda'}
          </Badge>
        </li>
      ))}
    </ul>
  )
}

/** Read-only owner view: the AI CEO controls individual agent assignments. */
export function AgentTeam({
  agents,
  globalPaused,
}: {
  agents: AgentItem[]
  globalPaused?: boolean
}) {
  return (
    <Panel>
      <PanelHead label="Agen dan mandatnya" aside={<div className="flex items-center gap-2">{globalPaused && <Badge tone="danger">Operasi dijeda</Badge>}<CountNote>{`${agents.length} agen`}</CountNote></div>} />
      <ul className="divide-y divide-line">
        {agents.map((agent) => (
          <AgentRow
            key={agent.id}
            agent={agent}
          />
        ))}
      </ul>
    </Panel>
  )
}
