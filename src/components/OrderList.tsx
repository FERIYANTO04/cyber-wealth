import { useMemo, useState } from 'react'
import { CheckCircle2, Loader2, Undo2 } from 'lucide-react'
import { Badge, Button, CountNote, EmptyState, Field, InlineNote, Input, Panel, PanelBody, PanelHead, SearchInput, Select } from '@/components/ui'
import { compactMoney, dateTime } from '@/lib/format'

export type OrderRow = {
  id: string
  code: string
  productName: string
  buyerName: string
  buyerEmail: string
  amountIdr: number
  status: string
  provider: string
  paidAt: string | null
  createdAt: string
  refundedAt: string | null
}

const STATUS: Record<string, { label: string; tone: 'neutral' | 'signal' | 'hold' | 'danger' }> = {
  paid: { label: 'Dibayar', tone: 'signal' },
  pending: { label: 'Menunggu bayar', tone: 'hold' },
  unpaid: { label: 'Tagihan belum dibuat', tone: 'hold' },
  expired: { label: 'Kedaluwarsa', tone: 'danger' },
  refunded: { label: 'Dikembalikan', tone: 'danger' },
}

/** The orders that came in from the public storefront — paid ones only counted as revenue. */
export function OrderList({
  orders,
  counts,
}: {
  orders: OrderRow[]
  counts: { paid: number; pending: number; revenueIdr: number }
}) {
  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState(orders)
  const [openId, setOpenId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function confirmTransfer(orderId: string) {
    setBusy(true); setError(null); setNotice(null)
    try {
      const response = await fetch('/api/admin/orders/confirm-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.settled) { setError(data.error ?? 'Pembayaran belum dapat dikonfirmasi.'); return }
      setRows((old) => old.map((row) => row.id === orderId ? { ...row, status: 'paid', paidAt: new Date().toISOString() } : row))
      setNotice('Transfer dikonfirmasi. Produk dapat diakses pembeli.')
    } catch { setError('Koneksi terputus.') } finally { setBusy(false) }
  }

  async function refund(orderId: string) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch('/api/orders/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, note: note || undefined }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Refund tidak bisa dijalankan.')
        return
      }
      setRows((old) =>
        old.map((row) => (row.id === orderId ? { ...row, status: 'refunded', refundedAt: new Date().toISOString() } : row))
      )
      setOpenId(null)
      setNote('')
      setNotice('Permintaan refund diproses. Pastikan transfer pengembalian benar-benar dilakukan secara terpisah.')
    } catch {
      setError('Koneksi terputus. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return rows.filter((order) => {
      if (status !== 'all' && order.status !== status) return false
      if (!needle) return true
      return (
        order.code.toLowerCase().includes(needle) ||
        order.productName.toLowerCase().includes(needle) ||
        order.buyerEmail.toLowerCase().includes(needle) ||
        order.buyerName.toLowerCase().includes(needle)
      )
    })
  }, [rows, status, query])

  return (
    <Panel>
      <PanelHead
        label="Pesanan masuk"
        aside={<CountNote>{`${counts.paid} lunas · ${counts.pending} menunggu · ${compactMoney(counts.revenueIdr)}`}</CountNote>}
      />
      <div className="panel-head-row flex-col items-stretch sm:flex-row sm:items-center">
        <SearchInput value={query} onChange={setQuery} placeholder="Cari kode, produk, atau pembeli…" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:max-w-[12rem]">
          <option value="all">Semua status</option>
          <option value="paid">Dibayar</option>
          <option value="pending">Menunggu bayar</option>
          <option value="unpaid">Tagihan belum dibuat</option>
          <option value="expired">Kedaluwarsa</option>
          <option value="refunded">Dikembalikan</option>
        </Select>
      </div>

      {notice && <PanelBody><InlineNote tone="signal">{notice}</InlineNote></PanelBody>}
      {error && (
        <PanelBody>
          <InlineNote tone="danger">
            <span role="alert">{error}</span>
          </InlineNote>
        </PanelBody>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title={rows.length === 0 ? 'Belum ada pesanan' : 'Tidak ada pesanan yang cocok'}
          body={
            rows.length === 0
              ? 'Begitu produk terbit dan ada yang membeli, pesanannya muncul di sini. Pendapatan hanya dihitung setelah pembayaran dikonfirmasi resmi.'
              : 'Ubah kata kunci atau saringan status untuk melihat pesanan lain.'
          }
        />
      ) : (
        <ul className="divide-y divide-line">
          {filtered.map((order) => {
            const meta = STATUS[order.status] ?? { label: order.status, tone: 'neutral' as const }
            return (
              <li key={order.id} className="flex flex-col gap-2 px-page py-block sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[0.6875rem] text-ink-quiet">{order.code}</span>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </div>
                  <p className="mt-0.5 item-title">{order.productName}</p>
                  <p className="truncate text-xs text-ink-quiet">
                    {order.buyerName} · {order.buyerEmail}
                  </p>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <p className="figure text-[0.8125rem]">{compactMoney(order.amountIdr)}</p>
                  <p className="font-mono text-[0.625rem] text-ink-quiet">
                    {order.refundedAt
                      ? `dikembalikan ${dateTime(order.refundedAt)}`
                      : order.paidAt
                        ? `lunas ${dateTime(order.paidAt)}`
                        : `dibuat ${dateTime(order.createdAt)}`}
                  </p>
                  {order.status === 'pending' && order.provider === 'manual_transfer' && (
                    <div className="mt-2 flex flex-col items-start gap-1">
                      <Button size="sm" variant="secondary" disabled={busy} onClick={() => confirmTransfer(order.id)}>
                        {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="size-3.5" aria-hidden="true" />}
                        Verifikasi transfer masuk
                      </Button>
                      <p className="max-w-xs text-[0.6875rem] leading-relaxed text-ink-quiet">Gunakan hanya setelah mutasi rekening menunjukkan dana sudah masuk.</p>
                    </div>
                  )}
                  {order.status === 'paid' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-1"
                      onClick={() => {
                        setOpenId((old) => (old === order.id ? null : order.id))
                        setError(null)
                        setNotice(null)
                      }}
                    >
                      <Undo2 className="size-3.5" aria-hidden="true" />
                      {openId === order.id ? 'Tutup' : 'Kembalikan dana'}
                    </Button>
                  )}
                  {openId === order.id && (
                    <div className="mt-1.5 flex w-full flex-col gap-2 text-left sm:w-72">
                      <Field label="Catatan untuk pembeli (opsional)">
                        <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Misalnya: berkas tidak sesuai" />
                      </Field>
                      <Button size="sm" variant="danger" disabled={busy} onClick={() => refund(order.id)}>
                        {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Undo2 className="size-3.5" aria-hidden="true" />}
                        {busy ? 'Memproses…' : `Kembalikan ${compactMoney(order.amountIdr)}`}
                      </Button>
                      <p className="text-[0.6875rem] leading-relaxed text-ink-quiet">
                        Refund bank harus ditransfer manual dari rekening pemilik. Jangan konfirmasi sebelum transfer benar-benar dilakukan.
                      </p>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
