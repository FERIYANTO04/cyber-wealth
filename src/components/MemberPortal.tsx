import { useCallback, useEffect, useState } from 'react'
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Input,
  Notice,
  PageStack,
  Panel,
  PanelBody,
  PanelHead,
  Segmented,
  Stat,
} from '@/components/ui'
import { MemberFrame } from '@/components/MemberFrame'
import { dateTime, money } from '@/lib/format'

export type MemberData = {
  account: {
    id: string
    name: string
    email: string
    referralCode: string
    phone: string | null
    bankName: string | null
    bankAccountName: string | null
    bankAccountNumber: string | null
  }
  commissions: {
    id: string
    description: string
    sourceType: string
    amountIdr: number
    status: string
    createdAt: string
  }[]
  withdrawals: { id: string; amountIdr: number; status: string; createdAt: string }[]
  balance: number
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu pemeriksaan',
  approved: 'Disetujui, menunggu transfer',
  paid: 'Sudah ditransfer',
  rejected: 'Ditolak',
  reversed: 'Dibatalkan',
}

const SOURCE_LABEL: Record<string, string> = {
  referral: 'Referral',
  sale: 'Penjualan',
  task: 'Tugas',
  adjustment: 'Penyesuaian',
}

function statusTone(status: string): 'neutral' | 'signal' | 'hold' | 'danger' {
  if (status === 'paid') return 'signal'
  if (status === 'approved' || status === 'pending') return 'hold'
  if (status === 'rejected' || status === 'reversed') return 'danger'
  return 'neutral'
}

type Tab = 'wallet' | 'withdraw' | 'profile'

