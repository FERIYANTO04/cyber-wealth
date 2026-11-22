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

/** One product as it appears in the public catalog. */
export function ProductCard({ product }: { product: StoreProduct }) {
  return (
    <Link
      href={`/toko/${product.slug}`}
      className="panel-frame group flex flex-col justify-between p-page transition-colors hover:border-signal/40"
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <Badge>{CATEGORY_LABEL[product.category] ?? product.category}</Badge>
          <ArrowUpRight
            className="go-arrow size-4 shrink-0"
            aria-hidden="true"
          />
        </div>
        <p className="mt-2 heading-tight text-[0.9375rem] leading-snug">{product.name}</p>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-quiet">{product.summary}</p>
      </div>
      <p className="mt-3 figure text-sm">{product.priceIdr === 0 ? 'Gratis' : money(product.priceIdr)}</p>
    </Link>
  )
}
