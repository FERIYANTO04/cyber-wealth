import { useState } from 'react'
import { CheckCircle2, Clock, RefreshCw, XCircle } from 'lucide-react'
import { Badge, Button, CountNote, Field, InlineNote, Notice, Panel, PanelBody, PanelHead, SignalLink, Textarea } from '@/components/ui'
import { dateTime, money } from '@/lib/format'

export type CycleRow = {
  id: string
  periodStart: string
  periodEnd: string
  amountIdr: number
  status: string
  invoiceUrl: string | null
  paidAt: string | null
  note: string | null
}

export type SubscriptionDetail = {
  token: string
  planName: string
  accountName: string
  accountEmail: string
  amountIdr: number
  status: string
  interval: string
  invoiceUrl: string | null
  paidAt: string | null
  periodEnd: string | null
  autoRenew: boolean
  autoRenewAt: string | null
  cancelledAt: string | null
  createdAt: string
  requestedKind: 'cancel' | 'refund' | null
}

export type EmailRow = { id: string; kind: string; subject: string; status: string; detail: string | null; createdAt: string }

const CYCLE_TONE: Record<string, 'signal' | 'hold' | 'danger' | 'neutral'> = {
  paid: 'signal',
  invoiced: 'hold',
  scheduled: 'neutral',
  failed: 'danger',
  skipped: 'neutral',
}

const CYCLE_LABEL: Record<string, string> = {
  paid: 'Lunas',
  invoiced: 'Menunggu pembayaran',
  scheduled: 'Terjadwal',
  failed: 'Gagal',
  skipped: 'Dilewati',
}

