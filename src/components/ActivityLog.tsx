import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { CountNote, EmptyState, Panel, PanelHead, SearchInput, Segmented, SourceTag } from '@/components/ui'
import { dateTime } from '@/lib/format'
import type { FeedEntry } from '@/components/ActivityFeed'

const ACTOR_LABEL: Record<string, string> = {
  owner: 'Anda',
  agent: 'Agen',
  system: 'Sistem',
}

const ACTOR_OPTIONS = [
  { value: 'all' as const, label: 'Semua' },
  { value: 'owner' as const, label: 'Anda' },
  { value: 'agent' as const, label: 'Agen' },
]

/** Full audit list with its filter bar. */
export function ActivityLog({ entries }: { entries: FeedEntry[] }) {
  const [actor, setActor] = useState<'all' | 'owner' | 'agent'>('all')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return entries.filter((entry) => {
      if (actor !== 'all' && entry.actor !== actor) return false
      if (!needle) return true
      return (
        entry.action.toLowerCase().includes(needle) ||
        entry.detail.toLowerCase().includes(needle) ||
        (entry.agentName ?? '').toLowerCase().includes(needle)
      )
    })
  }, [entries, actor, query])

  return (
    <div className="flex flex-col gap-stack">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Segmented value={actor} options={ACTOR_OPTIONS} onChange={setActor} label="Saring menurut pelaku" />
        <SearchInput value={query} onChange={setQuery} placeholder="Cari di log…" />
        <span className="sm:ml-auto">
          <CountNote>{filtered.length} entri</CountNote>
        </span>
      </div>

      <Panel>
        <PanelHead label="Jejak audit" />
        {filtered.length === 0 ? (
          <EmptyState
            title="Belum ada aktivitas yang cocok"
            body="Setiap keputusan, catatan keuangan, dan tindakan agen tercatat di sini permanen untuk diaudit."
          />
        ) : (
          <ol className="divide-y divide-line">
            {filtered.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-1 px-page py-block sm:flex-row sm:items-baseline sm:gap-4">
                <span className={cn('eyebrow shrink-0 tracking-[0.1em] sm:w-24')}>
                  {ACTOR_LABEL[entry.actor] ?? entry.actor}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[0.8125rem] font-medium text-ink">{entry.action}</span>
                    <SourceTag source={entry.dataSource} />
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-quiet">{entry.detail}</p>
                </div>
                <span className="shrink-0 font-mono text-[0.625rem] text-ink-quiet">{dateTime(entry.createdAt)}</span>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  )
}
