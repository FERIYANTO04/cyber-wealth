import type { GetServerSideProps } from 'next'
import { useState } from 'react'
import { StoreFrame } from '@/components/StoreFrame'
import { Badge, Button, Panel, PanelBody, PanelHead } from '@/components/ui'
import { sqlClient } from '@/lib/db'
import { money } from '@/lib/format'
import type { PageWithFrame } from '@/lib/frame'

type Props = {
  token: string
  code: string
  name: string
  serviceName: string
  brief: string
  proposalBody: string | null
  proposalAmountIdr: number | null
  status: string
  paymentStatus: string | null
  invoiceUrl: string | null
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const token = String(ctx.params?.token ?? '')
  const [request] = await sqlClient`
    select id, code, name, service_name as "serviceName", brief,
      proposal_body as "proposalBody", proposal_amount_idr as "proposalAmountIdr", status
    from service_request where proposal_token = ${token} limit 1
  `
  if (!request) return { notFound: true }

  const [payment] = await sqlClient`
    select status, invoice_url as "invoiceUrl" from service_payment
    where service_request_id = ${request.id} and data_source = 'live'
    order by created_at desc limit 1
  `

  return {
    props: {
      token,
      code: request.code,
      name: request.name,
      serviceName: request.serviceName,
      brief: request.brief,
      proposalBody: request.proposalBody,
      proposalAmountIdr: request.proposalAmountIdr === null ? null : Number(request.proposalAmountIdr),
      status: request.status,
      paymentStatus: payment?.status ?? null,
      invoiceUrl: payment?.invoiceUrl ?? null,
    },
  }
}

function ProposalPortal(props: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const paid = props.paymentStatus === 'paid' || props.status === 'won' || props.status === 'in_progress' || props.status === 'delivered'

  async function pay() {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/services/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: props.token }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Tagihan belum dapat dibuat. Coba kembali.')
        return
      }
      if (data.paid) {
        window.location.reload()
        return
      }
      if (data.paymentUrl) window.location.assign(data.paymentUrl)
      else setError('Tautan pembayaran belum tersedia.')
    } catch {
      setError('Koneksi terputus. Coba kembali.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <Panel>
        <PanelBody>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Cyber Wealth · Client portal</p>
              <h2 className="mt-2 text-xl font-semibold text-ink">{props.serviceName}</h2>
              <p className="mt-1 font-mono text-xs text-ink-quiet">Referensi {props.code}</p>
            </div>
            <Badge tone={paid ? 'signal' : props.proposalBody ? 'hold' : 'neutral'}>{paid ? 'Pembayaran terverifikasi' : props.proposalBody ? 'Penawaran tersedia' : 'Brief diterima'}</Badge>
          </div>
          <p className="mt-4 text-sm leading-7 text-ink-quiet">Halo {props.name}. Halaman privat ini menyimpan brief, penawaran, dan status pembayaran Anda. Simpan tautan ini untuk membuka kembali permintaan.</p>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHead label="Ringkasan kebutuhan" />
        <PanelBody><p className="whitespace-pre-wrap text-sm leading-7 text-ink">{props.brief}</p></PanelBody>
      </Panel>

      <Panel>
        <PanelHead label="Penawaran Cyber Wealth" />
        <PanelBody>
          {props.proposalBody ? (
            <>
              <div className="whitespace-pre-wrap text-sm leading-7 text-ink">{props.proposalBody}</div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <div>
                  <p className="eyebrow">Nilai penawaran</p>
                  <p className="mt-1 text-2xl font-semibold text-ink">{props.proposalAmountIdr === null ? 'Menunggu harga' : money(props.proposalAmountIdr)}</p>
                </div>
                {paid ? <Badge tone="signal">Lunas</Badge> : (
                  <Button onClick={pay} disabled={busy || !props.proposalAmountIdr || props.proposalAmountIdr <= 0}>
                    {busy ? 'Menyiapkan pembayaran…' : props.invoiceUrl ? 'Lanjutkan pembayaran' : 'Setujui & bayar'}
                  </Button>
                )}
              </div>
              {props.paymentStatus === 'pending' && <p className="mt-3 text-xs text-ink-quiet">Tagihan sudah dibuat. Selesaikan pembayaran melalui halaman Midtrans untuk mengaktifkan pesanan.</p>}
            </>
          ) : (
            <p className="text-sm leading-7 text-ink-quiet">Brief Anda sudah tersimpan. Tim Cyber Wealth sedang meninjau kebutuhan dan akan menampilkan ruang lingkup, harga, serta tenggat di halaman ini. Belum ada biaya yang dikenakan.</p>
          )}
          {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
        </PanelBody>
      </Panel>

      <p className="text-center text-xs leading-6 text-ink-quiet">Pembayaran hanya dianggap lunas setelah Midtrans mengonfirmasi transaksi. Jangan kirim bukti transfer ke tautan yang tidak berasal dari halaman ini.</p>
    </div>
  )
}

const Page = ProposalPortal as PageWithFrame<Props>
Page.getLayout = (page) => (
  <StoreFrame eyebrow="Client portal" title="Penawaran & pembayaran" intent="Lihat penawaran layanan, setujui ruang lingkup, dan selesaikan pembayaran melalui kanal resmi." variant="wide">
    {page}
  </StoreFrame>
)
export default Page
