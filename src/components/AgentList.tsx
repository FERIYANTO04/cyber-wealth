import { useState } from 'react'
import { Play } from 'lucide-react'
import { Badge, Button, CountNote, InlineNote, Panel, PanelHead, SourceTag } from '@/components/ui'
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

export function AgentRow({
  agent,
  globalPaused,
  runnable,
}: {
  agent: AgentItem
  globalPaused?: boolean
  /** True when this agent has a task of its own that can be triggered from here. */
  runnable?: boolean
}) {
  const [status, setStatus] = useState(agent.status)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function toggle() {
    setBusy(true)
    setError(null)
    const next = status === 'active' ? 'paused' : 'active'
    try {
      const response = await fetch(`/api/agents/${agent.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Status tidak tersimpan.')
        return
      }
      setStatus(next)
    } catch {
      setError('Koneksi terputus.')
    } finally {
      setBusy(false)
    }
  }

  async function run() {
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const response = await fetch(`/api/agents/${agent.id}/run`, { method: 'POST' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Tugas tidak bisa dijalankan.')
        return
      }
      setResult(data.summary ?? 'Tugas selesai.')
    } catch {
      setError('Koneksi terputus saat menjalankan tugas.')
    } finally {
      setRunning(false)
    }
  }

  const disabled = globalPaused || status !== 'active'

  return (
    <li className="flex flex-col gap-3 px-page py-stack">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="heading-tight text-[0.9375rem]">{agent.name}</p>
            <Badge tone={status === 'active' ? 'signal' : 'neutral'}>{status === 'active' ? 'Aktif' : 'Dijeda'}</Badge>
            {globalPaused && status === 'active' && <Badge tone="danger">Tertahan jeda global</Badge>}
            <SourceTag source={agent.dataSource} />
          </div>
          <p className="eyebrow mt-0.5 tracking-[0.1em]">{agent.role}</p>
          <p className="mt-1.5 max-w-prose text-[0.8125rem] leading-relaxed text-ink-quiet">{agent.mandate}</p>
          <p className="mt-1.5 text-xs text-ink-quiet">Terakhir jalan: {relativeTime(agent.lastRunAt)}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:mt-1">
          {runnable && (
            <Button size="sm" onClick={run} disabled={running || disabled}>
              <Play className="size-3.5" aria-hidden="true" />
              {running ? 'Bekerja…' : 'Jalankan'}
            </Button>
          )}
          <Button variant={status === 'active' ? 'secondary' : 'primary'} size="sm" onClick={toggle} disabled={busy}>
            {busy ? 'Menyimpan…' : status === 'active' ? 'Jeda' : 'Aktifkan'}
          </Button>
        </div>
      </div>
      {result && <InlineNote tone="signal">{result}</InlineNote>}
      {error && (
        <InlineNote tone="danger">
          <span role="alert">{error}</span>
        </InlineNote>
      )}
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

/** The full agent roster with each one's pause control. */
export function AgentTeam({
  agents,
  globalPaused,
  runnableRoles,
}: {
  agents: AgentItem[]
  globalPaused?: boolean
  runnableRoles?: string[]
}) {
  return (
    <Panel>
      <PanelHead label="Agen dan mandatnya" aside={<CountNote>{`${agents.length} agen`}</CountNote>} />
      <ul className="divide-y divide-line">
        {agents.map((agent) => (
          <AgentRow
            key={agent.id}
            agent={agent}
            globalPaused={globalPaused}
            runnable={runnableRoles ? runnableRoles.includes(agent.role) : true}
          />
        ))}
      </ul>
    </Panel>
  )
}
