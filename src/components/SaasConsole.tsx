import { useState } from 'react'
import { CalendarCheck, Plus, Power } from 'lucide-react'
import {
  Badge,
  Button,
  CountNote,
  EmptyState,
  Field,
  InlineNote,
  Input,
  Panel,
  PanelBody,
  PanelHead,
  Select,
  SourceTag,
  Stat,
  Textarea,
} from '@/components/ui'
import { compactMoney, dateTime, money } from '@/lib/format'

export type OwnerPlan = {
  id: string
  code: string
  name: string
  summary: string
  features: string
  priceIdr: number
  interval: string
  serviceId: string | null
  status: string
}

export type SubscriberRow = {
  id: string
  token: string
  planName: string
  accountName: string
  accountEmail: string
  amountIdr: number
  status: string
  interval: string
  autoRenew: boolean
  dataSource: 'live' | 'demo'
  paidAt: string | null
  periodEnd: string | null
  createdAt: string
}

const STATUS_TONE: Record<string, 'signal' | 'hold' | 'danger' | 'neutral'> = {
  active: 'signal',
  pending: 'hold',
  expired: 'danger',
  cancelled: 'danger',
}

export function SaasConsole({
  plans,
  subscribers,
  totals,
  services,
}: {
  plans: OwnerPlan[]
  subscribers: SubscriberRow[]
  totals: { active: number; pending: number; mrrIdr: number }
  services: { id: string; name: string }[]
}) {
  const [open, setOpen] = useState(plans.length === 0)
  const [interval, setInterval] = useState('month')
  const [serviceId, setServiceId] = useState('')
  const [rows, setRows] = useState(plans)
  const [name, setName] = useState('')
  const [summary, setSummary] = useState('')
  const [features, setFeatures] = useState('')
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)


  async function create(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      const response = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          summary,
          features,
          priceIdr: Number(price.replace(/[^\d]/g, '')) || 0,
          status: 'published',
          interval,
          serviceId: serviceId || null,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Paket tidak tersimpan.')
        return
      }
      setRows((old) => [
        {
          id: data.code,
          code: data.code,
          name,
          summary,
          features,
          priceIdr: Number(price.replace(/[^\d]/g, '')) || 0,
          status: 'published',
          interval,
          serviceId: serviceId || null,
        },
        ...old,
      ])
      setName('')
      setSummary('')
      setFeatures('')
      setPrice('')
      setServiceId('')
      setOpen(false)
      setNote('Paket terbit dan sudah tampil di halaman langganan publik.')
    } catch {
      setError('Koneksi terputus. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  async function savePrice(row: OwnerPlan) {
    const value = Number(editPrice.replace(/[^\d]/g, ''))
    if (!Number.isFinite(value)) {
      setError('Isi harga dengan angka.')
      return
    }
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      const response = await fetch('/api/plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, priceIdr: value }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Harga paket tidak tersimpan.')
        return
      }
      setRows((old) => old.map((item) => (item.id === row.id ? { ...item, priceIdr: value } : item)))
      setEditId(null)
      setNote(`Harga ${row.name} diperbarui. Pelanggan yang sudah berlangganan tetap membayar harga saat mereka mendaftar.`)
    } catch {
      setError('Koneksi terputus. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  async function toggle(row: OwnerPlan) {
    const next = row.status === 'published' ? 'draft' : 'published'
    const response = await fetch('/api/plans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, status: next }),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      setError(data.error ?? 'Status paket tidak tersimpan.')
      return
    }
    setRows((old) => old.map((item) => (item.id === row.id ? { ...item, status: next } : item)))
  }

  return (
    <div className="flex flex-col gap-stack">
      <Panel>
        <PanelBody>
          <div className="grid grid-cols-3 gap-stack">
            <Stat label="Pelanggan aktif" value={String(totals.active)} context="langganan berbayar" />
            <Stat label="Menunggu bayar" value={String(totals.pending)} context="belum aktif" />
            <Stat label="Nilai per bulan" value={compactMoney(totals.mrrIdr)} context="dari langganan aktif" tone="signal" />
          </div>
          <p className="text-xs leading-relaxed text-ink-quiet">
            Angka ini hanya menghitung langganan yang pembayarannya sudah diverifikasi pemilik setelah dana masuk. Langganan
            yang belum dibayar tidak pernah dihitung sebagai pendapatan.
          </p>
        </PanelBody>
      </Panel>

      {note && <InlineNote tone="signal">{note}</InlineNote>}
      {error && (
        <InlineNote tone="danger">
          <span role="alert">{error}</span>
        </InlineNote>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setOpen((v) => !v)}>
          <Plus className="size-4" aria-hidden="true" />
          Paket baru
        </Button>
      </div>

      {open && (
        <Panel>
          <PanelHead label="Paket langganan baru" />
          <form onSubmit={create} className="flex flex-col gap-stack px-page py-stack" noValidate>
            <Field label="Nama paket">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pro" required />
            </Field>
            <Field label="Ringkasan">
              <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Untuk tim kecil yang butuh otomatisasi" required />
            </Field>
            <Field label="Fitur" hint="Satu fitur per baris.">
              <Textarea rows={4} value={features} onChange={(e) => setFeatures(e.target.value)} required />
            </Field>
            <Field label="Periode tagihan">
              <Select value={interval} onChange={(e) => setInterval(e.target.value)}>
                <option value="month">Bulanan</option>
                <option value="year">Tahunan</option>
              </Select>
            </Field>
            <Field
              label="Untuk layanan digital"
              hint="Kosongkan bila ini paket aplikasi. Bila dipilih, paket ini muncul sebagai langganan di halaman layanan itu."
            >
              <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                <option value="">Paket aplikasi (tanpa layanan)</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={`Harga per ${interval === 'year' ? 'tahun' : 'bulan'} (Rp)`}>
              <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" placeholder="149000" required />
            </Field>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? 'Menyimpan…' : 'Terbitkan paket'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Batal
              </Button>
            </div>
          </form>
        </Panel>
      )}

      <Panel>
        <PanelHead label="Paket saya" aside={<CountNote>{`${rows.length} paket`}</CountNote>} />
        {rows.length === 0 ? (
          <EmptyState
            title="Belum ada paket"
            body="Buat paket pertama, lalu terbitkan agar calon pelanggan bisa berlangganan dari halaman publik."
          />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-col gap-2 px-page py-block sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[0.875rem] font-medium text-ink">{row.name}</p>
                    <Badge tone={row.status === 'published' ? 'signal' : 'neutral'}>
                      {row.status === 'published' ? 'Terbit' : 'Draf'}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-quiet">{row.summary}</p>
                  <p className="mt-1 font-mono text-[0.6875rem] text-ink-quiet">
                    {money(row.priceIdr)} / {row.interval === 'year' ? 'tahun' : 'bulan'}
                  </p>
                  {editId === row.id ? (
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <Field label="Harga baru (Rp)">
                        <Input
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          inputMode="numeric"
                          className="sm:max-w-[10rem]"
                          autoFocus
                        />
                      </Field>
                      <Button size="sm" onClick={() => savePrice(row)} disabled={busy}>
                        {busy ? 'Menyimpan…' : 'Simpan harga'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>
                        Batal
                      </Button>
                    </div>
                  ) : (
                    <InlineNote>
                      Perubahan harga hanya berlaku untuk pendaftaran baru.
                    </InlineNote>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditId(row.id)
                      setEditPrice(String(row.priceIdr))
                    }}
                  >
                    Ubah harga
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => toggle(row)}>
                    <Power className="size-3.5" aria-hidden="true" />
                    {row.status === 'published' ? 'Tarik ke draf' : 'Terbitkan'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <PanelHead label="Pelanggan" aside={<CountNote>{`${subscribers.length} akun`}</CountNote>} />
        {subscribers.length === 0 ? (
          <EmptyState
            title="Belum ada pelanggan"
            body="Setiap pendaftaran langganan muncul di sini beserta status pembayarannya."
          />
        ) : (
          <ul className="divide-y divide-line">
            {subscribers.map((row) => (
              <li key={row.id} className="flex flex-col gap-2 px-page py-block sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="item-title">{row.accountName}</p>
                    <Badge tone={STATUS_TONE[row.status] ?? 'neutral'}>{row.status}</Badge>
                    <SourceTag source={row.dataSource} />
                  </div>
                  <p className="truncate text-xs text-ink-quiet">
                    {row.accountEmail} · {row.planName}
                  </p>
                  <p className="mt-0.5 font-mono text-[0.625rem] text-ink-quiet">
                    {row.paidAt
                      ? `dibayar ${dateTime(row.paidAt)}${row.periodEnd ? ` · sampai ${dateTime(row.periodEnd)}` : ''}`
                      : `didaftarkan ${dateTime(row.createdAt)}`}
                  </p>
                  <p className="mt-0.5 text-[0.625rem] text-ink-quiet">
                    {row.autoRenew ? 'Perpanjangan otomatis dinyalakan pelanggan' : 'Tanpa perpanjangan otomatis'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <CalendarCheck className="size-3.5 text-ink-quiet" aria-hidden="true" />
                  <span className="figure text-[0.8125rem]">{compactMoney(row.amountIdr)}</span>
                  <span className="text-[0.625rem] text-ink-quiet">/{row.interval === 'year' ? 'tahun' : 'bulan'}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
