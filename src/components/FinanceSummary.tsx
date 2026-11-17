import { BlockGrid, Panel, Stat } from '@/components/ui'
import { compactMoney, percent } from '@/lib/format'

export type LedgerTotals = {
  revenue: number
  expenses: number
  netCash: number
  assets: number
  netWorth: number
  rows: number
}

/** The four headline figures above the ledger, live records only. */
export function FinanceSummary({ live, target }: { live: LedgerTotals; target: number }) {
  const share = percent(live.netWorth, target)
  return (
    <BlockGrid columns={4}>
      <Panel className="p-page">
        <Stat
          label="Kekayaan bersih"
          value={compactMoney(live.netWorth)}
          source="live"
          context={`${share.toFixed(share < 1 && share > 0 ? 2 : 0)}% dari tujuan`}
        />
      </Panel>
      <Panel className="p-page">
        <Stat label="Aset" value={compactMoney(live.assets)} source="live" context="nilai yang Anda catat" />
      </Panel>
      <Panel className="p-page">
        <Stat label="Pemasukan" value={compactMoney(live.revenue)} source="live" tone="signal" context="seluruh catatan asli" />
      </Panel>
      <Panel className="p-page">
        <Stat label="Pengeluaran" value={compactMoney(live.expenses)} source="live" context="seluruh catatan asli" />
      </Panel>
    </BlockGrid>
  )
}
