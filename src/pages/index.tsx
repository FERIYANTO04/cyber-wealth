import type { GetServerSideProps } from 'next'
import Link from 'next/link'
import { ArrowUpRight, Package, Sparkles } from 'lucide-react'
import { StoreFrame } from '@/components/StoreFrame'
import { ServiceCatalog, type ServiceItem } from '@/components/ServiceCatalog'
import { ProductCatalog } from '@/components/ProductCatalog'
import type { StoreProduct } from '@/components/ProductCard'
import { getPublishedServices } from '@/lib/services'
import { getStoreProducts } from '@/lib/revenue'
import { getSession } from '@/lib/auth'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const [serviceRows, productRows, session] = await Promise.all([
    getPublishedServices(),
    getStoreProducts(),
    getSession(ctx.req),
  ])
  return {
    props: {
      isOwner: Boolean(session),
      services: serviceRows.map((row): ServiceItem => ({
        slug: row.slug,
        name: row.name,
        summary: row.summary,
        category: row.category,
        priceFromIdr: Number(row.priceFromIdr),
        deliveryDays: row.deliveryDays,
      })),
      products: productRows.map((row): StoreProduct => ({
        slug: row.slug,
        name: row.name,
        summary: row.summary,
        category: row.category,
        priceIdr: Number(row.priceIdr),
      })),
    },
  }
}

type Props = { isOwner: boolean; services: ServiceItem[]; products: StoreProduct[] }

function HomePage({ services, products, isOwner }: Props) {
  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden border border-[#c7a66a]/25 bg-[radial-gradient(ellipse_at_82%_20%,rgba(190,151,79,.2),transparent_42%),linear-gradient(120deg,#17130d,#090907_65%)] px-6 py-10 sm:px-10 sm:py-14">
        <p className="font-mono text-[9px] uppercase tracking-[.28em] text-[#c9a96d]">Cyber Wealth / Official Store</p>
        <h2 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-[-.045em] text-[#f3ecdf] sm:text-5xl">Digital services and products, ready to move your business forward.</h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#aaa08f]">Pesan layanan kreatif dan teknologi, atau beli produk digital langsung dari website Cyber Wealth. Ruang lingkup dan harga layanan dikonfirmasi sebelum pekerjaan dimulai. Produk berbayar dibuka setelah pembayaran terverifikasi.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/jasa" className="inline-flex items-center gap-2 bg-[#d5b879] px-5 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#15110a] hover:bg-[#ead6ac]">Jelajahi layanan <ArrowUpRight className="size-3.5"/></Link>
          <Link href="/toko" className="inline-flex items-center gap-2 border border-[#c7a66a]/50 px-5 py-3 text-[10px] font-semibold uppercase tracking-[.14em] text-[#e4c789] hover:bg-white/[.04]">Lihat produk <ArrowUpRight className="size-3.5"/></Link>
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4 border-b border-[#c7a66a]/20 pb-4">
          <div><p className="font-mono text-[9px] uppercase tracking-[.22em] text-[#c5a66a]">01 / Services</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#f3f0e9]">Hire Cyber Wealth</h2><p className="mt-2 max-w-2xl text-xs leading-6 text-[#a9a49a]">Pilih layanan, kirim brief, lalu tinjau penawaran sebelum menyetujui pekerjaan.</p></div>
          <Link href="/jasa" className="shrink-0 text-[10px] uppercase tracking-[.14em] text-[#d8bd83]">Semua layanan ↗</Link>
        </div>
        <ServiceCatalog services={services} isOwner={isOwner} />
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4 border-b border-[#c7a66a]/20 pb-4">
          <div><p className="font-mono text-[9px] uppercase tracking-[.22em] text-[#c5a66a]">02 / Digital store</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#f3f0e9]">Products available now</h2><p className="mt-2 max-w-2xl text-xs leading-6 text-[#a9a49a]">Pilih produk digital, selesaikan checkout di website, lalu akses berkas setelah pembayaran dikonfirmasi.</p></div>
          <Link href="/toko" className="shrink-0 text-[10px] uppercase tracking-[.14em] text-[#d8bd83]">Semua produk ↗</Link>
        </div>
        <ProductCatalog products={products} isOwner={isOwner} />
      </section>

      <section className="border border-[#c7a66a]/25 bg-[linear-gradient(110deg,#17130d,#0b0b09)] p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-mono text-[9px] uppercase tracking-[.22em] text-[#c5a66a]">03 / Exhibition & innovation</p><h2 className="mt-2 text-2xl font-semibold text-[#f3f0e9]">Lihat karya, produk, dan prototipe Cyber Wealth</h2><p className="mt-2 max-w-2xl text-xs leading-6 text-[#a9a49a]">Pameran publik berisi produk siap beli, eksplorasi teknologi, dan karya kreatif. Status setiap item ditampilkan dengan jelas.</p></div>
          <Link href="/pameran" className="inline-flex shrink-0 items-center gap-2 bg-[#d5b879] px-5 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#15110a]">Masuk pameran <ArrowUpRight className="size-3.5"/></Link>
        </div>
      </section>

      <section className="grid gap-4 border-t border-[#c7a66a]/20 pt-7 sm:grid-cols-2">
        <Link href="/marketplace" className="group border border-[#c7a66a]/20 bg-[#0d0c09] p-5 hover:border-[#c7a66a]/55"><Sparkles className="size-5 text-[#c5a66a]"/><h3 className="mt-4 text-sm font-semibold text-[#eee6d8]">Explore the marketplace</h3><p className="mt-2 text-xs leading-5 text-[#938b7d]">Lihat seluruh katalog layanan dan produk Cyber Wealth.</p><span className="mt-4 inline-flex items-center gap-2 text-[10px] uppercase tracking-[.14em] text-[#d8bd83]">Open marketplace <ArrowUpRight className="size-3.5"/></span></Link>
        <Link href="/kontak" className="group border border-[#c7a66a]/20 bg-[#0d0c09] p-5 hover:border-[#c7a66a]/55"><Package className="size-5 text-[#c5a66a]"/><h3 className="mt-4 text-sm font-semibold text-[#eee6d8]">Request a custom project</h3><p className="mt-2 text-xs leading-5 text-[#938b7d]">Jelaskan kebutuhan khusus yang belum tersedia di katalog.</p><span className="mt-4 inline-flex items-center gap-2 text-[10px] uppercase tracking-[.14em] text-[#d8bd83]">Contact the studio <ArrowUpRight className="size-3.5"/></span></Link>
      </section>
    </div>
  )
}

const Page = HomePage as PageWithFrame<Props>
Page.getLayout = (page) => <StoreFrame title="Cyber Wealth" variant="wide" eyebrow="Cyber Wealth / Official Store" intent="Belanja produk digital dan pesan layanan langsung melalui website resmi Cyber Wealth." description="Cyber Wealth official website — digital services and products.">{page}</StoreFrame>
export default Page
