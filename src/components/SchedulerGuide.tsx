import { Badge, CopyValue, InfoRow, Panel, PanelBody, PanelHead } from '@/components/ui'

/**
 * The owner's scheduler card: the address an outside cron service calls so the daily
 * pass runs even on a day nobody opens the console. It never shows the secret itself —
 * only where to read it.
 */
export function SchedulerGuide({ endpoint, configured }: { endpoint: string; configured: boolean }) {
  return (
    <Panel>
      <PanelHead
        label="Penjadwal otomatis"
        aside={<Badge tone={configured ? 'signal' : 'hold'}>{configured ? 'Siap dipanggil' : 'Kunci belum dibuat'}</Badge>}
      />
      <PanelBody>
        <InfoRow
          title="Tanpa ini, putaran harian hanya berjalan saat Anda membuka konsol."
          body="Layanan penjadwal di luar aplikasi memanggil alamat di bawah sekali sehari. Aplikasi sendiri yang memutuskan apakah putaran memang jatuh tempo, jadi memanggilnya lebih sering tidak membuat pekerjaan berjalan dua kali."
        />
        <CopyValue label="Alamat yang dipanggil (POST)" value={endpoint} />
        <ol className="flex flex-col gap-1.5 text-xs leading-relaxed text-ink-quiet">
          <li>1. Buka layanan penjadwal Anda (misalnya cron-job.org atau penjadwal bawaan hosting).</li>
          <li>2. Buat satu pekerjaan harian yang mengirim POST ke alamat di atas.</li>
          <li>
            3. Tambahkan header <span className="font-mono text-[0.6875rem] text-ink">Authorization</span> berisi
            Bearer diikuti nilai kunci penjadwal — kunci itu ada di pengaturan aplikasi Anda, jangan ditempel di sini.
          </li>
          <li>4. Setelah aktif, buka halaman Autopilot besok dan pastikan ada catatan putaran bertanda jadwal.</li>
        </ol>
        {!configured && (
          <p className="list-lead">
            Kunci penjadwal belum ada di pengaturan aplikasi. Isi dulu, publikasikan ulang, lalu pekerjaan terjadwal
            bisa dipanggil.
          </p>
        )}
      </PanelBody>
    </Panel>
  )
}
