import { useMemo, useState } from 'react'
import { AlertTriangle, Check, PlayCircle, X } from 'lucide-react'
import {
  Badge,
  Button,
  ChoiceChips,
  CountNote,
  EmptyState,
  Field,
  InlineNote,
  Input,
  Notice,
  Panel,
  PanelBody,
  PanelHead,
  Segmented,
  SourceTag,
  Stat,
} from '@/components/ui'
import { compactMoney, dateTime, money } from '@/lib/format'

export type BillingFigures = {
  active: number
  mrrIdr: number
  annualisedIdr: number
  newThisMonth: number
  churnedThisMonth: number
  churnRate: number
  overdue: number
  dueSoon: number
  autoRenewShare: number
  demoActive: number
  collectedByMonth: { month: string; amountIdr: number; count: number }[]
}

export type CycleItem = {
  id: string
  subscriber: string
  planName: string
  amountIdr: number
  dueAt: string
  periodEnd: string
  status: string
  invoiceUrl: string | null
  note: string | null
  dataSource: 'live' | 'demo'
}

export type RequestItem = {
  id: string
  kind: 'cancel' | 'refund'
  subscriber: string
  planName: string
  reason: string
  amountIdr: number | null
  createdAt: string
  status: string
}

const CYCLE_LABEL: Record<string, string> = {
  paid: 'Lunas',
  invoiced: 'Menunggu bayar',
  scheduled: 'Terjadwal',
  failed: 'Gagal',
  skipped: 'Dilewati',
}

const CYCLE_TONE: Record<string, 'signal' | 'hold' | 'danger' | 'neutral'> = {
  paid: 'signal',
  invoiced: 'hold',
  scheduled: 'neutral',
  failed: 'danger',
  skipped: 'neutral',
}

const CYCLE_FILTERS = [
  { value: 'all', label: 'Semua' },
  { value: 'scheduled', label: 'Terjadwal' },
  { value: 'invoiced', label: 'Menunggu bayar' },
  { value: 'paid', label: 'Lunas' },
  { value: 'failed', label: 'Gagal' },
]

