import Link from 'next/link'
import { Badge, Panel, PanelBody, PanelHead } from '@/components/ui'
import { ServiceBriefForm } from '@/components/ServiceBriefForm'
import { RetainerList, type Retainer } from '@/components/RetainerList'
import { money } from '@/lib/format'

/** One service as a client sees it, with the brief form beneath it. */
export function ServiceDetail({
  service,
  retainers,
}: {
  service: { slug: string; detail: string; priceFromIdr: number; deliveryDays: number }
  retainers: Retainer[]
}) {
  return (
    <div className="flex flex-col gap-stack">
      <Panel>
        <PanelBody>
          <div className="flex flex-wrap items-center gap-2">
            {service.priceFromIdr > 0
              ? <Badge tone="signal">Mulai {money(service.priceFromIdr)}</Badge>
              : <Badge tone="signal">Harga berdasarkan brief</Badge>}
            <Badge>{service.deliveryDays} hari kerja</Badge>
          </div>
          <p className="text-[0.9375rem] leading-relaxed text-ink">{service.detail}</p>
        </PanelBody>
      </Panel>

      <RetainerList retainers={retainers} />

      <Panel>
        <PanelHead label="Standar kualitas & penanganan keluhan" />
        <PanelBody>
          <div className="space-y-3 text-sm leading-relaxed text-ink">
            <p><strong>Hasil sesuai brief.</strong> Tim akan bekerja berdasarkan kebutuhan dan materi yang disepakati bersama sebelum pengerjaan dimulai.</p>
            <p><strong>Perbaikan.</strong> Jika hasil tidak sesuai brief yang telah disetujui atau terdapat kesalahan dari tim, klien dapat meminta perbaikan tanpa biaya tambahan. Paket ini mencakup satu kali revisi; perbaikan atas kesalahan tim tidak dihitung sebagai revisi klien.</p>
            <p><strong>Permintaan di luar brief.</strong> Perubahan kebutuhan atau tambahan pekerjaan akan dijelaskan terlebih dahulu, termasuk biaya dan waktu tambahannya. Pekerjaan tambahan hanya dilakukan setelah klien menyetujuinya.</p>
            <p><strong>Keluhan yang belum selesai.</strong> Jika masalah belum terselesaikan setelah perbaikan, kasus akan dieskalasikan untuk peninjauan. Pengembalian dana dapat diberikan secara proporsional untuk bagian pekerjaan yang tidak diberikan atau gagal dipenuhi, dengan mempertimbangkan pekerjaan yang sudah diselesaikan dan ketentuan hukum yang berlaku.</p>
            <p><strong>Tidak ada janji hasil algoritma.</strong> Kami tidak menjamin konten menjadi viral, jumlah tayangan, pengikut, atau omzet tertentu karena hasil tersebut bergantung pada banyak faktor di luar kendali tim.</p>
            <p>Laporkan kendala melalui <Link href="/kontak" className="font-semibold underline underline-offset-4">halaman kontak</Link> dengan menyertakan nomor pesanan dan bagian hasil yang dipermasalahkan.</p>
          </div>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHead label="Kirim brief" />
        <PanelBody>
          <ServiceBriefForm slug={service.slug} />
        </PanelBody>
      </Panel>
    </div>
  )
}
