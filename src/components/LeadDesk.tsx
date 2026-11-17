import { useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ChevronDown, Mail, Plus, Sparkles } from 'lucide-react'
import {
  Badge,
  Button,
  ChoiceChips,
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
import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'

export type Lead = {
  id: string
  name: string
  email: string
  market: string
  interest: string
  status: string
  notes: string | null
  outreachBody: string | null
  outreachSource: string | null
  lastContactedAt: string | null
  createdAt: string
}

export const STAGES: { value: string; label: string }[] = [
  { value: 'new', label: 'Baru' },
  { value: 'contacted', label: 'Sudah dihubungi' },
  { value: 'qualified', label: 'Tertarik' },
  { value: 'proposal', label: 'Penawaran' },
  { value: 'won', label: 'Sepakat' },
  { value: 'lost', label: 'Tidak lanjut' },
]

const STAGE_TONE: Record<string, 'signal' | 'hold' | 'danger' | 'neutral'> = {
  new: 'hold',
  contacted: 'hold',
  qualified: 'signal',
  proposal: 'signal',
  won: 'signal',
  lost: 'danger',
}

/** The prospect list: stages, drafts the sales agent wrote, and the notes you keep. */
export function LeadDesk({ initial, aiReady }: { initial: Lead[]; aiReady: boolean }) {
  const [leads, setLeads] = useState(initial)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [market, setMarket] = useState<'Indonesia' | 'International'>('Indonesia')
  const [interest, setInterest] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [stage, setStage] = useState('all')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return leads.filter((lead) => {
      if (stage !== 'all' && lead.status !== stage) return false
      if (!needle) return true
      return [lead.name, lead.email, lead.interest, lead.notes ?? ''].some((value) =>
        value.toLowerCase().includes(needle)
      )
    })
  }, [leads, stage, query])

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const lead of leads) map[lead.status] = (map[lead.status] ?? 0) + 1
    return map
  }, [leads])

  async function add(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      const response = await fetch('/api/revenue/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, market, interest }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Calon pelanggan tidak tersimpan.')
        return
      }
      setLeads((old) => [
        {
          id: data.lead.id,
          name: data.lead.name,
          email: data.lead.email,
          market: data.lead.market,
          interest: data.lead.interest,
          status: data.lead.status,
          notes: null,
          outreachBody: null,
          outreachSource: null,
          lastContactedAt: null,
          createdAt: data.lead.createdAt ?? new Date().toISOString(),
        },
        ...old,
      ])
      setName('')
      setEmail('')
      setInterest('')
      setNote('Prospek tersimpan. Jalankan agen penjualan untuk menyiapkan pesan pendekatannya.')
    } catch {
      setError('Koneksi terputus. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  async function update(lead: Lead, patch: { status?: string; notes?: string; markContacted?: boolean }) {
    setError(null)
    const response = await fetch(`/api/leads/${lead.id}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(data.error ?? 'Perubahan tidak tersimpan.')
      return
    }
    setLeads((old) =>
      old.map((row) =>
        row.id === lead.id
          ? {
              ...row,
              status: patch.status ?? row.status,
              notes: patch.notes ?? row.notes,
              lastContactedAt: patch.markContacted ? new Date().toISOString() : row.lastContactedAt,
            }
          : row
      )
    )
  }

  return (
    <div className="flex flex-col gap-stack">
      <Panel>
        <PanelHead label="Tambah prospek" />
        <form onSubmit={add} className="flex flex-col gap-stack px-page py-stack" noValidate>
          <div className="grid gap-stack sm:grid-cols-2">
            <Field label="Nama">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama calon pelanggan" required />
            </Field>
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" required />
            </Field>
            <Field label="Pasar">
              <Select value={market} onChange={(e) => setMarket(e.target.value as typeof market)}>
                <option value="Indonesia">Indonesia</option>
                <option value="International">Internasional</option>
              </Select>
            </Field>
            <Field label="Minat atau kebutuhan">
              <Input value={interest} onChange={(e) => setInterest(e.target.value)} placeholder="Jasa konten dan pemasaran" required />
            </Field>
          </div>
          {note && <InlineNote tone="signal">{note}</InlineNote>}
          {error && (
            <InlineNote tone="danger">
              <span role="alert">{error}</span>
            </InlineNote>
          )}
          <div>
            <Button type="submit" disabled={busy}>
              <Plus className="size-4" aria-hidden="true" />
              {busy ? 'Menyimpan…' : 'Simpan prospek'}
            </Button>
          </div>
        </form>
      </Panel>

      <Panel>
        <PanelHead
          label="Pipeline prospek"
          aside={<CountNote>{`${filtered.length} dari ${leads.length}`}</CountNote>}
        />
        <div className="filter-bar">
          <SearchInput value={query} onChange={setQuery} placeholder="Cari nama, email, atau kebutuhan…" />
          <ChoiceChips
            value={stage}
            onChange={setStage}
            label="Saring tahap"
            options={[
              { value: 'all', label: `Semua (${leads.length})` },
              ...STAGES.map((option) => ({
                value: option.value,
                label: `${option.label}${counts[option.value] ? ` (${counts[option.value]})` : ''}`,
              })),
            ]}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title={leads.length === 0 ? 'Belum ada prospek' : 'Tidak ada yang cocok'}
            body={
              leads.length === 0
                ? 'Tambahkan prospek yang memberi izin untuk dihubungi. Agen penjualan lalu menyiapkan draf pesan pendekatan untuk Anda tinjau dan kirim sendiri.'
                : 'Ubah kata kunci atau saringan tahap untuk melihat prospek lain.'
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((lead) => {
              const open = openId === lead.id
              return (
                <li key={lead.id} className="flex flex-col gap-2 px-page py-stack">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="item-title">{lead.name}</p>
                        <Badge tone={STAGE_TONE[lead.status] ?? 'neutral'}>
                          {STAGES.find((s) => s.value === lead.status)?.label ?? lead.status}
                        </Badge>
                        <Badge>{lead.market}</Badge>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-ink-quiet">
                        {lead.email} · {lead.interest}
                      </p>
                      <p className="mt-0.5 font-mono text-[0.625rem] text-ink-quiet">
                        masuk {relativeTime(lead.createdAt)}
                        {lead.lastContactedAt ? ` · dihubungi ${relativeTime(lead.lastContactedAt)}` : ' · belum dihubungi'}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      <Select
                        value={lead.status}
                        onChange={(e) => update(lead, { status: e.target.value })}
                        className="min-h-8 max-w-[10.5rem] text-[0.8125rem]"
                        aria-label={`Tahap ${lead.name}`}
                      >
                        {STAGES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setOpenId(open ? null : lead.id)}
                        aria-expanded={open}
                      >
                        <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} aria-hidden="true" />
                        {open ? 'Tutup' : 'Detail'}
                      </Button>
                    </div>
                  </div>

                  {open && (
                    <div className="inset-block flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="eyebrow">Draf pesan pendekatan</span>
                          <div className="flex items-center gap-1.5">
                            {lead.outreachSource && (
                              <Badge tone={lead.outreachSource.startsWith('ai:') ? 'signal' : 'neutral'}>
                                {lead.outreachSource.startsWith('ai:') ? 'Draf AI' : 'Draf dasar'}
                              </Badge>
                            )}
                            {lead.outreachBody && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => void navigator.clipboard.writeText(lead.outreachBody ?? '')}
                              >
                                <Mail className="size-3.5" aria-hidden="true" />
                                Salin pesan
                              </Button>
                            )}
                          </div>
                        </div>
                        {lead.outreachBody ? (
                          <p className="message-box whitespace-pre-wrap bg-surface text-ink">
                            {lead.outreachBody}
                          </p>
                        ) : (
                          <p className="text-xs leading-relaxed text-ink-quiet">
                            Belum ada draf. Jalankan agen penjualan dari halaman Autopilot — draf akan muncul di sini
                            untuk Anda tinjau sebelum dikirim.
                          </p>
                        )}
                        {!aiReady && (
                          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-ink-quiet">
                            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-hold" aria-hidden="true" />
                            Model AI belum terhubung. Draf yang disusun akan memakai kalimat dasar, bukan tulisan AI.
                          </p>
                        )}
                      </div>

                      <LeadNotes lead={lead} onSave={(notes) => update(lead, { notes })} />

                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => update(lead, { markContacted: true })}>
                          Tandai sudah dihubungi
                        </Button>
                        <Link href="/approvals" className="link-signal">
                          Buka pusat persetujuan
                        </Link>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </div>
  )
}

function LeadNotes({ lead, onSave }: { lead: Lead; onSave: (notes: string) => void }) {
  const [value, setValue] = useState(lead.notes ?? '')
  const [saved, setSaved] = useState(false)
  const dirty = value !== (lead.notes ?? '')

  return (
    <div className="flex flex-col gap-1.5">
      <Field label="Catatan Anda" hint="Hanya Anda yang melihat ini.">
        <Textarea
          rows={3}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setSaved(false)
          }}
          placeholder="Hasil percakapan, anggaran, waktu tindak lanjut berikutnya…"
        />
      </Field>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={!dirty}
          onClick={() => {
            onSave(value)
            setSaved(true)
          }}
        >
          Simpan catatan
        </Button>
        {saved && !dirty && <InlineNote tone="signal">Catatan tersimpan.</InlineNote>}
      </div>
    </div>
  )
}
