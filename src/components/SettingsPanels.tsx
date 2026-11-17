import { LogOut } from 'lucide-react'
import { AutonomySwitch } from '@/components/AutonomySwitch'
import { Badge, Button, InfoRow, Panel, PanelBody, PanelHead } from '@/components/ui'
import { compactMoney } from '@/lib/format'

export function SettingsPanels({
  email,
  aiPaused,
  target,
}: {
  email: string
  aiPaused: boolean
  target: number
}) {
  return (
    <div className="flex flex-col gap-stack">
      <Panel>
        <PanelHead label="Operasi AI" />
        <PanelBody>
          <InfoRow
            title={aiPaused ? 'Operasi dijeda' : 'Operasi berjalan'}
            body="Jeda menghentikan semua agen seketika. Alur kerja yang sedang berjalan sampai di titik aman, dan tidak ada dana yang berpindah tanpa persetujuan Anda dalam kondisi apa pun."
            aside={<AutonomySwitch paused={aiPaused} />}
          />
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHead label="Mode operasi" />
        <PanelBody>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="signal">Supervised autonomy</Badge>
            <span className="text-xs text-ink-quiet">satu-satunya mode yang aktif</span>
          </div>
          <ul className="flex flex-col gap-1.5 text-[0.8125rem] leading-relaxed text-ink-quiet">
            <li>· AI menjalankan alur kerja yang sudah Anda setujui secara mandiri.</li>
            <li>
              · Membelanjakan dana, memindahkan uang, menandatangani kontrak, dan berinvestasi selalu butuh
              persetujuan.
            </li>
            <li>· Setiap tindakan tercatat di log aktivitas.</li>
          </ul>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHead label="Tujuan jangka panjang" />
        <PanelBody>
          <p className="figure text-lg">{compactMoney(target)}</p>
          <p className="text-xs leading-relaxed text-ink-quiet">
            Kekayaan bersih pribadi. Ini sasaran jangka panjang, bukan jaminan hasil — angka sebenarnya hanya dihitung
            dari catatan keuangan Anda sendiri.
          </p>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHead label="Akun pemilik" aside={<Badge>Akses tunggal</Badge>} />
        <PanelBody>
          <InfoRow
            title={email}
            body="Hanya akun ini yang bisa membuka konsol. Tidak ada pendaftaran terbuka."
            aside={
              <form action="/api/auth/logout" method="post">
                <Button type="submit" variant="secondary" size="sm">
                  <LogOut className="size-4" aria-hidden="true" />
                  Keluar dari konsol
                </Button>
              </form>
            }
          />
        </PanelBody>
      </Panel>
    </div>
  )
}