/** A subscriber's own dashboard: what they pay, what happens next, and the controls. */
export function SubscriptionStatus({
  subscription,
  cycles,
  emails,
  paymentInstructions,
}: {
  subscription: SubscriptionDetail
  cycles: CycleRow[]
  emails: EmailRow[]
  paymentInstructions: string
}) {
  const [autoRenew, setAutoRenew] = useState(subscription.autoRenew)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [openForm, setOpenForm] = useState<'cancel' | 'refund' | null>(null)

  const active = subscription.status === 'active'
  const lifetime = subscription.status === 'cancelled' ? 'Dibatalkan' : active ? 'Aktif' : subscription.status === 'pending' ? 'Menunggu pembayaran' : 'Tidak aktif'

  async function toggleRenew(next: boolean) {
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      const response = await fetch('/api/saas/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: subscription.token, autoRenew: next }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Pengaturan tidak tersimpan.')
        return
      }
      setAutoRenew(next)
      setNote(
        next
          ? 'Pengingat perpanjangan menyala. Kami mengingatkan sebelum setiap tagihan, dan Anda bisa mematikannya kapan saja.'
          : 'Pengingat perpanjangan mati. Tidak ada tagihan berikutnya yang dibuat.'
      )
    } catch {
      setError('Koneksi terputus. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  async function request(kind: 'cancel' | 'refund') {
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      const response = await fetch('/api/saas/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: subscription.token, kind, reason }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Permintaan tidak terkirim.')
        return
      }
      setNote(
        kind === 'cancel'
          ? 'Permintaan pembatalan terkirim dan menunggu keputusan pemilik. Tagihan berikutnya dijeda sampai ada keputusan.'
          : 'Permintaan refund terkirim dan menunggu keputusan pemilik.'
      )
      setOpenForm(null)
      setReason('')
    } catch {
      setError('Koneksi terputus. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-stack">
      <Panel>
        <PanelHead
          label="Langganan saya"
          aside={<Badge tone={active ? 'signal' : subscription.status === 'pending' ? 'hold' : 'danger'}>{lifetime}</Badge>}
        />
        <PanelBody>
          <div className="flex flex-col gap-1">
            <p className="heading-tight text-[1rem]">{subscription.planName}</p>
            <p className="text-xs text-ink-quiet">
              {subscription.accountName} · {subscription.accountEmail}
            </p>
            <p className="figure mt-1 text-lg">
              {money(subscription.amountIdr)}
              <span className="ml-1 font-sans text-xs font-normal text-ink-quiet">
                /{subscription.interval === 'year' ? 'tahun' : 'bulan'}
              </span>
            </p>
          </div>

          {active ? (
            <div className="message-box flex items-start gap-2 border-signal/30 bg-signal-soft">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden="true" />
              <div>
                <p className="text-[0.8125rem] font-medium text-signal">Langganan aktif</p>
                <p className="list-lead mt-0.5">
                  Dibayar {subscription.paidAt ? dateTime(subscription.paidAt) : ''}
                  {subscription.periodEnd ? ` · berlaku sampai ${dateTime(subscription.periodEnd)}` : ''}
                </p>
              </div>
            </div>
          ) : subscription.status === 'pending' ? (
            <div className="message-box flex flex-col gap-2 border-hold/30 bg-hold-soft">
              <div className="flex items-center gap-2">
                <Clock className="size-4 shrink-0 text-hold" aria-hidden="true" />
                <p className="text-[0.8125rem] font-medium text-hold">Menunggu pembayaran</p>
              </div>
              <p className="list-lead">Transfer sesuai jumlah di atas langsung ke rekening pemilik. Masukkan kode referensi berikut pada berita transfer, jika bank mendukungnya:</p>
              <p className="font-mono text-xs font-semibold">{subscription.token}</p>
              <div className="message-box border-line bg-panel"><p className="whitespace-pre-wrap text-sm leading-relaxed">{paymentInstructions}</p></div>
              <p className="list-lead">Setelah dana benar-benar masuk, pemilik akan memverifikasi mutasi dan mengaktifkan langganan. Jangan mengirim PIN, OTP, atau kata sandi.</p>

            </div>
          ) : (
            <div className="message-box flex items-start gap-2 border-line">
              <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
              <div>
                <p className="text-[0.8125rem] font-medium text-ink">Langganan tidak aktif</p>
                <p className="list-lead mt-0.5">
                  {subscription.cancelledAt
                    ? `Dibatalkan ${dateTime(subscription.cancelledAt)}. Tidak ada tagihan berikutnya.`
                    : 'Tidak ada pembayaran yang dikonfirmasi untuk langganan ini. Tidak ada dana yang tercatat masuk.'}
                </p>
              </div>
            </div>
          )}
        </PanelBody>
      </Panel>

      {note && <InlineNote tone="signal">{note}</InlineNote>}
      {error && (
        <InlineNote tone="danger">
          <span role="alert">{error}</span>
        </InlineNote>
      )}

      <Panel>
        <PanelHead label="Riwayat tagihan" aside={<CountNote>{`${cycles.length} periode`}</CountNote>} />
        {cycles.length === 0 ? (
          <PanelBody>
            <p className="list-lead">
              Belum ada periode tagihan. Riwayat muncul setelah pembayaran pertama dikonfirmasi.
            </p>
          </PanelBody>
        ) : (
          <ul className="divide-y divide-line">
            {cycles.map((cycle) => (
              <li key={cycle.id} className="row-line">
                <div className="min-w-0">
                  <p className="text-[0.8125rem] font-medium text-ink">
                    {dateTime(cycle.periodStart)} — {dateTime(cycle.periodEnd)}
                  </p>
                  <p className="font-mono text-[0.625rem] text-ink-quiet">
                    {cycle.paidAt ? `dibayar ${dateTime(cycle.paidAt)}` : cycle.note ?? dateTime(cycle.periodStart)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="figure text-[0.8125rem]">{money(cycle.amountIdr)}</span>
                  <Badge tone={CYCLE_TONE[cycle.status] ?? 'neutral'}>{CYCLE_LABEL[cycle.status] ?? cycle.status}</Badge>
                  {cycle.invoiceUrl && cycle.status !== 'paid' && (
                    <a href={cycle.invoiceUrl} className="link-signal">
                      Bayar
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <PanelHead label="Batal atau refund" aside={subscription.requestedKind ? <Badge tone="hold">Menunggu pemilik</Badge> : undefined} />
        <PanelBody>
          <p className="list-lead max-w-prose">
            Pembatalan dan refund diputuskan pemilik. Tidak ada uang yang kembali tanpa persetujuannya, dan langganan
            tetap berjalan sampai permintaan itu disetujui.
          </p>
          {subscription.requestedKind ? (
            <Notice tone="hold" icon={<Clock className="mt-0.5 size-3.5 shrink-0 text-hold" aria-hidden="true" />}>
              <p className="text-xs leading-relaxed text-ink">
                Permintaan {subscription.requestedKind === 'refund' ? 'refund' : 'pembatalan'} Anda sedang ditinjau
                pemilik.
              </p>
            </Notice>
          ) : openForm ? (
            <div className="flex flex-col gap-2">
              <Field label={openForm === 'refund' ? 'Alasan refund' : 'Alasan pembatalan'}>
                <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
              </Field>
              <div className="action-row">
                <Button size="sm" disabled={busy || reason.trim().length < 4} onClick={() => request(openForm)}>
                  {busy ? 'Mengirim…' : 'Kirim permintaan'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOpenForm(null)}>
                  Batal
                </Button>
              </div>
            </div>
          ) : (
            <div className="action-row">
              <Button size="sm" variant="secondary" onClick={() => setOpenForm('cancel')}>
                Ajukan pembatalan
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setOpenForm('refund')}>
                Ajukan refund
              </Button>
            </div>
          )}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHead label="Email untuk langganan ini" aside={<CountNote>{`${emails.length} email`}</CountNote>} />
        {emails.length === 0 ? (
          <PanelBody>
            <p className="list-lead">Belum ada email untuk langganan ini.</p>
          </PanelBody>
        ) : (
          <ul className="divide-y divide-line">
            {emails.map((email) => (
              <li key={email.id} className="row-line">
                <div className="min-w-0">
                  <p className="item-title">{email.subject}</p>
                  <p className="text-xs text-ink-quiet">{dateTime(email.createdAt)}</p>
                </div>
                <Badge tone={email.status === 'sent' ? 'signal' : email.status === 'failed' ? 'danger' : 'hold'}>
                  {email.status === 'sent' ? 'Terkirim' : email.status === 'failed' ? 'Gagal' : 'Di antrean'}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <p className="list-lead">
        <SignalLink href="/langganan">Lihat paket lain</SignalLink>
      </p>
    </div>
  )
}
