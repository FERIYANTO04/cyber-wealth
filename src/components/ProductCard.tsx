import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Badge } from '@/components/ui'
import { money } from '@/lib/format'

export type StoreProduct = {
  slug: string
  name: string
  summary: string
  category: string
  priceIdr: number
}

const CATEGORY_LABEL: Record<string, string> = {
  template: 'Template',
  ebook: 'E-book',
  desain: 'Aset desain',
  materi: 'Materi bisnis',
  toolkit: 'Toolkit',
  video: 'Video siap jual',
  motion: 'Motion graphics',
  audio: 'Audio & sound pack',
  social: 'Paket konten',
}

const PRODUCT_COVERS: Record<string, { src: string; alt: string }> = {
  'kit-cv-ats-lengkap': {
    src: '/images/product-covers/career-momentum.svg',
    alt: 'Sampul ilustratif Career Momentum Cyber Wealth',
  },
  'kit-whatsapp-business-umkm': {
    src: '/images/product-covers/business-momentum.svg',
    alt: 'Sampul ilustratif Business Momentum Cyber Wealth',
  },
}

/** One product as it appears in the public catalog. */
export function ProductCard({ product }: { product: StoreProduct }) {
  const cover = PRODUCT_COVERS[product.slug]

  return (
    <Link
      href={`/toko/${product.slug}`}
      className="panel-frame group flex flex-col overflow-hidden transition-colors hover:border-signal/40"
    >
      {cover ? (
        <img
          src={cover.src}
          alt={cover.alt}
          loading="lazy"
          className="aspect-[15/8] w-full object-cover"
        />
      ) : (
        <div
          role="img"
          aria-label="Sampul produk digital Cyber Wealth"
          className="aspect-[15/8] w-full bg-[radial-gradient(ellipse_at_75%_25%,rgba(197,166,106,.3),transparent_45%),linear-gradient(135deg,#101113,#28303a)]"
        />
      )}
      <div className="flex flex-1 flex-col justify-between p-page">
        <div>
          <div className="flex items-start justify-between gap-2">
            <Badge>{CATEGORY_LABEL[product.category] ?? product.category}</Badge>
            <ArrowUpRight className="go-arrow size-4 shrink-0" aria-hidden="true" />
          </div>
          <p className="mt-3 heading-tight text-[0.9375rem] leading-snug">{product.name}</p>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-quiet">{product.summary}</p>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="figure text-base font-semibold">{product.priceIdr === 0 ? 'Gratis' : money(product.priceIdr)}</p>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[.14em] text-signal">Lihat produk <ArrowUpRight className="size-3.5" /></span>
        </div>
      </div>
    </Link>
  )
}
