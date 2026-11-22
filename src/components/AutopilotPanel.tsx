import { Sparkles, Timer } from 'lucide-react'
import { Badge, EmptyState, Panel, PanelBody, PanelHead } from '@/components/ui'
import { dateTime, relativeTime } from '@/lib/format'

export type RunRow = {
  id: string
  agentName: string
  task: string
  trigger: string
  status: string
  summary: string | null
  detail: string | null
  itemsCreated: number
  startedAt: string
  finishedAt: string | null
}

const TASK_LABEL: Record<string, string> = {
  ceo: 'Strategi harian',
  research: 'Riset pasar',
  product: 'Produk digital',
  marketing: 'Pemasaran',
  sales: 'Penjualan',
  finance: 'Keuangan',
  intelligence: 'Intelijen bisnis',
}

const STATUS_TONE: Record<string, 'signal' | 'hold' | 'danger' | 'neutral'> = {
  ok: 'signal',
  running: 'hold',
  skipped: 'neutral',
  failed: 'danger',
}

export function AutopilotPanel({
  runs,
  paused,
  aiReady,
  dueIn: _dueIn,
}: {
  runs: RunRow[]
  paused: boolean
  aiReady: boolean
  dueIn?: string
}) {
  return (
    <div className="flex flex-col gap-stack">
      <Panel>
        <PanelHead label="Putaran autopilot" aside={<Timer className="size-4 text-ink-quiet" aria-hidden="true" />} />
        <PanelBody>
          <p className="text-[0.8125rem] leading-relaxed text-ink-quiet">
            AI CEO menjalankan evaluasi terjadwal, memilih agen yang relevan dari seluruh tim, membagi pekerjaan, lalu mengevaluasi hasilnya. Anda tidak perlu menjalankan agen satu per satu. Setiap tugas meninggalkan catatan di log aktivitas. Pengeluaran, kontrak, dan komitmen eksternal tetap memerlukan persetujuan Owner.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {paused ? <Badge tone="danger">Operasi dijeda</Badge> : <Badge tone="signal">Menunggu / berjalan sesuai jadwal otomatis</Badge>}
            {aiReady ? <Badge tone="signal">Model AI terhubung</Badge> : <a href="/integrasi" className="link-signal">Model AI belum terhubung — buka Integrasi</a>}
          </div>
          {!aiReady && (
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-hold" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-ink-quiet">
                Model AI belum siap. CEO tidak akan mengarang keputusan atau hasil riset; tugas yang memerlukan model akan menunggu integrasi aktif.
              </p>
            </div>
          )}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHead label="Riwayat pekerjaan agen" aside={<Badge>{`${runs.length} catatan`}</Badge>} />
        {runs.length === 0 ? (
          <EmptyState
            title="Belum ada pekerjaan agen"
            body="Belum ada putaran otomatis yang tercatat. Setelah jadwal berjalan, keputusan CEO dan hasil pekerjaan tim akan muncul di sini."
          />
        ) : (
          <ul className="divide-y divide-line">
            {runs.map((row) => (
              <li key={row.id} className="flex flex-col gap-1 px-page py-block">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.8125rem] font-medium text-ink">{row.agentName}</span>
                  <Badge tone={STATUS_TONE[row.status] ?? 'neutral'}>{row.status}</Badge>
                  <Badge>{TASK_LABEL[row.task] ?? row.task}</Badge>
                  {row.trigger === 'schedule' && <Badge tone="hold">Terjadwal</Badge>}
                  <span className="ml-auto font-mono text-[0.625rem] text-ink-quiet">
                    {relativeTime(row.startedAt)}
                  </span>
                </div>
                {row.summary && <p className="text-xs leading-relaxed text-ink">{row.summary}</p>}
                {row.detail && <p className="text-xs leading-relaxed text-ink-quiet">{row.detail}</p>}
                <p className="font-mono text-[0.625rem] text-ink-quiet">
                  mulai {dateTime(row.startedAt)}
                  {row.itemsCreated > 0 ? ` · ${row.itemsCreated} item dibuat` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
