import type { GetServerSideProps } from 'next'
import Link from 'next/link'
import { ArrowUpRight, Film, PlayCircle } from 'lucide-react'
import { StoreFrame } from '@/components/StoreFrame'
import { ProductCatalog } from '@/components/ProductCatalog'
import type { StoreProduct } from '@/components/ProductCard'
import { getStoreProducts } from '@/lib/revenue'
import type { PageWithFrame } from '@/lib/frame'

type Props = { videos: StoreProduct[] }
export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const products = await getStoreProducts()
  const videos = products.filter((item) => ['video','motion','audio'].includes(item.category)).map((row): StoreProduct => ({
    slug: row.slug, name: row.name, summary: row.summary, category: row.category, priceIdr: Number(row.priceIdr),
  }))
  return { props: { videos } }
}
function MediaPage({ videos }: Props) {
  return <div className="space-y-8">
    <section className="border border-[#b99a5b]/25 bg-[#101113] p-7 sm:p-10">
      <Film className="size-6 text-[#c5a66a]"/>
      <p className="mt-5 font-mono text-[10px] uppercase tracking-[.22em] text-[#c5a66a]">Cyber Wealth · Media releases</p>
      <h2 className="mt-3 max-w-3xl text-3xl font-medium tracking-[-.04em] text-[#f3f0e9] sm:text-4xl">Video releases & creative assets.</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[#aaa69e]">Katalog video, motion graphics, dan aset audio yang telah diterbitkan dan memiliki berkas serahan terverifikasi. Konten yang belum lolos pemeriksaan tidak ditampilkan sebagai produk siap beli.</p>
      <Link href="/kreator" className="mt-6 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#d8bd83]">Creator & production services <ArrowUpRight className="size-3.5"/></Link>
    </section>
    {videos.length ? <ProductCatalog products={videos} isOwner={false}/> : <section className="border border-dashed border-[#b99a5b]/30 bg-[#101113] px-6 py-12 text-center"><PlayCircle className="mx-auto size-7 text-[#c5a66a]"/><h3 className="mt-4 text-lg font-medium text-[#f3f0e9]">Belum ada video yang dirilis.</h3><p className="mx-auto mt-2 max-w-lg text-xs leading-6 text-[#9e998f]">Halaman rilis sudah tersedia. Video akan muncul setelah berkas final diunggah, hak penggunaannya diperiksa, dan produk diterbitkan oleh owner.</p></section>}
  </div>
}
const Page = MediaPage as PageWithFrame<Props>
Page.getLayout = (page) => <StoreFrame eyebrow="Creator & Media / Releases" title="Video & media library" intent="Rilis video dan aset media Cyber Wealth yang sudah siap digunakan." variant="wide" description="Cyber Wealth video releases and creative media products.">{page}</StoreFrame>
export default Page
