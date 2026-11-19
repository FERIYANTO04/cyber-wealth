import { BlockGrid, Panel, Stat } from '@/components/ui'
import { compactMoney } from '@/lib/format'

type Ledger = { revenue: number; expenses: number; netCash: number; assets: number; netWorth: number }

export function CompanyFinanceSummary({ live }: { live: Ledger }) {
  return (
    <BlockGrid columns={4}>
      <Panel className="p-page"><Stat label="Pendapatan perusahaan" value={compactMoney(live.revenue)} source="live" context="catatan dan pembayaran perusahaan" /></Panel>
      <Panel className="p-page"><Stat label="Pengeluaran perusahaan" value={compactMoney(live.expenses)} source="live" context="biaya yang dicatat" /></Panel>
      <Panel className="p-page"><Stat label="Kas buku" value={compactMoney(live.netCash)} source="live" context="pendapatan dikurangi pengeluaran; bukan saldo bank" /></Panel>
      <Panel className="p-page"><Stat label="Aset bersih tercatat" value={compactMoney(live.netWorth)} source="live" context="aset tercatat ditambah kas buku" /></Panel>
    </BlockGrid>
  )
}
