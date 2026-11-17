import { Lightbulb, Ruler } from 'lucide-react'
import { Badge, EmptyState, List, Panel, PanelBody, PanelHead, SourceTag } from '@/components/ui'
import { dateTime } from '@/lib/format'

export type SignalRow = {
  id: string
  title: string
  market: string
  evidence: string
  metric: string
  confidence: string
  dataSource: 'live' | 'demo'
  createdAt: string
}

/**
 * Two columns that never mix: what the app measured, and what the model proposed. A
 * suggestion is never dressed up as a measured fact.
 */
export function MarketBoard({ signals }: { signals: SignalRow[] }) {
  const measured = signals.filter((row) => row.confidence === 'measured')
  const proposed = signals.filter((row) => row.confidence !== 'measured')

  return (
    <div className="grid grid-cols-1 gap-stack lg:grid-cols-2">
      <Panel>
        <PanelHead label="Terukur" aside={<Badge tone="signal">{measured.length} sinyal</Badge>} />
        <PanelBody>
          {measured.length === 0 ? (
            <EmptyState
              title="Belum ada sinyal terukur"
              body="Sinyal muncul setelah ada pesanan lunas atau permintaan jasa yang benar-benar tercatat. Agen riset menghitungnya sendiri."
            />
          ) : (
            <List>
              {measured.map((row) => (
                <li key={row.id} className="flex flex-col gap-1 py-block first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Ruler className="size-3.5 shrink-0 text-signal" aria-hidden="true" />
                    <p className="heading-tight text-[0.9375rem]">{row.title}</p>
                    <SourceTag source={row.dataSource} />
                  </div>
                  <p className="text-xs leading-relaxed text-ink-quiet">{row.evidence}</p>
                  <p className="figure-note">
                    {row.metric} · {row.market} · {dateTime(row.createdAt)}
                  </p>
                </li>
              ))}
            </List>
          )}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHead label="Usulan model" aside={<Badge tone="hold">{proposed.length} usulan</Badge>} />
        <PanelBody>
          {proposed.length === 0 ? (
            <EmptyState
              title="Belum ada usulan"
              body="Jalankan agen riset pasar untuk meminta usulan peluang. Usulan selalu diberi label agar tidak tertukar dengan angka nyata."
            />
          ) : (
            <List>
              {proposed.map((row) => (
                <li key={row.id} className="flex flex-col gap-1 py-block first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Lightbulb className="size-3.5 shrink-0 text-hold" aria-hidden="true" />
                    <p className="heading-tight text-[0.9375rem]">{row.title}</p>
                    <Badge tone="hold">Perlu diuji</Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-ink-quiet">{row.evidence}</p>
                  <p className="figure-note">
                    {row.market} · {dateTime(row.createdAt)}
                  </p>
                </li>
              ))}
            </List>
          )}
        </PanelBody>
      </Panel>
    </div>
  )
}