export function MemberPortal() {
  const [data, setData] = useState<MemberData | null>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState<Record<string, string>>({})
  const [amount, setAmount] = useState('')
  const [tab, setTab] = useState<Tab>('wallet')
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const response = await fetch('/api/member/me')
    setData(response.ok ? await response.json() : null)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function signIn(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/member/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, action: mode }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) setError(body.error ?? 'Tidak bisa memproses permintaan.')
      else await load()
    } catch {
      setError('Koneksi terputus. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    await fetch('/api/member/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    })
    setData(null)
    setForm({})
    setTab('wallet')
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault()
    if (!data) return
    setBusy(true)
    setError(null)
    setNote(null)
    const response = await fetch('/api/member/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name ?? data.account.name,
        phone: form.phone ?? data.account.phone ?? '',
        bankName: form.bankName ?? data.account.bankName ?? '',
        bankAccountName: form.bankAccountName ?? data.account.bankAccountName ?? '',
        bankAccountNumber: form.bankAccountNumber ?? data.account.bankAccountNumber ?? '',
      }),
    })
    const body = await response.json().catch(() => ({}))
    setBusy(false)
    if (!response.ok) setError(body.error ?? 'Data gagal disimpan.')
    else {
      setNote('Data pribadi dan rekening tersimpan.')
      setForm({})
      await load()
    }
  }

  async function requestWithdrawal(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setNote(null)
    const response = await fetch('/api/member/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountIdr: Number(amount) }),
    })
    const body = await response.json().catch(() => ({}))
    setBusy(false)
    if (!response.ok) setError(body.error ?? 'Permintaan WD gagal.')
    else {
      setNote(body.message ?? 'Permintaan WD dikirim.')
      setAmount('')
      await load()
    }
  }

  if (loading) {
    return (
      <MemberFrame title="Memuat portal anggota" intent="Menyiapkan data dompet Anda.">
        <Panel>
          <PanelBody>
            <p className="text-sm text-ink-quiet">Memuat…</p>
          </PanelBody>
        </Panel>
      </MemberFrame>
    )
  }

  if (!data) {
    return (
      <MemberFrame
        title={mode === 'login' ? 'Masuk sebagai anggota' : 'Daftar sebagai anggota'}
        eyebrow="Portal anggota"
        intent="Portal ini terpisah dari konsol pemilik. Komisi masuk ke dompet Anda setelah pemilik menyetujuinya."
      >
        <PageStack>
          <Panel>
            <PanelHead
              label={mode === 'login' ? 'Data masuk' : 'Data pendaftaran'}
              aside={
                <Button size="sm" variant="ghost" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
                  {mode === 'login' ? 'Buat akun' : 'Sudah punya akun?'}
                </Button>
              }
            />
            <PanelBody>
              <form className="flex flex-col gap-stack" onSubmit={signIn} noValidate>
                {mode === 'register' && (
                  <Field label="Nama lengkap">
                    <Input
                      value={form.name ?? ''}
                      onChange={(event) => setForm({ ...form, name: event.target.value })}
                      autoComplete="name"
                      required
                      minLength={2}
                    />
                  </Field>
                )}
                <Field label="Email">
                  <Input
                    type="email"
                    value={form.email ?? ''}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    autoComplete="username"
                    inputMode="email"
                    required
                  />
                </Field>
                <Field label="Kata sandi" hint={mode === 'register' ? 'Minimal 8 karakter.' : undefined}>
                  <Input
                    type="password"
                    value={form.password ?? ''}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    required
                    minLength={8}
                  />
                </Field>
                {mode === 'register' && (
                  <Field label="Kode referral" hint="Opsional. Isi bila Anda diajak anggota lain.">
                    <Input
                      value={form.referralCode ?? ''}
                      onChange={(event) => setForm({ ...form, referralCode: event.target.value })}
                    />
                  </Field>
                )}
                {error && <Notice tone="danger">{error}</Notice>}
                <Button type="submit" disabled={busy}>
                  {busy ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Buat akun & masuk'}
                </Button>
              </form>
            </PanelBody>
          </Panel>
        </PageStack>
      </MemberFrame>
    )
  }

  const account = data.account
  const bankReady = Boolean(account.bankName && account.bankAccountName && account.bankAccountNumber)

  return (
    <MemberFrame
      title={`Halo, ${account.name}`}
      eyebrow="Portal anggota"
      accountLabel={account.email}
      signOut={
        <Button variant="secondary" size="sm" onClick={signOut}>
          Keluar
        </Button>
      }
    >
      <PageStack>
        <Panel>
          <PanelHead label="Saldo tersedia" />
          <PanelBody>
            <Stat
              label="Bisa ditarik"
              value={money(data.balance)}
              context="Dari komisi yang sudah disetujui, dikurangi penarikan yang sedang berjalan."
            />
          </PanelBody>
        </Panel>

        {note && <Notice tone="signal">{note}</Notice>}
        {error && <Notice tone="danger">{error}</Notice>}

        <Segmented
          value={tab}
          onChange={setTab}
          label="Bagian portal"
          options={[
            { value: 'wallet', label: 'Dompet & riwayat' },
            { value: 'withdraw', label: 'Ajukan WD' },
            { value: 'profile', label: 'Data & rekening' },
          ]}
        />

        {tab === 'wallet' && (
          <div className="grid gap-stack md:grid-cols-2">
            <Panel>
              <PanelHead label="Kode referral" />
              <PanelBody>
                <p className="figure text-lg text-signal">{account.referralCode}</p>
                <p className="text-xs leading-relaxed text-ink-quiet">
                  Bagikan kode ini saat teman mendaftar. Komisi referral baru tercatat setelah pemilik memverifikasi
                  sumbernya.
                </p>
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHead label="Riwayat komisi" />
              {data.commissions.length === 0 ? (
                <EmptyState
                  title="Belum ada komisi"
                  body="Komisi muncul di sini setelah pemilik mencatatnya dari sumber yang benar-benar terjadi."
                />
              ) : (
                <ul className="divide-y divide-line">
                  {data.commissions.map((item) => (
                    <li key={item.id} className="row-line">
                      <div className="min-w-0">
                        <p className="item-title">{item.description}</p>
                        <p className="list-lead">
                          {SOURCE_LABEL[item.sourceType] ?? item.sourceType} · {dateTime(item.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={statusTone(item.status)}>{STATUS_LABEL[item.status] ?? item.status}</Badge>
                        <span className="figure text-sm">{money(item.amountIdr)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel className="md:col-span-2">
              <PanelHead label="Riwayat penarikan" />
              {data.withdrawals.length === 0 ? (
                <EmptyState
                  title="Belum ada permintaan WD"
                  body="Setelah saldo terkumpul, ajukan penarikan dari tab Ajukan WD."
                />
              ) : (
                <ul className="divide-y divide-line">
                  {data.withdrawals.map((item) => (
                    <li key={item.id} className="row-line">
                      <span className="list-lead">{dateTime(item.createdAt)}</span>
                      <div className="flex items-center gap-2">
                        <Badge tone={statusTone(item.status)}>{STATUS_LABEL[item.status] ?? item.status}</Badge>
                        <span className="figure text-sm">{money(item.amountIdr)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        )}

        {tab === 'withdraw' && (
          <Panel>
            <PanelHead label="Ajukan penarikan" />
            <PanelBody>
              {!bankReady && (
                <Notice tone="hold">
                  Lengkapi nama bank, nama pemilik rekening, dan nomor rekening di tab Data & rekening sebelum
                  mengajukan WD.
                </Notice>
              )}
              <form className="flex flex-col gap-stack" onSubmit={requestWithdrawal} noValidate>
                <Field label="Nominal penarikan (Rupiah)" hint={`Minimal Rp10.000 · saldo ${money(data.balance)}`}>
                  <Input
                    type="number"
                    min={10000}
                    max={data.balance}
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    required
                  />
                </Field>
                <Button type="submit" disabled={busy || !bankReady}>
                  {busy ? 'Mengirim…' : 'Kirim permintaan WD'}
                </Button>
              </form>
              <p className="list-lead">
                Pemilik memeriksa setiap permintaan dan mentransfer secara manual. Status berubah menjadi “Sudah
                ditransfer” hanya setelah pemilik benar-benar mengirim uangnya.
              </p>
            </PanelBody>
          </Panel>
        )}

        {tab === 'profile' && (
          <Panel>
            <PanelHead label="Data pribadi & rekening" />
            <PanelBody>
              <form className="flex flex-col gap-stack" onSubmit={saveProfile} noValidate>
                <Field label="Nama lengkap">
                  <Input
                    key={`name-${account.name}`}
                    defaultValue={account.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    required
                    minLength={2}
                  />
                </Field>
                <Field label="Nomor HP">
                  <Input
                    key={`phone-${account.phone ?? ''}`}
                    defaultValue={account.phone ?? ''}
                    inputMode="tel"
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  />
                </Field>
                <Field label="Nama bank / e-wallet">
                  <Input
                    key={`bank-${account.bankName ?? ''}`}
                    defaultValue={account.bankName ?? ''}
                    onChange={(event) => setForm({ ...form, bankName: event.target.value })}
                  />
                </Field>
                <Field label="Nama pemilik rekening">
                  <Input
                    key={`holder-${account.bankAccountName ?? ''}`}
                    defaultValue={account.bankAccountName ?? ''}
                    onChange={(event) => setForm({ ...form, bankAccountName: event.target.value })}
                  />
                </Field>
                <Field
                  label="Nomor rekening"
                  hint="Hanya dipakai untuk memproses WD, tidak pernah ditampilkan ke anggota lain."
                >
                  <Input
                    key={`number-${account.bankAccountNumber ?? ''}`}
                    defaultValue={account.bankAccountNumber ?? ''}
                    inputMode="numeric"
                    onChange={(event) => setForm({ ...form, bankAccountNumber: event.target.value })}
                  />
                </Field>
                <Button type="submit" disabled={busy}>
                  {busy ? 'Menyimpan…' : 'Simpan data'}
                </Button>
              </form>
            </PanelBody>
          </Panel>
        )}
      </PageStack>
    </MemberFrame>
  )
}
