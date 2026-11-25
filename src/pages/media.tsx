import type { GetServerSideProps } from 'next'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Film, PlayCircle, Search, SlidersHorizontal } from 'lucide-react'
import { StoreFrame } from '@/components/StoreFrame'
import { ProductCard } from '@/components/ProductCard'
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
const filters = [{label:'Semua',value:'all'},{label:'Video',value:'video'},{label:'Motion',value:'motion'},{label:'Audio',value:'audio'}]
function MediaPage({ videos }: Props) {
  const [query,setQuery] = useState('')
  const [category,setCategory] = useState('all')
  const [sort,setSort] = useState('newest')
  const visible = useMemo(() => videos.filter((v) => {
    const matchesCategory = category === 'all' || v.category === category
    const q = query.trim().toLocaleLowerCase()
    return matchesCategory && (!q || [v.name,v.summary,v.category].join(' ').toLocaleLowerCase().includes(q))
  }).sort((a,b) => {
    if (sort === 'az') return a.name.localeCompare(b.name)
    if (sort === 'za') return b.name.localeCompare(a.name)
    if (sort === 'price-low') return a.priceIdr - b.priceIdr
    if (sort === 'price-high') return b.priceIdr - a.priceIdr
    return 0
  }),[videos,query,category,sort])
  const youtubeUrl = query.trim()
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`
    : 'https://www.youtube.com/results'
  return <div className="space-y-7">
    <section className="border border-[#b99a5b]/25 bg-[#101113] p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-[#c5a66a]"><Film className="size-5"/><span className="font-mono text-[10px] uppercase tracking-[.22em]">Cyber Wealth / Media releases</span></div><Link href="/studio" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[.14em] text-[#d8bd83]">Open production studio <ArrowUpRight className="size-3.5"/></Link></div>
      <h2 className="mt-5 text-3xl font-medium tracking-[-.04em] text-[#f3f0e9] sm:text-4xl">Video & media library</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[#aaa69e]">Temukan video, motion graphics, dan aset audio yang sudah diterbitkan. Cari berdasarkan judul atau deskripsi, lalu buka detail konten untuk melihat penawaran.</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label className="flex min-w-0 flex-1 items-center gap-3 border border-[#b99a5b]/35 bg-[#090907] px-4 py-3"><Search className="size-4 shrink-0 text-[#c5a66a]"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari judul atau topik di katalog Cyber Wealth..." aria-label="Cari media" className="w-full bg-transparent text-sm text-[#f3f0e9] outline-none placeholder:text-[#777166]"/></label>
        <label className="flex items-center gap-2 border border-[#b99a5b]/35 bg-[#090907] px-3 py-3 text-xs text-[#bdb5a6]"><SlidersHorizontal className="size-4 text-[#c5a66a]"/><span className="sr-only">Urutkan</span><select value={sort} onChange={e=>setSort(e.target.value)} className="bg-transparent outline-none"><option value="newest">Terbaru</option><option value="az">Nama A–Z</option><option value="za">Nama Z–A</option><option value="price-low">Harga terendah</option><option value="price-high">Harga tertinggi</option></select></label>
        <a href={youtubeUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#c5a66a]/45 bg-[#c5a66a]/10 px-4 py-3 text-[10px] font-semibold uppercase tracking-[.13em] text-[#e8ce9b] transition hover:bg-[#c5a66a]/20"><Search className="size-3.5"/> Cari di YouTube <ArrowUpRight className="size-3.5"/></a>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{filters.map(f=><button key={f.value} type="button" onClick={()=>setCategory(f.value)} aria-pressed={category===f.value} className={`border px-4 py-2 text-[10px] uppercase tracking-[.12em] transition ${category===f.value?'border-[#c5a66a] bg-[#c5a66a]/15 text-[#e8ce9b]':'border-white/10 text-[#aaa397] hover:border-[#c5a66a]/50'}`}>{f.label}</button>)}</div>
      {(query || category !== 'all' || sort !== 'newest') && <button type="button" onClick={() => { setQuery(''); setCategory('all'); setSort('newest') }} className="mt-3 border border-[#c5a66a]/35 px-3 py-2 text-[10px] uppercase tracking-[.12em] text-[#c5a66a] hover:bg-[#c5a66a]/10">Reset semua filter</button>}
    </section>
    <section>
      <div className="mb-4 flex items-center justify-between border-b border-[#b99a5b]/20 pb-3"><div><p className="font-mono text-[9px] uppercase tracking-[.2em] text-[#c5a66a]">Published library</p><h3 className="mt-1 text-lg font-medium text-[#f3f0e9]">Rilisan media</h3></div><span className="text-[10px] text-[#8f887c]">{visible.length} konten</span></div>
      {visible.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map(video=><ProductCard key={video.slug} product={video}/>)}</div> : <div className="border border-dashed border-[#b99a5b]/30 bg-[#101113] px-6 py-12 text-center"><PlayCircle className="mx-auto size-7 text-[#c5a66a]"/><h3 className="mt-4 text-lg font-medium text-[#f3f0e9]">{videos.length ? 'Konten tidak ditemukan' : 'Belum ada video yang dirilis'}</h3><p className="mx-auto mt-2 max-w-lg text-xs leading-6 text-[#9e998f]">{videos.length ? 'Coba kata kunci atau kategori lain.' : 'Rilisan akan tampil setelah file final diunggah, hak penggunaannya diperiksa, dan produk diterbitkan owner.'}</p>{videos.length>0 && <button type="button" onClick={()=>{setQuery('');setCategory('all')}} className="mt-4 border border-[#c5a66a]/50 px-4 py-2 text-[10px] uppercase tracking-[.12em] text-[#d8bd83]">Reset pencarian</button>}</div>}
    </section>
  </div>
}
const Page = MediaPage as PageWithFrame<Props>
Page.getLayout = (page) => <StoreFrame eyebrow="Creator & Media / Releases" title="Video & media library" intent="Jelajahi rilis video dan aset media Cyber Wealth." variant="wide" description="Cyber Wealth video releases and searchable creative media library.">{page}</StoreFrame>
export default Page
