import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { cn } from '@/lib/utils'
import { CheckCircle2, Clock, Download, XCircle } from 'lucide-react'
import { Badge, Button, Panel, PanelBody, PanelHead, SignalLink } from '@/components/ui'
import { dateTime, money } from '@/lib/format'

export type OrderDetail = {
  code: string
  productName: string
  productSlug: string
  buyerName: string
  buyerEmail: string
  amountIdr: number
  status: string
  provider: string
  invoiceUrl: string | null
  paidAt: string | null
  createdAt: string
}

const STATUS_TAG: Record<string, { label: string; tone: 'signal' | 'hold' | 'danger' }> = {
  paid: { label: 'Pembayaran terkonfirmasi', tone: 'signal' },
  pending: { label: 'Menunggu pembayaran', tone: 'hold' },
  unpaid: { label: 'Pembayaran belum tersedia', tone: 'hold' },
  expired: { label: 'Tagihan kedaluwarsa', tone: 'danger' },
}

function StatusNote({
  icon,
  title,
  body,
  tone,
}: {
  icon: 'paid' | 'wait' | 'off' | 'gone'
  title: string
  body: string
  tone: 'signal' | 'hold' | 'neutral' | 'danger'
}) {
  const Icon = icon === 'paid' ? CheckCircle2 : icon === 'wait' ? Clock : XCircle
  const shell = {
    signal: 'border-signal/30 bg-signal-soft',
    hold: 'border-hold/30 bg-hold-soft',
    neutral: 'inset-box',
    danger: 'inset-box',
  }[tone]
  const iconColor = {
    signal: 'text-signal',
    hold: 'text-hold',
    neutral: 'text-ink-quiet',
    danger: 'text-danger',
  }[tone]
  return (
    <div className={cn('inset-block flex flex-col gap-2', shell)}>
      <div className="flex items-center gap-2">
        <Icon className={`size-4 shrink-0 ${iconColor}`} aria-hidden="true" />
        <p className={`text-[0.8125rem] font-medium ${tone === 'signal' ? 'text-signal' : 'text-ink'}`}>{title}</p>
      </div>
      <p className="text-xs leading-relaxed text-ink-quiet">{body}</p>
    </div>
  )
}

/** One buyer's order: what it was, what it cost, and whether money actually arrived. */
export function OrderStatusPanel({
  order,
  downloadUrl,
  deliverableNote,
  bankTransfer,
  orderToken,
}: {
  order: OrderDetail
  downloadUrl: string | null
  deliverableNote: string | null
  bankTransfer: { bankName: string; accountName: string; accountNumber: string; instructions: string } | null
  orderToken: string
}) {
  const router = useRouter()
  useEffect(() => {
    if (order.status !== 'pending' || order.provider !== 'midtrans' || !orderToken) return
    let attempts = 0
    let stopped = false
    const timer = window.setInterval(async () => {
      attempts += 1
      try {
        const response = await fetch('/api/orders/status?token=' + encodeURIComponent(orderToken), { cache: 'no-store' })
        if (response.ok) {
          const current = await response.json() as { status?: string }
          if (!stopped && current.status && current.status !== order.status) {
            stopped = true
            window.clearInterval(timer)
            router.reload()
            return
          }
        }
      } catch {
        // A temporary network issue should not stop the next status check.
      }
      if (attempts >= 36) window.clearInterval(timer)
    }, 5000)
    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [order.status, order.provider, orderToken, router])

  const tag = STATUS_TAG[order.status] ?? { label: order.status, tone: 'hold' as const }

  return (
    <Panel>
      <PanelHead label={`Pesanan ${order.code}`} aside={<Badge tone={tag.tone}>{tag.label}</Badge>} />
      <PanelBody>
        <div className="flex flex-col gap-1">
          <p className="heading-tight text-[1rem]">{order.productName}</p>
          <p className="text-xs text-ink-quiet">
            {order.buyerName} · {order.buyerEmail} · dibuat {dateTime(order.createdAt)}
          </p>
          <p className="figure mt-1 text-lg">{money(order.amountIdr)}</p>
        </div>

        {order.status === 'paid' && (
          <>
            <StatusNote
              icon="paid"
              tone="signal"
              title="Pembayaran dikonfirmasi resmi"
              body={`Dikonfirmasi ${order.paidAt ? dateTime(order.paidAt) : ''} oleh pemilik setelah dana masuk diverifikasi.`}
            />
            {downloadUrl ? (
              <a href={downloadUrl} className="w-fit">
                <Button size="sm">
                  <Download className="size-4" aria-hidden="true" />
                  Unduh produk
                </Button>
              </a>
            ) : (
              <p className="text-xs leading-relaxed text-ink-quiet">
                {deliverableNote ??
                  'Penjual belum melampirkan berkas unduhan untuk produk ini. Hubungi penjual dan sebutkan kode pesanan di atas.'}
              </p>
            )}
          </>
        )}


        {order.status === 'pending' && order.provider === 'manual_transfer' && bankTransfer && (
          <>
            <StatusNote
              icon="wait"
              tone="hold"
              title="Menunggu transfer bank"
              body="Transfer sesuai nominal berikut. Pesanan baru dianggap lunas setelah mutasi rekening diverifikasi penjual."
            />
            <div className="inset-box flex flex-col gap-2 rounded-xl p-4 text-sm">
              <p><strong>Bank:</strong> {bankTransfer.bankName}</p>
              <p><strong>Nama rekening:</strong> {bankTransfer.accountName}</p>
              <p><strong>Nomor rekening:</strong> <span className="font-semibold tracking-wide">{bankTransfer.accountNumber}</span></p>
              <p><strong>Nominal tepat:</strong> <span className="font-semibold">{money(order.amountIdr)}</span></p>
              {bankTransfer.instructions && <p className="whitespace-pre-wrap text-ink-quiet">{bankTransfer.instructions}</p>}
              <p className="text-xs text-ink-quiet">Cantumkan kode pesanan {order.code} pada berita transfer jika bank mendukungnya.</p>
            </div>
          </>
        )}
        {order.status === 'pending' && ['paddle', 'midtrans'].includes(order.provider) && order.invoiceUrl && (
          <>
            <StatusNote
              icon="wait"
              tone="hold"
              title="Menunggu pembayaran"
              body="Selesaikan pembayaran melalui halaman resmi penyedia. Status pesanan diperiksa otomatis setiap beberapa detik; produk tersedia setelah pembayaran dikonfirmasi."
            />
            <a href={order.invoiceUrl} className="w-fit">
              <Button size="sm">Lanjutkan pembayaran</Button>
            </a>
          </>
        )}

        {order.status === 'unpaid' && (
          <StatusNote
            icon="off"
            tone="neutral"
            title="Pembayaran belum bisa diproses"
            body="Penjual belum menyelesaikan pengaturan pembayaran, jadi tagihan belum bisa dibuat. Pesanan ini tercatat dan tidak dianggap dibayar."
          />
        )}

        {order.status !== 'paid' && order.status !== 'pending' && order.status !== 'unpaid' && (
          <>
            <StatusNote
              icon="gone"
              tone="danger"
              title="Tagihan sudah tidak berlaku"
              body="Pesanan ini tidak dibayar sebelum tagihan kedaluwarsa. Tidak ada dana yang tercatat masuk."
            />
            <SignalLink href={`/toko/${order.productSlug}`}>Pesan lagi</SignalLink>
          </>
        )}
      </PanelBody>
    </Panel>
  )
}
