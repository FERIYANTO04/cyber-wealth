import { useState } from 'react'
import { Copy, Link2, Plus, TrendingUp } from 'lucide-react'
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
  Select,
  Stat,
} from '@/components/ui'
import { compactMoney, dateTime, money } from '@/lib/format'

export type ProgramRow = {
  id: string
  name: string
  network: string
  signupUrl: string
  commissionNote: string
  commissionRate: string | null
  market: string
  status: string
}

export type LinkRow = {
  id: string
  slug: string
  label: string
  destinationUrl: string
  channel: string
  clicks: number
  programName: string | null
  network: string | null
}

export type CommissionRow = {
  id: string
  amountIdr: number
  periodLabel: string
  status: string
  note: string | null
  createdAt: string
  programName: string | null
}

export function AffiliateDesk({
  programs,
  links,
  commissions,
  totals,
  origin,
}: {
  programs: ProgramRow[]
  links: LinkRow[]
  commissions: CommissionRow[]
  totals: { clicks: number; recordedIdr: number; paidOutIdr: number }
  origin: string
}) {
  const [tab, setTab] = useState<'program' | 'link' | 'commission'>('program')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const [pName, setPName] = useState('')
  const [pNetwork, setPNetwork] = useState('')
  const [pUrl, setPUrl] = useState('')
  const [pCommission, setPCommission] = useState('')
  const [pRate, setPRate] = useState('')
  const [pMarket, setPMarket] = useState<'Indonesia' | 'International'>('International')

  const [lProgram, setLProgram] = useState(programs[0]?.id ?? '')
  const [lLabel, setLLabel] = useState('')
  const [lUrl, setLUrl] = useState('')
  const [lChannel, setLChannel] = useState('konten')

  const [cProgram, setCProgram] = useState(programs[0]?.id ?? '')
  const [cAmount, setCAmount] = useState('')
  const [cPeriod, setCPeriod] = useState('')
  const [cNote, setCNote] = useState('')

  async function send(body: Record<string, unknown>, success: string) {
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      const response = await fetch('/api/affiliate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Data tidak tersimpan.')
        return
      }
      setNote(success)
    } catch {
      setError('Koneksi terputus. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-stack">
      <Panel>
        <PanelBody>
          <div className="grid grid-cols-2 gap-stack sm:grid-cols-4">
            <Stat label="Klik tercatat" value={String(totals.clicks)} context="oleh aplikasi ini" />
            <Stat label="Komisi dilaporkan" value={compactMoney(totals.recordedIdr)} context="dari laporan jaringan" />
            <Stat label="Sudah dibayar" value={compactMoney(totals.paidOutIdr)} context="diterima ke rekening" tone="signal" />
            <Stat label="Program" value={String(programs.length)} context={`${links.length} tautan aktif`} />
          </div>
          <p className="text-xs leading-relaxed text-ink-quiet">
            Klik dihitung langsung oleh aplikasi saat tautan dibuka. Konversi dan komisi hanya dicatat dari laporan
            resmi jaringan affiliate — tidak ada angka yang ditebak di sini.
          </p>
        </PanelBody>
      </Panel>

      {note && <InlineNote tone="signal">{note}</InlineNote>}
      {error && (
        <InlineNote tone="danger">
          <span role="alert">{error}</span>
        </InlineNote>
      )}

      <ChoiceChips
        value={tab}
        onChange={setTab}
        label="Bagian affiliate"
        options={[
          { value: 'program', label: 'Program' },
          { value: 'link', label: 'Tautan' },
          { value: 'commission', label: 'Komisi' },
        ]}
      />

      {tab === 'program' && (
        <>
          <Panel>
            <PanelHead label="Program affiliate yang sah" />
            <form
              className="flex flex-col gap-stack px-page py-stack"
              onSubmit={(event) => {
                event.preventDefault()
                void send(
                  {
                    kind: 'program',
                    name: pName,
                    network: pNetwork,
                    signupUrl: pUrl,
                    commissionNote: pCommission,
                    commissionRate: pRate || undefined,
                    market: pMarket,
                  },
                  'Program tersimpan. Daftar lewat tautan pendaftarannya, lalu buat tautan affiliate.'
                )
              }}
            >
              <div className="grid gap-stack sm:grid-cols-2">
                <Field label="Nama program">
                  <Input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Hostinger Affiliate" required />
                </Field>
                <Field label="Jaringan atau penyelenggara">
                  <Input value={pNetwork} onChange={(e) => setPNetwork(e.target.value)} placeholder="Impact.com" required />
                </Field>
              </div>
              <Field label="Tautan pendaftaran resmi" hint="Halaman resmi tempat Anda mendaftar sebagai affiliate.">
                <Input
                  type="url"
                  value={pUrl}
                  onChange={(e) => setPUrl(e.target.value)}
                  placeholder="https://…"
                  required
                />
              </Field>
              <Field label="Skema komisi">
                <Input
                  value={pCommission}
                  onChange={(e) => setPCommission(e.target.value)}
                  placeholder="30% per penjualan pertama, cookie 30 hari"
                  required
                />
              </Field>
              <div className="grid gap-stack sm:grid-cols-2">
                <Field label="Angka komisi (opsional)">
                  <Input value={pRate} onChange={(e) => setPRate(e.target.value)} placeholder="30%" />
                </Field>
                <Field label="Pasar">
                  <Select value={pMarket} onChange={(e) => setPMarket(e.target.value as typeof pMarket)}>
                    <option value="Indonesia">Indonesia</option>
                    <option value="International">Internasional</option>
                  </Select>
                </Field>
              </div>
              <Button type="submit" disabled={busy || !pName || !pNetwork || !pUrl || !pCommission}>
                <Plus className="size-4" aria-hidden="true" />
                {busy ? 'Menyimpan…' : 'Simpan program'}
              </Button>
            </form>
          </Panel>

          <Panel>
            <PanelHead label="Program terdaftar" aside={<CountNote>{`${programs.length} program`}</CountNote>} />
            {programs.length === 0 ? (
              <EmptyState
                title="Belum ada program affiliate"
                body="Tambahkan program yang punya program affiliate resmi dan terbuka. Hindari jaringan yang menjanjikan penghasilan tetap."
              />
            ) : (
              <ul className="divide-y divide-line">
                {programs.map((program) => (
                  <li key={program.id} className="flex flex-col gap-1 px-page py-block">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[0.875rem] font-medium text-ink">{program.name}</p>
                      <Badge>{program.network}</Badge>
                      <Badge tone="neutral">{program.market}</Badge>
                      {program.commissionRate && <Badge tone="signal">{program.commissionRate}</Badge>}
                    </div>
                    <p className="text-xs leading-relaxed text-ink-quiet">{program.commissionNote}</p>
                    <a
                      href={program.signupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-signal w-fit"
                    >
                      Buka halaman pendaftaran
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}

      {tab === 'link' && (
        <>
          <Panel>
            <PanelHead label="Tautan pelacak baru" />
            <form
              className="flex flex-col gap-stack px-page py-stack"
              onSubmit={(event) => {
                event.preventDefault()
                void send(
                  { kind: 'link', programId: lProgram, label: lLabel, destinationUrl: lUrl, channel: lChannel },
                  'Tautan dibuat. Bagikan alamat /go/ di profil, artikel, atau konten Anda.'
                )
              }}
            >
              {programs.length === 0 ? (
                <p className="text-[0.8125rem] text-ink-quiet">Tambahkan program affiliate lebih dulu di tab Program.</p>
              ) : (
                <>
                  <div className="grid gap-stack sm:grid-cols-2">
                    <Field label="Program">
                      <Select value={lProgram} onChange={(e) => setLProgram(e.target.value)}>
                        {programs.map((program) => (
                          <option key={program.id} value={program.id}>
                            {program.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Nama tautan">
                      <Input value={lLabel} onChange={(e) => setLLabel(e.target.value)} placeholder="Review hosting di blog" required />
                    </Field>
                  </div>
                  <Field label="Tautan affiliate asli" hint="Tempel tautan yang diberikan jaringan setelah Anda disetujui.">
                    <Input type="url" value={lUrl} onChange={(e) => setLUrl(e.target.value)} placeholder="https://…" required />
                  </Field>
                  <Field label="Kanal">
                    <Input value={lChannel} onChange={(e) => setLChannel(e.target.value)} placeholder="blog, YouTube, Instagram" />
                  </Field>
                  <Button type="submit" disabled={busy || !lLabel || !lUrl}>
                    <Link2 className="size-4" aria-hidden="true" />
                    {busy ? 'Menyimpan…' : 'Buat tautan'}
                  </Button>
                </>
              )}
            </form>
          </Panel>

          <Panel>
            <PanelHead label="Tautan aktif" aside={<CountNote>{`${links.length} tautan`}</CountNote>} />
            {links.length === 0 ? (
              <EmptyState
                title="Belum ada tautan"
                body="Buat tautan pelacak untuk setiap tempat Anda mempromosikan produk, supaya klik terbaca per kanal."
              />
            ) : (
              <ul className="divide-y divide-line">
                {links.map((link) => {
                  const url = `${origin}/go/${link.slug}`
                  return (
                    <li key={link.id} className="flex flex-col gap-2 px-page py-block sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="item-title">{link.label}</p>
                        <p className="truncate text-xs text-ink-quiet">
                          {link.programName ?? 'program'} · {link.channel}
                        </p>
                        <p className="mt-1 truncate font-mono text-[0.6875rem] text-signal">{url}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge tone="neutral">{link.clicks} klik</Badge>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void navigator.clipboard.writeText(url)}
                        >
                          <Copy className="size-3.5" aria-hidden="true" />
                          Salin
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        </>
      )}

      {tab === 'commission' && (
        <>
          <Panel>
            <PanelHead label="Catat komisi dari laporan resmi" />
            <form
              className="flex flex-col gap-stack px-page py-stack"
              onSubmit={(event) => {
                event.preventDefault()
                void send(
                  {
                    kind: 'commission',
                    programId: cProgram,
                    amountIdr: Number(cAmount.replace(/[^\d]/g, '')),
                    periodLabel: cPeriod,
                    note: cNote || undefined,
                  },
                  'Komisi dicatat. Pendapatan ini belum masuk rekening sampai jaringan mentransfernya.'
                )
              }}
            >
              {programs.length === 0 ? (
                <p className="text-[0.8125rem] text-ink-quiet">Tambahkan program affiliate lebih dulu di tab Program.</p>
              ) : (
                <>
                  <div className="grid gap-stack sm:grid-cols-2">
                    <Field label="Program">
                      <Select value={cProgram} onChange={(e) => setCProgram(e.target.value)}>
                        {programs.map((program) => (
                          <option key={program.id} value={program.id}>
                            {program.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Periode laporan">
                      <Input value={cPeriod} onChange={(e) => setCPeriod(e.target.value)} placeholder="Mei 2026" required />
                    </Field>
                  </div>
                  <Field label="Nilai komisi (Rp)" hint="Salin angka persis dari laporan jaringan, bukan perkiraan.">
                    <Input value={cAmount} onChange={(e) => setCAmount(e.target.value)} inputMode="numeric" placeholder="750000" required />
                  </Field>
                  <Field label="Catatan (opsional)">
                    <Input value={cNote} onChange={(e) => setCNote(e.target.value)} placeholder="Nomor laporan: 12345" />
                  </Field>
                  <Button type="submit" disabled={busy || !cAmount || !cPeriod}>
                    <TrendingUp className="size-4" aria-hidden="true" />
                    {busy ? 'Menyimpan…' : 'Catat komisi'}
                  </Button>
                </>
              )}
            </form>
          </Panel>

          <Panel>
            <PanelHead label="Riwayat komisi" aside={<CountNote>{`${commissions.length} catatan`}</CountNote>} />
            {commissions.length === 0 ? (
              <EmptyState
                title="Belum ada komisi tercatat"
                body="Komisi muncul di sini setelah Anda menyalinnya dari laporan resmi jaringan affiliate."
              />
            ) : (
              <ul className="divide-y divide-line">
                {commissions.map((row) => (
                  <li key={row.id} className="flex flex-col gap-1 px-page py-block sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="item-title">{row.programName ?? 'Program'}</p>
                      <p className="text-xs text-ink-quiet">
                        {row.periodLabel} · dicatat {dateTime(row.createdAt)}
                        {row.note ? ` · ${row.note}` : ''}
                      </p>
                    </div>
                    <p className="figure shrink-0 text-[0.8125rem]">{money(row.amountIdr)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  )
}
