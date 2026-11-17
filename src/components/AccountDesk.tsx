import { useState } from 'react'
import { useRouter } from 'next/router'
import { Download, LogOut } from 'lucide-react'
import {
  Badge,
  Button,
  EmptyState,
  InlineNote,
  List,
  Panel,
  PanelBody,
  PanelHead,
  SectionHead,
  SignalLink,
} from '@/components/ui'
import { dateTime, money } from '@/lib/format'

export type AccountOrder = {
  code: string
  productName: string
  amountIdr: number
  status: string
  paidAt: string | null
  createdAt: string
  invoiceUrl: string | null
  statusUrl: string
  downloadUrl: string | null
  deliverableNote: string | null
}

export type AccountSubscription = {
  planName: string
  amountIdr: number
  interval: string
  status: string
  paidAt: string | null
  periodEnd: string | null
  statusUrl: string
}

const ORDER_TAG: Record<string, { label: string; tone: 'signal' | 'hold' | 'danger' | 'neutral' }> = {
  paid: { label: 'Dibayar', tone: 'signal' },
  pending: { label: 'Menunggu bayar', tone: 'hold' },
  unpaid: { label: 'Tagihan belum dibuat', tone: 'hold' },
  expired: { label: 'Kedaluwarsa', tone: 'danger' },
  refunded: { label: 'Dikembalikan', tone: 'danger' },
}

const SUB_TAG: Record<string, { label: string; tone: 'signal' | 'hold' | 'danger' | 'neutral' }> = {
  active: { label: 'Aktif', tone: 'signal' },
  pending: { label: 'Menunggu bayar', tone: 'hold' },
  expired: { label: 'Berakhir', tone: 'danger' },
  cancelled: { label: 'Dibatalkan', tone: 'danger' },
}

function intervalLabel(interval: string) {
  return interval === 'year' ? 'per tahun' : 'per bulan'
}

/** The buyer's own home: what they bought, what is still payable, what they subscribed to. */
export function AccountDesk({
  name,
  email,
  orders,
  subscriptions,
}: {
  name: string
  email: string
  orders: AccountOrder[]
  subscriptions: AccountSubscription[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function signOut() {
    if (busy) return
    setBusy(true)
    await fetch('/api/customer/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    }).catch(() => undefined)
    await router.replace('/masuk')
  }

  const paidOrders = orders.filter((order) => order.status === 'paid')

  return (
    <div className="flex flex-col gap-section">
      <Panel>
        <PanelHead
          label="Akun Anda"
          aside={
            <Button variant="secondary" size="sm" onClick={signOut} disabled={busy}>
              <LogOut className="size-3.5" aria-hidden="true" />
              {busy ? 'Keluar…' : 'Keluar'}
            </Button>
          }
        />
        <PanelBody>
          <p className="heading-tight text-[1rem]">{name}</p>
          <p className="font-mono text-xs text-ink-quiet">{email}</p>
          <p className="text-xs leading-relaxed text-ink-quiet">
            {paidOrders.length > 0
              ? `${paidOrders.length} produk sudah lunas dan bisa diunduh kapan saja dari halaman ini.`
              : 'Belum ada pembelian lunas. Produk yang Anda beli akan muncul di sini.'}
          </p>
        </PanelBody>
      </Panel>

      <section className="flex flex-col gap-block">
        <SectionHead title="Pesanan produk" link={{ href: '/toko', label: 'Lihat katalog' }} />
        {orders.length === 0 ? (
          <Panel>
            <EmptyState
              title="Belum ada pesanan"
              body="Pesanan yang Anda buat dengan alamat email ini tampil di sini, lengkap dengan tautan unduhannya."
              action={<SignalLink href="/toko">Buka katalog produk</SignalLink>}
            />
          </Panel>
        ) : (
          <Panel>
            <List>
            {orders.map((order) => {
              const tag = ORDER_TAG[order.status] ?? { label: order.status, tone: 'hold' as const }
              return (
                <li key={order.code} className="flex flex-col gap-2 px-page py-block">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="heading-tight text-[0.9375rem]">{order.productName}</p>
                      <p className="text-xs text-ink-quiet">
                        <span className="font-mono">{order.code}</span> · dibeli {dateTime(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="figure text-sm">{money(order.amountIdr)}</span>
                      <Badge tone={tag.tone}>{tag.label}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {order.downloadUrl ? (
                      <a href={order.downloadUrl}>
                        <Button size="sm">
                          <Download className="size-3.5" aria-hidden="true" />
                          Unduh produk
                        </Button>
                      </a>
                    ) : order.status === 'paid' ? (
                      <InlineNote>
                        {order.deliverableNote ??
                          'Berkas untuk produk ini belum dilampirkan penjual. Hubungi kami dan sebutkan kode pesanan.'}
                      </InlineNote>
                    ) : null}
                    {order.status === 'pending' && order.invoiceUrl && (
                      <a href={order.invoiceUrl}>
                        <Button size="sm" variant="secondary">
                          Lanjutkan pembayaran
                        </Button>
                      </a>
                    )}
                    <SignalLink href={order.statusUrl}>Status pesanan</SignalLink>
                  </div>
                </li>
              )
            })}
            </List>
          </Panel>
        )}
      </section>

      <section className="flex flex-col gap-block">
        <SectionHead title="Langganan" link={{ href: '/harga', label: 'Lihat paket' }} />
        {subscriptions.length === 0 ? (
          <Panel>
            <EmptyState
              title="Belum ada langganan"
              body="Paket berlangganan yang Anda ambil dengan alamat email ini tampil di sini beserta masa aktifnya."
              action={<SignalLink href="/harga">Bandingkan paket</SignalLink>}
            />
          </Panel>
        ) : (
          <Panel>
            <List>
            {subscriptions.map((sub, index) => {
              const tag = SUB_TAG[sub.status] ?? { label: sub.status, tone: 'hold' as const }
              return (
                <li key={`${sub.planName}-${index}`} className="flex flex-col gap-2 px-page py-block">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="heading-tight text-[0.9375rem]">{sub.planName}</p>
                      <p className="text-xs text-ink-quiet">
                        {money(sub.amountIdr)} {intervalLabel(sub.interval)}
                        {sub.periodEnd ? ` · aktif sampai ${dateTime(sub.periodEnd)}` : ''}
                      </p>
                    </div>
                    <Badge tone={tag.tone}>{tag.label}</Badge>
                  </div>
                  <SignalLink href={sub.statusUrl}>Rincian langganan</SignalLink>
                </li>
              )
            })}
            </List>
          </Panel>
        )}
      </section>
    </div>
  )
}
