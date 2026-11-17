import { Repeat } from 'lucide-react'
import { Badge, EmptyState, Panel, PanelBody, PanelHead, SignalLink } from '@/components/ui'
import { money } from '@/lib/format'

export type Retainer = { code: string; name: string; summary: string; priceIdr: number; interval: string }

/** Monthly or yearly retainers a client can subscribe to for this service. */
export function RetainerList({ retainers }: { retainers: Retainer[] }) {
  return (
    <Panel>
      <PanelHead label="Langganan layanan ini" aside={<Badge tone="signal">Berulang</Badge>} />
      {retainers.length === 0 ? (
        <EmptyState
          title="Belum ada paket berulang"
          body="Layanan ini bisa dipesan sekali, atau dijadikan langganan bulanan/tahunan dari halaman langganan di konsol."
        />
      ) : (
        <ul className="divide-y divide-line">
          {retainers.map((retainer) => (
            <li key={retainer.code} className="flex flex-col gap-1 px-page py-block sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[0.8125rem] font-medium text-ink">{retainer.name}</p>
                <p className="text-xs leading-relaxed text-ink-quiet">{retainer.summary}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="figure text-[0.8125rem]">
                  {money(retainer.priceIdr)}
                  <span className="ml-1 font-sans text-[0.625rem] font-normal text-ink-quiet">
                    /{retainer.interval === 'year' ? 'tahun' : 'bulan'}
                  </span>
                </span>
                <SignalLink href={`/langganan/paket/${retainer.code}`}>
                  <span className="inline-flex items-center gap-1">
                    <Repeat className="size-3.5" aria-hidden="true" />
                    Berlangganan
                  </span>
                </SignalLink>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
