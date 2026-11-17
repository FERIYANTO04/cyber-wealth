import { useMemo, useState } from 'react'
import { AlertTriangle, Mail } from 'lucide-react'
import {
  Badge,
  ChoiceChips,
  CountNote,
  EmptyState,
  Notice,
  Panel,
  PanelBody,
  PanelHead,
  SearchInput,
  Stat,
} from '@/components/ui'
import { dateTime } from '@/lib/format'

export type EmailItem = {
  id: string
  toEmail: string
  kind: string
  subject: string
  body: string
  status: string
  detail: string | null
  createdAt: string
}

const KIND_LABEL: Record<string, string> = {
  'order-pending': 'Pesanan dicatat',
  'order-paid': 'Pesanan lunas',
  'subscription-created': 'Pendaftaran langganan',
  'subscription-paid': 'Langganan aktif',
  'cycle-reminder': 'Pengingat perpanjangan',
  'cycle-invoice': 'Tagihan perpanjangan',
  'cycle-paid': 'Perpanjangan lunas',
  'cycle-failed': 'Pembayaran gagal',
  'request-rejected': 'Permintaan ditolak',
  'cancel-approved': 'Pembatalan disetujui',
  'refund-approved': 'Refund diproses',
  'owner-order-paid': 'Pemberitahuan pemilik',
  'owner-subscription-paid': 'Pemberitahuan pemilik',
  'owner-subscription-created': 'Pemberitahuan pemilik',
  'owner-cycle-paid': 'Pemberitahuan pemilik',
  'owner-cycle-failed': 'Pemberitahuan pemilik',
  'owner-cancel-request': 'Permintaan pembatalan',
  'owner-refund-request': 'Permintaan refund',
}

const FILTERS = [
  { value: 'all', label: 'Semua' },
  { value: 'sent', label: 'Terkirim' },
  { value: 'queued', label: 'Di antrean' },
  { value: 'failed', label: 'Gagal' },
]

/** Every email the app tried to send, with what actually happened to it. */
export function EmailConsole({ emails, ready }: { emails: EmailItem[]; ready: boolean }) {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return emails.filter((email) => {
      if (filter !== 'all' && email.status !== filter) return false
      if (!needle) return true
      return (
        email.toEmail.toLowerCase().includes(needle) ||
        email.subject.toLowerCase().includes(needle) ||
        (KIND_LABEL[email.kind] ?? email.kind).toLowerCase().includes(needle)
      )
    })
  }, [emails, filter, query])

  const sent = emails.filter((email) => email.status === 'sent').length
  const queued = emails.filter((email) => email.status === 'queued').length
  const failed = emails.filter((email) => email.status === 'failed').length

  return (
    <div className="flex flex-col gap-stack">
      {!ready && (
        <Notice tone="hold" icon={<AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-hold" aria-hidden="true" />}>
          <p className="note-text">
            Penyedia email belum terhubung. Semua email di bawah tercatat beserta alasannya, tetapi belum benar-benar
            terkirim ke pelanggan. Isi kunci email di layar Integrasi agar pengiriman berjalan.
          </p>
        </Notice>
      )}

      <Panel>
        <PanelBody>
          <div className="grid grid-cols-3 gap-stack">
            <Stat label="Terkirim" value={String(sent)} context="diterima penyedia" tone="signal" />
            <Stat label="Di antrean" value={String(queued)} context="belum ada penyedia" />
            <Stat label="Gagal" value={String(failed)} context="ditolak atau error" tone={failed > 0 ? 'danger' : 'default'} />
          </div>
          <p className="text-xs leading-relaxed text-ink-quiet">
            Pesanan dan langganan tidak bergantung pada email: pembayaran tetap tercatat walau pengiriman email gagal.
          </p>
        </PanelBody>
      </Panel>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <ChoiceChips value={filter} options={FILTERS} onChange={setFilter} label="Saring status email" />
        <SearchInput value={query} onChange={setQuery} placeholder="Cari penerima atau subjek" />
      </div>

      <Panel>
        <PanelHead label="Kotak keluar" aside={<CountNote>{`${filtered.length} dari ${emails.length}`}</CountNote>} />
        {filtered.length === 0 ? (
          <EmptyState
            title="Belum ada email di sini"
            body="Email konfirmasi pesanan, pengiriman produk, dan pengingat perpanjangan muncul begitu ada pembeli atau pelanggan."
          />
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((email) => (
              <li key={email.id} className="flex flex-col gap-1.5 px-page py-block">
                <div className="flex flex-wrap items-center gap-2">
                  <Mail className="size-3.5 shrink-0 text-ink-quiet" aria-hidden="true" />
                  <p className="item-title">{email.subject}</p>
                  <Badge tone={email.status === 'sent' ? 'signal' : email.status === 'failed' ? 'danger' : 'hold'}>
                    {email.status === 'sent' ? 'Terkirim' : email.status === 'failed' ? 'Gagal' : 'Antrean'}
                  </Badge>
                </div>
                <p className="text-xs text-ink-quiet">
                  {KIND_LABEL[email.kind] ?? email.kind} · ke {email.toEmail} · {dateTime(email.createdAt)}
                </p>
                {email.detail && <p className="text-[0.6875rem] leading-relaxed text-ink-quiet">{email.detail}</p>}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
