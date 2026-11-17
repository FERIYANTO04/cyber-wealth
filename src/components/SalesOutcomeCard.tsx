import { Panel, PanelBody, PanelHead, SourceTag, Stat } from '@/components/ui'
import { money } from '@/lib/format'

/**
 * What the shop has actually produced: money the payment provider confirmed, orders
 * still waiting, and the book balance. The balance is a record, not a wallet — the
 * cash itself sits with the provider or in the owner's own account.
 */
export function SalesOutcomeCard({
  netCash,
  paid,
  pending,
  revenue,
}: {
  netCash: number
  paid: number
  pending: number
  revenue: number
}) {
  return (
    <Panel>
      <PanelHead label="Hasil penjualan" aside={<SourceTag source="live" />} />
      <PanelBody>
        <div className="grid grid-cols-2 gap-block xl:grid-cols-4">
          <Stat
            label="Pendapatan terkonfirmasi"
            value={money(revenue)}
            context="Hanya dari pembayaran yang dikonfirmasi penyedia."
          />
          <Stat label="Pesanan lunas" value={paid} />
          <Stat label="Menunggu pembayaran" value={pending} />
          <Stat
            label="Saldo buku"
            value={money(Math.max(0, netCash))}
            context="Catatan masuk dikurangi pengeluaran, bukan uang yang disimpan website."
          />
        </div>
      </PanelBody>
    </Panel>
  )
}
