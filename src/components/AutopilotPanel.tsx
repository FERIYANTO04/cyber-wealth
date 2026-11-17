import { useState } from 'react'
import { Play, Sparkles, Timer } from 'lucide-react'
import { Badge, Button, EmptyState, InlineNote, Panel, PanelBody, PanelHead } from '@/components/ui'
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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ label: string; summary: string }[] | null>(null)

  async function run() {
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const response = await fetch('/api/autopilot/run', { method: 'POST' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Autopilot tidak bisa dijalankan.')
        return
      }
      setResult(data.results ?? [])
    } catch {
      setError('Koneksi terputus. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-stack">
      <Panel>
        <PanelHead label="Putaran autopilot" aside={<Timer className="size-4 text-ink-quiet" aria-hidden="true" />} />
        <PanelBody>
          <p className="text-[0.8125rem] leading-relaxed text-ink-quiet">
            Satu putaran dimulai dengan analisis dan arahan AI CEO, lalu menjalankan enam alur agen: riset pasar, penjualan,
            produk, pemasaran, keuangan, dan intelijen bisnis. Setiap tugas meninggalkan catatan di log aktivitas, dan tidak ada dana yang bergerak tanpa
            keputusan Anda.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={run} disabled={busy || paused}>
              <Play className="size-4" aria-hidden="true" />
              {busy ? 'Menjalankan…' : 'Jalankan autopilot sekarang'}
            </Button>
            {paused && <Badge tone="danger">Operasi dijeda</Badge>}
            {!aiReady && (
              <a href="/integrasi" className="link-signal">
                Model AI belum terhubung — buka Integrasi
              </a>
            )}
          </div>
          {error && (
            <InlineNote tone="danger">
              <span role="alert">{error}</span>
            </InlineNote>
          )}
          {result && (
            <ul className="inset-block flex flex-col gap-1.5">
              {result.map((item) => (
                <li key={item.label} className="text-xs leading-relaxed text-ink-quiet">
                  <span className="font-medium text-ink">{item.label}:</span> {item.summary}
                </li>
              ))}
            </ul>
          )}
          {!aiReady && (
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-hold" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-ink-quiet">
                Tanpa kunci model AI, tugas yang membutuhkan tulisan AI dilewati dan mencatat alasannya — tidak ada hasil
                yang dibuat-buat. Riset, penjualan, dan keuangan tetap berjalan dari data nyata di aplikasi.
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
            body="Jalankan autopilot atau minta satu agen bekerja. Setiap pekerjaan tercatat di sini beserta hasilnya."
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