/** Recurring revenue, the open billing periods, and the requests waiting on the owner. */
export function BillingConsole({
  figures,
  cycles,
  requests,
  paymentReady,
  emailReady,
}: {
  figures: BillingFigures
  cycles: CycleItem[]
  requests: RequestItem[]
  paymentReady: boolean
  emailReady: boolean
}) {
  const [filter, setFilter] = useState('all')
  const [tab, setTab] = useState<'cycles' | 'requests'>('cycles')
  const [running, setRunning] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deciding, setDeciding] = useState<string | null>(null)
  const [queue, setQueue] = useState(requests)
  const [reasonNote, setReasonNote] = useState<Record<string, string>>({})

  const list = useMemo(
    () => (filter === 'all' ? cycles : cycles.filter((cycle) => cycle.status === filter)),
    [cycles, filter]
  )

  async function runPass() {
    setRunning(true)
    setNote(null)
    setError(null)
    try {
      const response = await fetch('/api/billing/run', { method: 'POST' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Putaran penagihan gagal dijalankan.')
        return
      }
      setNote(
        `Putaran selesai: ${data.remindersSent} pengingat, ${data.invoicesCreated} tagihan baru, ${data.scheduled} periode dijadwalkan, ${data.expired} langganan berakhir.`
      )
      if (Array.isArray(data.notes) && data.notes.length > 0) setNote((old) => `${old} ${data.notes.join(' ')}`)
    } catch {
      setError('Koneksi terputus. Coba lagi.')
    } finally {
      setRunning(false)
    }
  }

  async function decide(item: RequestItem, approved: boolean) {
    setDeciding(item.id)
    setError(null)
    try {
      const response = await fetch('/api/billing/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: item.id, approved, note: reasonNote[item.id] ?? '' }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Keputusan tidak tersimpan.')
        return
      }
      setQueue((old) => old.filter((row) => row.id !== item.id))
      setNote(data.warning ?? (approved ? 'Permintaan disetujui.' : 'Permintaan ditolak.'))
    } catch {
      setError('Koneksi terputus. Coba lagi.')
    } finally {
      setDeciding(null)
    }
  }

  return (
    <div className="flex flex-col gap-stack">
      {!paymentReady && (
        <Notice tone="hold" icon={<AlertTriangle className="warn-icon" aria-hidden="true" />}>
          <p className="note-text">
            Pembayaran menggunakan transfer bank manual. Perpanjangan harus dibayar ulang oleh pelanggan dan refund dilakukan melalui transfer bank terpisah.
          </p>
        </Notice>
      )}
      {!emailReady && (
        <Notice tone="hold" icon={<AlertTriangle className="warn-icon" aria-hidden="true" />}>
          <p className="note-text">
            Penyedia email belum terhubung. Pengingat dan konfirmasi tetap tercatat di kotak keluar, tetapi belum
            benar-benar terkirim ke pelanggan.
          </p>
        </Notice>
      )}

      <Panel>
        <PanelBody>
          <div className="grid grid-cols-2 gap-stack sm:grid-cols-4">
            <Stat label="MRR" value={compactMoney(figures.mrrIdr)} context="pendapatan berulang per bulan" tone="signal" />
            <Stat label="Pelanggan aktif" value={String(figures.active)} context={`${figures.autoRenewShare}% dengan perpanjangan otomatis`} />
            <Stat label="Berhenti bulan ini" value={String(figures.churnedThisMonth)} context={`churn ${figures.churnRate}%`} tone={figures.churnedThisMonth > 0 ? 'danger' : 'default'} />
            <Stat label="Baru bulan ini" value={String(figures.newThisMonth)} context={`${figures.dueSoon} tagihan dalam 14 hari`} />
          </div>
          <p className="list-lead">
            MRR hanya menghitung langganan yang pembayarannya sudah dikonfirmasi penyedia. Paket tahunan dibagi dua
            belas supaya angkanya setara bulanan. Tidak ada pendapatan yang diperkirakan di sini.
            {figures.demoActive > 0 &&
              ` Ada ${figures.demoActive} pelanggan contoh yang tidak ikut dihitung — barisnya bertanda Demo di daftar di bawah.`}
          </p>
        </PanelBody>
      </Panel>

      {note && <InlineNote tone="signal">{note}</InlineNote>}
      {error && (
        <InlineNote tone="danger">
          <span role="alert">{error}</span>
        </InlineNote>
      )}

      <Panel>
        <PanelHead
          label="Tagihan yang sudah masuk"
          aside={<CountNote>{`${figures.collectedByMonth.reduce((sum, row) => sum + row.count, 0)} pembayaran`}</CountNote>}
        />
        {figures.collectedByMonth.length === 0 ? (
          <EmptyState
            title="Belum ada pembayaran berulang"
            body="Begitu pelanggan memperpanjang dan pemilik memverifikasi dana masuknya, pendapatan per bulan muncul di sini."
          />
        ) : (
          <ul className="divide-y divide-line">
            {figures.collectedByMonth.map((row) => (
              <li key={row.month} className="flex items-center justify-between gap-2 px-page py-block">
                <span className="text-[0.8125rem] text-ink">{row.month}</span>
                <span className="flex items-center gap-3">
                  <CountNote>{`${row.count} pembayaran`}</CountNote>
                  <span className="figure text-[0.8125rem]">{money(row.amountIdr)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Segmented
        value={tab}
        onChange={setTab}
        label="Tampilan penagihan"
        options={[
          { value: 'cycles', label: `Periode (${cycles.length})` },
          { value: 'requests', label: `Permintaan (${queue.length})` },
        ]}
      />

      {tab === 'cycles' ? (
        <Panel>
          <PanelHead
            label="Periode tagihan"
            aside={
              <Button size="sm" variant="secondary" onClick={runPass} disabled={running}>
                <PlayCircle className="size-3.5" aria-hidden="true" />
                {running ? 'Menjalankan…' : 'Jalankan penagihan'}
              </Button>
            }
          />
          <div className="filter-bar">
            <ChoiceChips value={filter} options={CYCLE_FILTERS} onChange={setFilter} label="Saring status periode" />
          </div>
          {list.length === 0 ? (
            <EmptyState
              title="Tidak ada periode di sini"
              body="Periode baru muncul setelah ada langganan aktif yang pembayarannya sudah dikonfirmasi."
            />
          ) : (
            <ul className="divide-y divide-line">
              {list.map((cycle) => (
                <li key={cycle.id} className="row-line">
                  <div className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <p className="item-title">{cycle.subscriber}</p>
                      <SourceTag source={cycle.dataSource} />
                    </span>
                    <p className="text-xs text-ink-quiet">
                      {cycle.planName} · jatuh tempo {dateTime(cycle.dueAt)}
                    </p>
                    {cycle.note && <p className="mt-0.5 text-[0.6875rem] leading-relaxed text-ink-quiet">{cycle.note}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="figure text-[0.8125rem]">{money(cycle.amountIdr)}</span>
                    <Badge tone={CYCLE_TONE[cycle.status] ?? 'neutral'}>{CYCLE_LABEL[cycle.status] ?? cycle.status}</Badge>
                    {cycle.invoiceUrl && cycle.status !== 'paid' && (
                      <a href={cycle.invoiceUrl} className="link-signal">
                        Tagihan
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ) : (
        <Panel>
          <PanelHead label="Pembatalan dan refund" aside={<CountNote>{`${queue.length} menunggu`}</CountNote>} />
          {queue.length === 0 ? (
            <EmptyState
              title="Tidak ada permintaan menunggu"
              body="Permintaan pembatalan atau refund dari pelanggan muncul di sini. Tidak ada uang yang bergerak sebelum Anda memutuskan."
            />
          ) : (
            <ul className="divide-y divide-line">
              {queue.map((item) => (
                <li key={item.id} className="flex flex-col gap-2 px-page py-stack">
                  <div className="action-row">
                    <Badge tone={item.kind === 'refund' ? 'danger' : 'hold'}>
                      {item.kind === 'refund' ? 'Refund' : 'Pembatalan'}
                    </Badge>
                    <span className="item-title">{item.subscriber}</span>
                    <CountNote>{item.planName}</CountNote>
                    {item.amountIdr !== null && <span className="figure text-[0.8125rem]">{money(item.amountIdr)}</span>}
                  </div>
                  <p className="list-lead">{item.reason}</p>
                  <p className="text-[0.6875rem] text-ink-quiet">Diminta {dateTime(item.createdAt)}</p>
                  <Field label="Catatan untuk pelanggan" hint="Opsional. Ikut dikirim bersama keputusan Anda.">
                    <Input
                      value={reasonNote[item.id] ?? ''}
                      onChange={(e) => setReasonNote((old) => ({ ...old, [item.id]: e.target.value }))}
                    />
                  </Field>
                  <div className="action-row">
                    <Button size="sm" onClick={() => decide(item, true)} disabled={deciding === item.id}>
                      <Check className="size-3.5" aria-hidden="true" />
                      Setujui
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => decide(item, false)} disabled={deciding === item.id}>
                      <X className="size-3.5" aria-hidden="true" />
                      Tolak
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </div>
  )
}
