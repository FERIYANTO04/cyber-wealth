import { SourceTag } from '@/components/ui'
import { relativeTime } from '@/lib/format'

export type FeedEntry = {
  id: string
  actor: string
  agentName: string | null
  action: string
  detail: string
  dataSource: 'live' | 'demo'
  createdAt: string
}

/** Compact recent-activity list for the dashboard. */
export function ActivityFeed({ entries }: { entries: FeedEntry[] }) {
  return (
    <ul className="divide-y divide-line">
      {entries.map((entry) => (
        <li key={entry.id} className="flex flex-col gap-1 px-page py-block">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[0.8125rem] font-medium text-ink">{entry.action}</span>
            <SourceTag source={entry.dataSource} />
            <span className="ml-auto font-mono text-[0.625rem] text-ink-quiet">{relativeTime(entry.createdAt)}</span>
          </div>
          <p className="text-xs leading-relaxed text-ink-quiet">{entry.detail}</p>
        </li>
      ))}
    </ul>
  )
}
