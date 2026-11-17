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
  Select,
  Stat,
} from '@/components/ui'
import { dateTime, money } from '@/lib/format'

type Member = { id: string; name: string; email: string; referralCode: string; createdAt: string }
type Withdrawal = {
  id: string
  memberName: string | null
  email: string | null
  amountIdr: number
  bankName: string
  bankAccountName: string
  bankAccountNumber: string
  status: string
  adminNote: string | null
  createdAt: string
}

const SOURCES = [
  { value: 'referral', label: 'Referral' },
  { value: 'sale', label: 'Transaksi jual-beli' },
  { value: 'task', label: 'Penyelesaian tugas' },
  { value: 'adjustment', label: 'Penyesuaian pemilik' },
]

const WD_LABEL: Record<string, string> = {
  pending: 'Menunggu pemeriksaan',
  approved: 'Disetujui, belum ditransfer',
  paid: 'Sudah ditransfer',
  rejected: 'Ditolak',
}

function wdTone(status: string): 'neutral' | 'signal' | 'hold' | 'danger' {
  if (status === 'paid') return 'signal'
  if (status === 'approved' || status === 'pending') return 'hold'
  if (status === 'rejected') return 'danger'
  return 'neutral'
}

/**
 * The owner's member desk: record a commission that really happened, and decide each
 * withdrawal by hand. Nothing here moves money — the owner transfers it themselves and
 * only then records that it happened.
 */
export function MemberAdmin() {
  const [members, setMembers] = useState<Member[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [form, setForm] = useState<Record<string, string>>({ sourceType: 'referral' })
  const [message, setMessage] = useState<{ tone: 'signal' | 'danger'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const [membersResponse, withdrawalsResponse] = await Promise.all([
      fetch('/api/admin/commissions'),
      fetch('/api/admin/withdrawals'),
    ])
    if (membersResponse.ok) setMembers((await membersResponse.json()).members)
    if (withdrawalsResponse.ok) setWithdrawals((await withdrawalsResponse.json()).withdrawals)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function award(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    const response = await fetch('/api/admin/commissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amountIdr: Number(form.amountIdr) }),
    })
    const body = await response.json().catch(() => ({}))
    setBusy(false)
    if (response.ok) {
      setMessage({ tone: 'signal', text: 'Komisi dicatat sebagai disetujui.' })
      setForm({ sourceType: 'referral' })
      await load()
    } else {
      setMessage({ tone: 'danger', text: body.error ?? 'Komisi gagal dicatat.' })
    }
  }

  async function decide(id: string, status: string) {
    const response = await fetch('/api/admin/withdrawals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    const body = await response.json().catch(() => ({}))
    setMessage(
      response.ok
        ? { tone: 'signal', text: 'Status penarikan diperbarui.' }
        : { tone: 'danger', text: body.error ?? 'Status gagal diperbarui.' }
    )
    await load()
  }

  const pending = withdrawals.filter((item) => item.status === 'pending').length
  const approved = withdrawals.filter((item) => item.status === 'approved')
  const awaitingTransfer = approved.reduce((sum, item) => sum + item.amountIdr, 0)

  return (
    <PageStack>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <div className="grid gap-block sm:grid-cols-3">
        <Stat label="Anggota terdaftar" value={members.length} />
        <Stat label="WD menunggu pemeriksaan" value={pending} tone={pending > 0 ? 'signal' : 'default'} />
        <Stat
          label="Disetujui, belum ditransfer"
          value={money(awaitingTransfer)}
          context="Transfer dilakukan manual oleh Anda."
        />
      </div>

      <div className="grid gap-stack lg:grid-cols-2">
        <Panel>
          <PanelHead label="Catat komisi anggota" />
          <PanelBody>
            <form className="flex flex-col gap-stack" onSubmit={award} noValidate>
              <Field label="Anggota">
                <Select
                  value={form.memberId ?? ''}
                  onChange={(event) => setForm({ ...form, memberId: event.target.value })}
                  required
                >
                  <option value="">Pilih anggota</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} · {member.email}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Sumber komisi">
                <Select
                  value={form.sourceType}
                  onChange={(event) => setForm({ ...form, sourceType: event.target.value })}
                >
                  {SOURCES.map((source) => (
                    <option key={source.value} value={source.value}>
                      {source.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Keterangan / bukti sumber" hint="Tulis apa yang benar-benar terjadi.">
                <Input
                  value={form.description ?? ''}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  required
                  minLength={3}
                />
              </Field>
              <Field label="Nominal komisi (Rupiah)">
                <Input
                  type="number"
                  min={1}
                  value={form.amountIdr ?? ''}
                  onChange={(event) => setForm({ ...form, amountIdr: event.target.value })}
                  required
                />
              </Field>
              <Button type="submit" disabled={busy}>
                {busy ? 'Menyimpan…' : 'Simpan komisi disetujui'}
              </Button>
            </form>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHead label={`Daftar anggota (${members.length})`} />
          {members.length === 0 ? (
            <EmptyState
              title="Belum ada anggota"
              body="Anggota muncul di sini setelah mereka mendaftar di portal anggota."
            />
          ) : (
            <ul className="divide-y divide-line">
              {members.map((member) => (
                <li key={member.id} className="row-line">
                  <div className="min-w-0">
                    <p className="item-title">{member.name}</p>
                    <p className="list-lead">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[0.6875rem] text-ink-quiet">{member.referralCode}</span>
                    <span className="text-xs text-ink-quiet">{dateTime(member.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel>
        <PanelHead label={`Permintaan penarikan (${withdrawals.length})`} />
        {withdrawals.length === 0 ? (
          <EmptyState
            title="Belum ada permintaan WD"
            body="Setiap permintaan dari portal anggota muncul di sini untuk Anda periksa."
          />
        ) : (
          <ul className="divide-y divide-line">
            {withdrawals.map((item) => (
              <li key={item.id} className="flex flex-col gap-3 px-page py-block lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="text-[0.8125rem] font-medium text-ink">
                    {item.memberName ?? 'Anggota'} · <span className="figure">{money(item.amountIdr)}</span>
                  </p>
                  <p className="list-lead">
                    {item.bankName} · {item.bankAccountName} · {item.bankAccountNumber}
                  </p>
                  <p className="list-lead">
                    {item.email ?? '—'} · {dateTime(item.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={wdTone(item.status)}>{WD_LABEL[item.status] ?? item.status}</Badge>
                  {item.status === 'pending' && (
                    <Button size="sm" onClick={() => decide(item.id, 'approved')}>
                      Setujui
                    </Button>
                  )}
                  {item.status === 'approved' && (
                    <Button size="sm" onClick={() => decide(item.id, 'paid')}>
                      Sudah saya transfer
                    </Button>
                  )}
                  {(item.status === 'pending' || item.status === 'approved') && (
                    <Button size="sm" variant="danger" onClick={() => decide(item.id, 'rejected')}>
                      Tolak
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Notice tone="hold">
        Aplikasi ini tidak pernah mentransfer uang. Tekan “Sudah saya transfer” hanya setelah Anda benar-benar
        mengirim dananya lewat bank atau e-wallet Anda sendiri.
      </Notice>
    </PageStack>
  )
}
