import type { GetServerSideProps } from 'next'
import Link from 'next/link'
import { ArrowUpRight, Cpu, Layers3, MonitorPlay, Package, Sparkles, Wrench } from 'lucide-react'
import { StoreFrame } from '@/components/StoreFrame'
import { getStoreProducts } from '@/lib/revenue'
import type { PageWithFrame } from '@/lib/frame'

type Product = { slug: string; name: string; summary: string; category: string; priceIdr: number }
type Props = { products: Product[] }

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const rows = await getStoreProducts()
  return { props: { products: rows.map(row => ({ slug: row.slug, name: row.name, summary: row.summary, category: row.category, priceIdr: Number(row.priceIdr) })) } }
}

const labs = [
  { name: 'AI Workflow Systems', tag: 'PROTOTYPE CONCEPT', text: 'Rancangan otomasi alur kerja untuk riset, administrasi, produksi konten, dan pelaporan. Status prototipe; belum ditawarkan sebagai produk siap pakai.', icon: Cpu },
  { name: 'Interactive Web Experiences', tag: 'DESIGN LAB', text: 'Eksperimen antarmuka web interaktif, dashboard, dan pengalaman digital untuk kebutuhan bisnis.', icon: MonitorPlay },
  { name: 'Digital Product Studio', tag: 'IN DEVELOPMENT', text: 'Pengembangan toolkit, template, kalkulator, dan aplikasi kecil yang bisa langsung digunakan pelanggan.', icon: Wrench },
  { name: 'Creative & Motion Works', tag: 'SHOWCASE CATEGORY', text: 'Ruang kurasi konsep desain, video, motion graphic, identitas visual, dan aset media Cyber Wealth.', icon: Layers3 },
]

function ExhibitionPage({ products }: Props) {
  return <div className="space-y-12">
    <section className="border border-[#c7a66a]/25 bg-[radial-gradient(ellipse_at_80%_10%,rgba(190,151,79,.18),transparent_42%),linear-gradient(120deg,#17130d,#090907_65%)] px-6 py-10 sm:px-10">
      <p className="font-mono text-[9px] uppercase tracking-[.28em] text-[#c9a96d]">Cyber Wealth / Exhibition Hall</p>
      <h2 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-[-.04em] text-[#f3ecdf] sm:text-5xl">Produk nyata. Eksperimen teknologi. Karya kreatif.</h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-[#aaa08f]">Lihat produk yang sudah tersedia untuk dibeli dan proyek yang sedang dieksplorasi. Setiap item diberi status yang jelas agar pengunjung tahu mana yang siap digunakan dan mana yang masih berupa konsep.</p>
      <div className="mt-7 flex flex-wrap gap-3"><Link href="/toko" className="bg-[#d5b879] px-5 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#15110a]">Belanja produk <ArrowUpRight className="ml-2 inline size-3.5"/></Link><Link href="/kontak" className="border border-[#c7a66a]/50 px-5 py-3 text-[10px] font-semibold uppercase tracking-[.14em] text-[#e4c789]">Ajukan proyek</Link></div>
    </section>
    <section>
      <div className="mb-5 border-b border-[#c7a66a]/20 pb-4"><p className="font-mono text-[9px] uppercase tracking-[.22em] text-[#c5a66a]">01 / Available products</p><h2 className="mt-2 text-2xl font-semibold text-[#f3f0e9]">Etalase produk siap beli</h2><p className="mt-2 text-xs leading-6 text-[#a9a49a]">Hanya item berstatus terbit yang ditarik dari katalog toko.</p></div>
      {products.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{products.map(product => <article key={product.slug} className="flex flex-col border border-[#c7a66a]/20 bg-[#0d0c09] p-5"><div className="flex items-center justify-between gap-3"><Package className="size-5 text-[#c5a66a]"/><span className="text-[9px] uppercase tracking-[.16em] text-emerald-300">Ready to purchase</span></div><h3 className="mt-5 text-base font-semibold text-[#eee6d8]">{product.name}</h3><p className="mt-2 flex-1 text-xs leading-6 text-[#a9a49a]">{product.summary}</p><div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4"><span className="text-sm font-semibold text-[#e4c789]">{product.priceIdr > 0 ? new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(product.priceIdr) : 'Gratis'}</span><Link href={'/toko/' + product.slug} className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[.14em] text-[#d8bd83]">Detail & beli <ArrowUpRight className="size-3.5"/></Link></div></article>)}</div> : <p className="border border-white/10 p-6 text-sm text-slate-400">Belum ada produk terbit.</p>}
    </section>
    <section>
      <div className="mb-5 border-b border-[#c7a66a]/20 pb-4"><p className="font-mono text-[9px] uppercase tracking-[.22em] text-[#c5a66a]">02 / Research & development</p><h2 className="mt-2 text-2xl font-semibold text-[#f3f0e9]">Technology & creative lab</h2><p className="mt-2 text-xs leading-6 text-[#a9a49a]">Pameran arah pengembangan. Label status bukan klaim bahwa prototipe sudah bisa dibeli atau digunakan.</p></div>
      <div className="grid gap-3 md:grid-cols-2">{labs.map(item => { const Icon = item.icon; return <article key={item.name} className="border border-[#c7a66a]/20 bg-[#0d0c09] p-5"><div className="flex items-center justify-between gap-3"><Icon className="size-5 text-[#c5a66a]"/><span className="border border-[#c7a66a]/30 px-2 py-1 font-mono text-[8px] tracking-[.12em] text-[#d8bd83]">{item.tag}</span></div><h3 className="mt-5 text-base font-semibold text-[#eee6d8]">{item.name}</h3><p className="mt-2 text-xs leading-6 text-[#a9a49a]">{item.text}</p></article> })}</div>
    </section>
    <section className="border border-[#c7a66a]/25 bg-[#10100d] p-6 sm:p-8"><Sparkles className="size-5 text-[#c5a66a]"/><h2 className="mt-4 text-lg font-semibold text-[#f3f0e9]">Punya kebutuhan khusus?</h2><p className="mt-2 max-w-2xl text-xs leading-6 text-[#a9a49a]">Kirim kebutuhan teknologi, desain, media, atau produksi. Cyber Wealth akan meninjau ruang lingkup dan mengirim proposal sebelum ada komitmen biaya.</p><Link href="/kontak" className="mt-5 inline-flex items-center gap-2 bg-[#d5b879] px-5 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#15110a]">Mulai permintaan <ArrowUpRight className="size-3.5"/></Link></section>
  </div>
}

const Page = ExhibitionPage as PageWithFrame<Props>
Page.getLayout = (page) => <StoreFrame title="Pameran Cyber Wealth" variant="wide" eyebrow="Cyber Wealth / Exhibition Hall" intent="Etalase produk siap beli dan pameran riset teknologi serta karya kreatif." description="Pameran publik Cyber Wealth.">{page}</StoreFrame>
export default Page
