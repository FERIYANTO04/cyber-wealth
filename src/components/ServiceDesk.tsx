import { useMemo, useState } from 'react'
import { Briefcase, Plus, Sparkles } from 'lucide-react'
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
  SearchInput,
  Select,
  Textarea,
} from '@/components/ui'
import { dateTime, money } from '@/lib/format'
import { SERVICE_STATUS } from '@/lib/labels'

export type JobRow = {
  id: string
  code: string
  serviceName: string
  name: string
  email: string
  company: string | null
  market: string
  brief: string
  budgetIdr: number | null
  status: string
  proposalBody: string | null
  proposalAmountIdr: number | null
  proposalSource: string | null
  createdAt: string
}

export type OwnerService = {
  id: string
  slug: string
  name: string
  summary: string
  category: string
  priceFromIdr: number
  deliveryDays: number
  status: string
}

const STATUS_TONE: Record<string, 'neutral' | 'signal' | 'hold' | 'danger'> = {
  new: 'hold',
  proposed: 'hold',
  won: 'signal',
  in_progress: 'signal',
  delivered: 'signal',
  lost: 'danger',
}

export function ServiceDesk({
  services,
  jobs,
  aiReady,
}: {
  services: OwnerService[]
  jobs: JobRow[]
  aiReady: boolean
}) {
  const [rows, setRows] = useState(jobs)
  const [openService, setOpenService] = useState(services.length === 0)
  const [name, setName] = useState('')
  const [summary, setSummary] = useState('')
  const [detail, setDetail] = useState('')
  const [category, setCategory] = useState('website')
  const [priceFrom, setPriceFrom] = useState('')
  const [deliveryDays, setDeliveryDays] = useState('7')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [offerAmount, setOfferAmount] = useState<Record<string, string>>({})
  const [drafting, setDrafting] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((row) =>
      [row.code, row.serviceName, row.name, row.email, row.company ?? '', row.brief].some((value) =>
        value.toLowerCase().includes(needle)
      )
    )
  }, [rows, query])

  async function addService(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          summary,
          detail,
          category,
          priceFromIdr: Number(priceFrom.replace(/[^\d]/g, '')) || 0,
          deliveryDays: Number(deliveryDays) || 7,
          status: 'published',
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Layanan tidak tersimpan.')
        return
      }
      setName('')
      setSummary('')
      setDetail('')
      setPriceFrom('')
      setOpenService(false)
      setNote('Layanan terbit dan sudah tampil di halaman jasa publik.')
    } catch {
      setError('Koneksi terputus. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  async function moveTo(id: string, status: string) {
    setError(null)
    const response = await fetch(`/api/services/requests/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      setError(data.error ?? 'Status tidak tersimpan.')
      return
    }
    setRows((old) => old.map((row) => (row.id === id ? { ...row, status } : row)))
  }

  async function draftOffer(row: JobRow) {
    const raw = offerAmount[row.id] ?? (row.budgetIdr ? String(row.budgetIdr) : '')
    const amount = Number(raw.replace(/[^\d]/g, ''))
    if (!amount) {
      setError('Isi nilai penawaran lebih dulu.')
      return
    }
    setDrafting(row.id)
    setError(null)
    setNote(null)
    try {
      const response = await fetch('/api/services/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: row.id, amountIdr: amount }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Penawaran tidak bisa dibuat.')
        return
      }
      setRows((old) =>
        old.map((item) =>
          item.id === row.id
            ? { ...item, proposalBody: data.text, proposalAmountIdr: amount, proposalSource: `ai:${data.model}`, status: 'proposed' }
            : item
        )
      )
      setExpanded(row.id)
      setNote('Draf penawaran siap. Baca dulu, lalu kirim ke klien lewat email Anda sendiri.')
    } catch {
      setError('Koneksi terputus. Coba lagi.')
    } finally {
      setDrafting(null)
    }
  }

  return (
    <div className="flex flex-col gap-stack">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setOpenService((v) => !v)}>
          <Plus className="size-4" aria-hidden="true" />
          Layanan baru
        </Button>
        <CountNote>{`${services.length} layanan terdaftar · ${rows.length} permintaan masuk`}</CountNote>
      </div>

      {note && <InlineNote tone="signal">{note}</InlineNote>}
      {error && (
        <InlineNote tone="danger">
          <span role="alert">{error}</span>
        </InlineNote>
      )}

      {!aiReady && (
        <Panel>
          <PanelBody>
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-hold" aria-hidden="true" />
              <div>
                <p className="text-[0.8125rem] font-medium text-ink">Penyusun penawaran AI belum aktif</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-quiet">
                  Tambahkan kunci API model AI di halaman Integrasi. Sebelum itu, penawaran tetap bisa Anda tulis
                  sendiri dan kirim manual — tidak ada yang dibuat-buat oleh sistem.
                </p>
              </div>
            </div>
          </PanelBody>
        </Panel>
      )}

      {openService && (
        <Panel>
          <PanelHead label="Layanan baru" />
          <form onSubmit={addService} className="flex flex-col gap-stack px-page py-stack" noValidate>
            <Field label="Nama layanan">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Website profil perusahaan" required />
            </Field>
            <Field label="Ringkasan singkat" hint="Muncul di daftar layanan publik.">
              <Input value={summary} onChange={(e) => setSummary(e.target.value)} required />
            </Field>
            <Field label="Rincian lengkap">
              <Textarea rows={4} value={detail} onChange={(e) => setDetail(e.target.value)} required />
            </Field>
            <div className="grid gap-stack sm:grid-cols-3">
              <Field label="Kategori">
                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="desain">Desain</option>
                  <option value="website">Website</option>
                  <option value="konten">Konten</option>
                  <option value="pemasaran">Pemasaran digital</option>
                </Select>
              </Field>
              <Field label="Harga mulai (Rp)">
                <Input value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} inputMode="numeric" placeholder="3500000" />
              </Field>
              <Field label="Hari kerja">
                <Input value={deliveryDays} onChange={(e) => setDeliveryDays(e.target.value)} inputMode="numeric" />
              </Field>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? 'Menyimpan…' : 'Terbitkan layanan'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpenService(false)}>
                Batal
              </Button>
            </div>
          </form>
        </Panel>
      )}

      <Panel>
        <PanelHead
          label="Permintaan calon klien"
          aside={<CountNote>{`${filtered.length} dari ${rows.length}`}</CountNote>}
        />
        <div className="filter-bar">
          <SearchInput value={query} onChange={setQuery} placeholder="Cari kode, layanan, atau klien…" />
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            title={rows.length === 0 ? 'Belum ada permintaan jasa' : 'Tidak ada yang cocok'}
            body={
              rows.length === 0
                ? 'Permintaan dari halaman jasa publik muncul di sini. Setiap permintaan adalah calon klien, bukan pendapatan.'
                : 'Ubah kata kunci pencarian untuk melihat permintaan lain.'
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((row) => (
              <li key={row.id} className="flex flex-col gap-3 px-page py-stack">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Briefcase className="size-4 shrink-0 text-ink-quiet" aria-hidden="true" />
                      <span className="font-mono text-[0.6875rem] text-ink-quiet">{row.code}</span>
                      <Badge tone={STATUS_TONE[row.status] ?? 'neutral'}>
                        {SERVICE_STATUS.find((s) => s.value === row.status)?.label ?? row.status}
                      </Badge>
                      <Badge>{row.market}</Badge>
                    </div>
                    <p className="mt-1 text-[0.875rem] font-medium text-ink">{row.serviceName}</p>
                    <p className="text-xs text-ink-quiet">
                      {row.name}
                      {row.company ? ` · ${row.company}` : ''} · {row.email}
                    </p>
                    <p className="mt-1 max-w-prose text-xs leading-relaxed text-ink-quiet">{row.brief}</p>
                    <p className="mt-1 font-mono text-[0.625rem] text-ink-quiet">
                      masuk {dateTime(row.createdAt)}
                      {row.budgetIdr ? ` · anggaran ${money(row.budgetIdr)}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Select
                      value={row.status}
                      onChange={(e) => moveTo(row.id, e.target.value)}
                      className="min-h-8 max-w-[11rem] text-[0.8125rem]"
                      aria-label={`Status ${row.code}`}
                    >
                      {SERVICE_STATUS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                    {row.proposalBody && (
                      <Button size="sm" variant="secondary" onClick={() => setExpanded(expanded === row.id ? null : row.id)}>
                        {expanded === row.id ? 'Tutup penawaran' : 'Lihat penawaran'}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                  <div className="w-40">
                    <Field label="Nilai penawaran (Rp)">
                      <Input
                        value={offerAmount[row.id] ?? (row.proposalAmountIdr ? String(row.proposalAmountIdr) : row.budgetIdr ? String(row.budgetIdr) : '')}
                        onChange={(e) => setOfferAmount((old) => ({ ...old, [row.id]: e.target.value }))}
                        inputMode="numeric"
                        placeholder="5000000"
                        className="min-h-8 text-[0.8125rem]"
                      />
                    </Field>
                  </div>
                  <Button size="sm" onClick={() => draftOffer(row)} disabled={drafting === row.id || !aiReady}>
                    <Sparkles className="size-3.5" aria-hidden="true" />
                    {drafting === row.id ? 'Menyusun…' : row.proposalBody ? 'Susun ulang' : 'Susun penawaran AI'}
                  </Button>
                </div>

                {expanded === row.id && row.proposalBody && (
                  <div className="inset-block whitespace-pre-wrap text-[0.8125rem] leading-relaxed text-ink">
                    {row.proposalBody}
                    <p className="mt-2 font-mono text-[0.625rem] text-ink-quiet">
                      {row.proposalSource ?? 'manual'}
                      {row.proposalAmountIdr ? ` · nilai ${money(row.proposalAmountIdr)}` : ''}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
