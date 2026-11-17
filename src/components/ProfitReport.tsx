import { Panel, PanelBody, PanelHead, SourceTag, Stat } from '@/components/ui'
import { compactMoney, money } from '@/lib/format'
import type { MonthlyPoint } from '@/lib/data'

/**
 * Six months of ledger rows as bars. Heights are relative to the largest figure in the
 * window, so a quiet month looks quiet; the numbers underneath are the actual rows.
 */
export function ProfitReport({ points, total }: { points: MonthlyPoint[]; total: MonthlyPoint }) {
  const peak = Math.max(1, ...points.map((point) => Math.max(point.revenue, point.expenses)))
  const height = (value: number) => `${Math.max(value > 0 ? 4 : 0, Math.round((value / peak) * 100))}%`

  return (
    <Panel>
      <PanelHead label="Laporan pendapatan enam bulan" aside={<SourceTag source="live" />} />
      <PanelBody className="gap-stack">
        <div className="grid grid-cols-2 gap-block xl:grid-cols-3">
          <Stat label="Pemasukan" value={money(total.revenue)} tone="signal" context="seluruh catatan asli" />
          <Stat label="Pengeluaran" value={money(total.expenses)} context="termasuk yang Anda setujui" />
          <Stat
            label="Keuntungan"
            value={money(total.profit)}
            tone={total.profit < 0 ? 'danger' : 'default'}
            context="pemasukan dikurangi pengeluaran"
          />
        </div>

        <div className="flex items-end gap-2 overflow-x-auto pb-1" role="img" aria-label="Grafik pemasukan dan pengeluaran per bulan">
          {points.map((point) => (
            <div key={point.month} className="flex min-w-[3.25rem] flex-1 flex-col items-center gap-1.5">
              <div className="flex h-28 w-full items-end justify-center gap-0.5">
                <div
                  className="w-1/2 rounded-t-sm bg-signal/80"
                  style={{ height: height(point.revenue) }}
                  title={`Pemasukan ${point.label}: ${money(point.revenue)}`}
                />
                <div
                  className="w-1/2 rounded-t-sm bg-ink-quiet/30"
                  style={{ height: height(point.expenses) }}
                  title={`Pengeluaran ${point.label}: ${money(point.expenses)}`}
                />
              </div>
              <span className="font-mono text-[0.6875rem] uppercase tracking-wide text-ink-quiet">{point.label}</span>
              <span className="tnum font-mono text-[0.625rem] text-ink">{compactMoney(point.profit)}</span>
            </div>
          ))}
        </div>

        <p className="text-xs leading-relaxed text-ink-quiet">
          Batang gelap adalah pemasukan yang dicatat, batang abu-abu pengeluaran. Angka kecil di bawah tiap bulan
          adalah keuntungan bulan itu. Data contoh tidak pernah dihitung di sini.
        </p>
      </PanelBody>
    </Panel>
  )
}
