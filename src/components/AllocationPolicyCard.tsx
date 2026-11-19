import { Panel, PanelBody, PanelHead, SourceTag, Stat } from '@/components/ui'

export type AllocationPolicy = {
  ownerPercent: number
  operationsPercent: number
  reservePercent: number
  autoPayEnabled: boolean
}

export function AllocationPolicyCard({ policy }: { policy: AllocationPolicy | null }) {
  if (!policy) {
    return (
      <Panel>
        <PanelHead label="Aturan pembagian laba" />
        <PanelBody><p className="text-xs text-ink-quiet">Kebijakan pembagian belum tersedia. Tidak ada alokasi atau pemindahan dana yang dilakukan.</p></PanelBody>
      </Panel>
    )
  }

  return (
    <Panel>
      <PanelHead label="Aturan pembagian laba" aside={<SourceTag source="live" />} />
      <PanelBody>
        <div className="grid grid-cols-2 gap-block md:grid-cols-4">
          <Stat label="Owner" value={`${policy.ownerPercent}%`} context="Bagian laba yang dapat dibagikan" />
          <Stat label="Operasional perusahaan" value={`${policy.operationsPercent}%`} context="Dana untuk menjalankan bisnis" />
          <Stat label="Cadangan perusahaan" value={`${policy.reservePercent}%`} context="Dana penyangga perusahaan" />
          <Stat label="Transfer otomatis" value={policy.autoPayEnabled ? 'Aktif' : 'Nonaktif'} context="Tetap perlu persetujuan Owner untuk memindahkan dana" />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-quiet">
          Persentase ini adalah kebijakan, bukan saldo atau pembagian dari omzet. Perhitungan hanya boleh memakai laba bersih yang benar-benar dapat dibagikan setelah biaya, pajak, refund, dan kewajiban diperhitungkan. Website tidak memindahkan uang secara otomatis.
        </p>
      </PanelBody>
    </Panel>
  )
}
