import type { GetServerSideProps } from 'next'
import Link from 'next/link'
import { ArrowUpRight, Clapperboard, Film, Image as ImageIcon, Package, Sparkles } from 'lucide-react'
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

function MarketplacePage({ services, products, isOwner }: Props) {
  return (
    <div className="flex flex-col gap-14">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Link href="/jasa" className="group border border-[#b99a5b]/25 bg-[#101113] p-5 transition hover:border-[#c5a66a]/70">
          <Clapperboard className="size-5 text-[#c5a66a]" />
          <p className="mt-4 text-sm font-medium text-[#f3f0e9]">Creative & production services</p>
          <p className="mt-2 text-xs leading-6 text-[#a9a49a]">Video editing, motion graphics, iklan, desain, branding, dan produksi sesuai brief.</p>
          <span className="mt-4 inline-flex items-center gap-2 text-[10px] uppercase tracking-[.15em] text-[#d8bd83]">Jelajahi layanan <ArrowUpRight className="size-3.5" /></span>
        </Link>
        <Link href="/toko" className="group border border-[#b99a5b]/25 bg-[#101113] p-5 transition hover:border-[#c5a66a]/70">
          <Package className="size-5 text-[#c5a66a]" />
          <p className="mt-4 text-sm font-medium text-[#f3f0e9]">Digital products</p>
          <p className="mt-2 text-xs leading-6 text-[#a9a49a]">Template, toolkit, dokumen, video, audio, dan aset digital siap digunakan.</p>
          <span className="mt-4 inline-flex items-center gap-2 text-[10px] uppercase tracking-[.15em] text-[#d8bd83]">Buka katalog <ArrowUpRight className="size-3.5" /></span>
        </Link>
        <Link href="/media" className="group border border-[#b99a5b]/25 bg-[#101113] p-5 transition hover:border-[#c5a66a]/70">
          <Film className="size-5 text-[#c5a66a]" />
          <p className="mt-4 text-sm font-medium text-[#f3f0e9]">Media releases</p>
          <p className="mt-2 text-xs leading-6 text-[#a9a49a]">Katalog rilis video, motion, dan audio yang telah diterbitkan.</p>
          <span className="mt-4 inline-flex items-center gap-2 text-[10px] uppercase tracking-[.15em] text-[#d8bd83]">Jelajahi media <ArrowUpRight className="size-3.5" /></span>
        </Link>
        <Link href="/kreator" className="group border border-[#b99a5b]/25 bg-[#101113] p-5 transition hover:border-[#c5a66a]/70">
          <ImageIcon className="size-5 text-[#c5a66a]" />
          <p className="mt-4 text-sm font-medium text-[#f3f0e9]">Creator network</p>
          <p className="mt-2 text-xs leading-6 text-[#a9a49a]">Kapabilitas kreatif dan jalur produksi untuk kebutuhan konten dan kampanye.</p>
          <span className="mt-4 inline-flex items-center gap-2 text-[10px] uppercase tracking-[.15em] text-[#d8bd83]">Lihat creator studio <ArrowUpRight className="size-3.5" /></span>
        </Link>
        <Link href="/showroom" className="group border border-[#b99a5b]/25 bg-[#101113] p-5 transition hover:border-[#c5a66a]/70">
          <Sparkles className="size-5 text-[#c5a66a]" />
          <p className="mt-4 text-sm font-medium text-[#f3f0e9]">Private 3D showroom</p>
          <p className="mt-2 text-xs leading-6 text-[#a9a49a]">Ruang pamer digital untuk anggota yang memenuhi akses berbayar.</p>
          <span className="mt-4 inline-flex items-center gap-2 text-[10px] uppercase tracking-[.15em] text-[#d8bd83]">Periksa akses <ArrowUpRight className="size-3.5" /></span>
        </Link>
        <Link href="/harga" className="group border border-[#b99a5b]/25 bg-[#101113] p-5 transition hover:border-[#c5a66a]/70">
          <ArrowUpRight className="size-5 text-[#c5a66a]" />
          <p className="mt-4 text-sm font-medium text-[#f3f0e9]">Membership & access</p>
          <p className="mt-2 text-xs leading-6 text-[#a9a49a]">Lihat paket, manfaat, dan batas akses sebelum berlangganan.</p>
          <span className="mt-4 inline-flex items-center gap-2 text-[10px] uppercase tracking-[.15em] text-[#d8bd83]">Lihat paket <ArrowUpRight className="size-3.5" /></span>
        </Link>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4 border-b border-[#b99a5b]/20 pb-4">
          <div><p className="font-mono text-[10px] uppercase tracking-[.22em] text-[#c5a66a]">01 / Made to order</p><h2 className="mt-2 text-2xl font-medium tracking-tight text-[#f3f0e9]">Layanan kreatif & digital</h2><p className="mt-2 max-w-2xl text-xs leading-6 text-[#a9a49a]">Pilih layanan, buka detail, kirim brief. Tim meninjau kebutuhan dan mengirimkan penawaran sebelum pekerjaan dimulai.</p></div>
          <Link href="/jasa" className="hidden shrink-0 items-center gap-2 text-[10px] uppercase tracking-[.14em] text-[#d8bd83] sm:inline-flex">Semua layanan <ArrowUpRight className="size-3.5" /></Link>
        </div>
        <ServiceCatalog services={services} isOwner={isOwner} />
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4 border-b border-[#b99a5b]/20 pb-4">
          <div><p className="font-mono text-[10px] uppercase tracking-[.22em] text-[#c5a66a]">02 / Ready to use</p><h2 className="mt-2 text-2xl font-medium tracking-tight text-[#f3f0e9]">Produk digital</h2><p className="mt-2 max-w-2xl text-xs leading-6 text-[#a9a49a]">Produk yang sudah diterbitkan dan memiliki berkas serahan siap dipilih dari katalog.</p></div>
          <Link href="/toko" className="hidden shrink-0 items-center gap-2 text-[10px] uppercase tracking-[.14em] text-[#d8bd83] sm:inline-flex">Semua produk <ArrowUpRight className="size-3.5" /></Link>
        </div>
        <ProductCatalog products={products} isOwner={isOwner} />
      </section>

      <section className="border border-[#b99a5b]/25 bg-[#101113] p-6 sm:p-8">
        <div className="flex items-start gap-4"><Sparkles className="mt-1 size-5 shrink-0 text-[#c5a66a]" /><div><h2 className="text-lg font-medium text-[#f3f0e9]">Punya kebutuhan yang belum ada di katalog?</h2><p className="mt-2 max-w-2xl text-xs leading-6 text-[#a9a49a]">Kirim permintaan khusus. Tim akan meninjau ruang lingkup, tenggat, dan anggaran, lalu memberikan penawaran yang jelas. Pengiriman brief tidak otomatis menagih pembayaran.</p><Link href="/kontak" className="mt-5 inline-flex items-center gap-2 border border-[#c5a66a]/60 px-5 py-3 text-[10px] font-semibold uppercase tracking-[.15em] text-[#d8bd83] hover:bg-[#c5a66a] hover:text-[#101010]">Permintaan khusus <ArrowUpRight className="size-3.5" /></Link></div></div>
      </section>
    </div>
  )
}

const Page = MarketplacePage as PageWithFrame<Props>
Page.getLayout = (page) => (
  <StoreFrame
    eyebrow="Cyber Wealth / Marketplace"
    title="Pilih layanan. Temukan produk. Mulai proyek."
    intent="Satu tempat untuk memesan pekerjaan kreatif sesuai kebutuhan atau membeli produk digital yang sudah siap digunakan."
    variant="wide"
    description="Marketplace Cyber Wealth untuk video editing, desain grafis, layanan digital, dan produk digital siap pakai."
  >
    {page}
  </StoreFrame>
)
export default Page
