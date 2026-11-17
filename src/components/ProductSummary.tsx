import { Badge, Panel, PanelBody, PanelHead } from '@/components/ui'
import { money } from '@/lib/format'

/** What the product is and what the buyer receives, above the buy form. */
export function ProductSummary({
  priceIdr,
  hasFile,
  description,
  deliverableNote,
}: {
  priceIdr: number
  hasFile: boolean
  description: string
  deliverableNote: string | null
}) {
  return (
    <>
      <Panel>
        <PanelBody>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="signal">{priceIdr === 0 ? 'Gratis' : money(priceIdr)}</Badge>
            {hasFile && <Badge>Unduhan langsung</Badge>}
          </div>
          <p className="text-[0.9375rem] leading-relaxed text-ink">{description}</p>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHead label="Rincian" />
        <PanelBody>
          <div className="flex flex-col gap-1.5 text-[0.8125rem] leading-relaxed text-ink-quiet">
            {deliverableNote && <p>{deliverableNote}</p>}
            <p>
              {hasFile
                ? 'Setelah pembayaran dikonfirmasi, berkas produk bisa diunduh langsung dari halaman pesanan Anda.'
                : 'Penjual menyiapkan serahan produk setelah pembayaran dikonfirmasi.'}
            </p>
          </div>
        </PanelBody>
      </Panel>
    </>
  )
}
