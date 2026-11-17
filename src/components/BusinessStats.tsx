import { BlockGrid, Panel, Stat } from '@/components/ui'
import { compactMoney, count } from '@/lib/format'

export type BusinessFigures = {
  customers: number
  verifiedCustomers: number
  members: number
  paidOrders: number
  orderRevenueIdr: number
  activeSubscriptions: number
  mrrIdr: number
  pendingPayments: number
  openMessages: number
}

/** The owner's headline numbers — every figure comes from a provider-confirmed row. */
export function BusinessStats({ figures }: { figures: BusinessFigures }) {
  return (
    <div className="flex flex-col gap-block">
      <BlockGrid columns={4}>
        <Panel className="p-page">
          <Stat
            label="Pelanggan"
            value={count(figures.customers)}
            source="live"
            context={`${count(figures.verifiedCustomers)} email terkonfirmasi`}
          />
        </Panel>
        <Panel className="p-page">
          <Stat
            label="Pendapatan produk"
            value={compactMoney(figures.orderRevenueIdr)}
            source="live"
            tone="signal"
            context={`${count(figures.paidOrders)} pesanan lunas`}
          />
        </Panel>
        <Panel className="p-page">
          <Stat
            label="Langganan aktif"
            value={count(figures.activeSubscriptions)}
            source="live"
            context={`MRR ${compactMoney(figures.mrrIdr)}`}
          />
        </Panel>
        <Panel className="p-page">
          <Stat
            label="Menunggu pembayaran"
            value={count(figures.pendingPayments)}
            source="live"
            context="tagihan yang belum dikonfirmasi penyedia"
          />
        </Panel>
        <Panel className="p-page">
          <Stat label="Anggota affiliate" value={count(figures.members)} source="live" context="mitra rujukan terdaftar" />
        </Panel>
        <Panel className="p-page">
          <Stat label="Pesan kontak baru" value={count(figures.openMessages)} source="live" context="belum ditandai terjawab" />
        </Panel>
      </BlockGrid>
      <p className="text-xs leading-relaxed text-ink-quiet">
        Hanya transaksi yang diverifikasi pemilik atau dicatat langsung di aplikasi yang dihitung. Data contoh
        tidak pernah masuk ke angka di atas.
      </p>
    </div>
  )
}
