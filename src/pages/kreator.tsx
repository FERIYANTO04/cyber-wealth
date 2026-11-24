import Link from 'next/link'
import { ArrowUpRight, Clapperboard, Film, Mic2, Palette, PlayCircle, Video } from 'lucide-react'
import { StoreFrame } from '@/components/StoreFrame'
import { PageStack } from '@/components/ui'
import type { PageWithFrame } from '@/lib/frame'

const offers = [
  { title: 'Video Editing', desc: 'Editing short-form dan long-form, pacing, subtitle, sound cleanup, color, dan format platform.', icon: Film },
  { title: 'Video Production', desc: 'Konsep, naskah, storyboard, arahan visual, dan produksi video berdasarkan brief.', icon: Video },
  { title: 'Motion & Visual Effects', desc: 'Motion graphics, animasi 2D, title sequence, dan elemen visual untuk konten.', icon: PlayCircle },
  { title: 'Creator Content', desc: 'Paket konten kreator, potongan video, thumbnail, caption, dan materi distribusi.', icon: Mic2 },
  { title: 'Brand & Design', desc: 'Identitas visual, key visual, thumbnail, poster, dan aset kampanye.', icon: Palette },
  { title: 'Campaign & Story', desc: 'Konsep serial, video promosi, storytelling brand, dan kalender publikasi.', icon: Clapperboard },
]
function CreatorPage() {
  return <PageStack>
    <section className="border border-[#b99a5b]/25 bg-[#101113] p-7 sm:p-10">
      <p className="font-mono text-[10px] uppercase tracking-[.22em] text-[#c5a66a]">Cyber Wealth · Creator & Media</p>
      <h2 className="mt-4 max-w-3xl text-4xl font-medium leading-tight tracking-[-.05em] text-[#f3f0e9] sm:text-5xl">Stories worth watching.<br/><span className="text-[#c5a66a]">Content built to move.</span></h2>
      <p className="mt-5 max-w-2xl text-sm leading-7 text-[#aaa69e]">Pusat layanan kreator dan produksi media untuk brand, bisnis, dan individu. Pilih layanan yang tersedia atau kirim brief untuk proyek khusus.</p>
      <div className="mt-7 flex flex-wrap gap-3"><Link href="/jasa" className="inline-flex items-center gap-2 bg-[#c5a66a] px-5 py-3 text-[10px] font-semibold uppercase tracking-[.15em] text-[#101010]">Pesan produksi <ArrowUpRight className="size-4"/></Link><Link href="/karier" className="inline-flex items-center gap-2 border border-white/20 px-5 py-3 text-[10px] font-semibold uppercase tracking-[.15em] text-[#e9e5db]">Jadi kreator <ArrowUpRight className="size-4"/></Link></div>
    </section>
    <section><div className="mb-5"><p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#c5a66a]">Capabilities</p><h3 className="mt-2 text-2xl font-medium text-[#f3f0e9]">Creator & production services</h3></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{offers.map(({title,desc,icon:Icon})=><article key={title} className="border border-[#b99a5b]/25 bg-[#101113] p-5"><Icon className="size-5 text-[#c5a66a]"/><h4 className="mt-4 text-base font-medium text-[#f3f0e9]">{title}</h4><p className="mt-2 text-xs leading-6 text-[#a9a49a]">{desc}</p></article>)}</div></section>
    <section className="grid gap-6 border border-[#b99a5b]/25 bg-[#101113] p-7 sm:grid-cols-2 sm:p-9"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#c5a66a]">For clients</p><h3 className="mt-3 text-xl font-medium text-[#f3f0e9]">Start a production request</h3><p className="mt-2 text-xs leading-6 text-[#aaa69e]">Lihat layanan yang telah diterbitkan, detail ruang lingkup dan harga awal. Penawaran final mengikuti brief dan konfirmasi tertulis.</p><Link href="/jasa" className="mt-5 inline-flex items-center gap-2 text-[10px] uppercase tracking-[.14em] text-[#d8bd83]">Lihat layanan <ArrowUpRight className="size-3.5"/></Link></div><div className="border-t border-[#c5a66a]/20 pt-6 sm:border-l sm:border-t-0 sm:pl-7 sm:pt-0"><p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#c5a66a]">For creators</p><h3 className="mt-3 text-xl font-medium text-[#f3f0e9]">Show your portfolio</h3><p className="mt-2 text-xs leading-6 text-[#aaa69e]">Kirim profil dan portofolio untuk masuk jaringan talenta. Pengiriman profil bukan jaminan kontrak; setiap proyek ditinjau sesuai kebutuhan.</p><Link href="/karier" className="mt-5 inline-flex items-center gap-2 text-[10px] uppercase tracking-[.14em] text-[#d8bd83]">Kirim portofolio <ArrowUpRight className="size-3.5"/></Link></div></section>
  </PageStack>
}
const Page = CreatorPage as PageWithFrame
Page.getLayout = (page) => <StoreFrame eyebrow="Creator & Media" title="Creator network and production studio" intent="Video editing, production, motion design, and creator services." variant="wide" description="Cyber Wealth Creator & Media production services.">{page}</StoreFrame>
export default Page
