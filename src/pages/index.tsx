import type { GetServerSideProps } from 'next'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight, Bot, Clapperboard, Code2, Gem, Layers3, Palette, Play, Sparkles, Workflow } from 'lucide-react'
import { StoreFrame } from '@/components/StoreFrame'
import { PageStack } from '@/components/ui'
import type { PageWithFrame } from '@/lib/frame'

// Halaman utama selalu menjadi situs publik, termasuk saat pemilik sedang login.
export const getServerSideProps: GetServerSideProps = async () => ({ props: {} })

const divisions = [
  { n: '01', title: 'Creator & Media', desc: 'Produksi video, editing, motion graphics, dan konten untuk kanal digital.', href: '/kreator', label: 'Jelajahi media', icon: Clapperboard, tag: 'MEDIA' },
  { n: '02', title: 'Creative Studio', desc: 'Identitas brand, desain grafis, visual produk, dan materi kampanye.', href: '/jasa', label: 'Lihat layanan', icon: Palette, tag: 'DESIGN' },
  { n: '03', title: 'Digital Products', desc: 'Template dan aset digital siap digunakan dengan akses setelah pembayaran.', href: '/toko', label: 'Buka katalog', icon: Layers3, tag: 'DOWNLOADS' },
  { n: '04', title: 'Technology & AI', desc: 'Website, aplikasi, integrasi sistem, dan solusi otomasi berbasis AI.', href: '/marketplace', label: 'Temukan solusi', icon: Bot, tag: 'TECHNOLOGY' },
  { n: '05', title: 'Innovation Lab', desc: 'Eksplorasi konsep produk, visualisasi 3D, dan pengembangan digital.', href: '/showroom', label: 'Masuk studio', icon: Workflow, tag: 'INNOVATION' },
  { n: '06', title: 'Talent Network', desc: 'Kolaborasi proyek bersama editor, desainer, kreator, dan talenta teknologi.', href: '/karier', label: 'Gabung jaringan', icon: Gem, tag: 'NETWORK' },
]

function HomePage() {
  return <PageStack>
    <section className="relative isolate overflow-hidden rounded-[28px] border border-[#b99b68]/25 bg-[#0d1117] shadow-[0_28px_90px_rgba(0,0,0,.28)]">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_78%_28%,rgba(191,157,99,.18),transparent_34%),radial-gradient(ellipse_at_18%_100%,rgba(48,91,91,.16),transparent_42%),linear-gradient(125deg,#15191e,#090d12_68%)]"/>
      <div className="absolute inset-0 -z-10 opacity-[.13]" style={{backgroundImage:'linear-gradient(rgba(205,177,124,.35) 1px, transparent 1px),linear-gradient(90deg,rgba(205,177,124,.35) 1px,transparent 1px)',backgroundSize:'54px 54px',maskImage:'linear-gradient(90deg,transparent,black 60%)'}}/>
      <div className="absolute -right-28 top-8 -z-10 size-[440px] rounded-full border border-[#c5a66a]/15"/><div className="absolute -right-8 top-28 -z-10 size-[290px] rounded-full border border-[#c5a66a]/20"/><div className="absolute right-[7.5rem] top-[13rem] -z-10 size-28 rounded-full bg-[#c5a66a]/10 blur-3xl"/>
      <div className="grid min-h-[510px] items-center gap-12 px-7 py-12 sm:px-12 lg:grid-cols-[1.2fr_.8fr] lg:px-[4.5rem] lg:py-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#c5a66a]/30 bg-[#c5a66a]/[.07] px-3 py-2 font-mono text-[9px] tracking-[.19em] text-[#d7bd89]"><span className="size-1.5 rounded-full bg-[#c5a66a] shadow-[0_0_12px_#c5a66a]"/> INDEPENDENT DIGITAL COMPANY</div>
          <h2 className="mt-8 text-[clamp(3.1rem,6.8vw,6.1rem)] font-medium leading-[.91] tracking-[-.075em] text-[#f4f0e8]">Build what<br/>comes <span className="font-serif italic font-normal text-[#c8ad78]">next.</span></h2>
          <p className="mt-7 max-w-xl text-[13px] leading-7 text-[#a9a69f] sm:text-[15px]">Satu ekosistem untuk karya kreatif, produksi media, produk digital, dan teknologi. Dari kebutuhan sederhana hingga proyek digital yang lebih kompleks.</p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/marketplace" className="group inline-flex items-center gap-3 rounded-sm bg-[#c5a66a] px-6 py-4 text-[10px] font-bold uppercase tracking-[.16em] text-[#11130f] transition hover:bg-[#e0c58d]">Explore offerings <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/></Link>
            <Link href="/kontak" className="inline-flex items-center gap-2 px-4 py-4 text-[10px] font-semibold uppercase tracking-[.15em] text-[#ded9ce] transition hover:text-[#d9bd83]">Discuss a project <ArrowRight className="size-3.5"/></Link>
          </div>
          <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/10 pt-6 text-[9px] uppercase tracking-[.16em] text-[#777b7d]"><span>Creative production</span><span>Digital commerce</span><span>Technology & AI</span></div>
        </div>
        <div className="hidden lg:block">
          <div className="relative mx-auto aspect-[.84] max-w-[370px] overflow-hidden rounded-[190px_190px_18px_18px] border border-[#c5a66a]/30 bg-[linear-gradient(155deg,rgba(197,166,106,.15),rgba(16,22,27,.3)_48%,rgba(7,11,15,.9))] p-5">
            <div className="absolute inset-x-8 top-8 bottom-8 rounded-[180px_180px_12px_12px] border border-[#c5a66a]/20"/>
            <div className="absolute left-1/2 top-[22%] h-[48%] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#c5a66a]/60 to-transparent"/>
            <div className="absolute left-[20%] right-[20%] top-1/2 h-px bg-gradient-to-r from-transparent via-[#c5a66a]/60 to-transparent"/>
            <div className="absolute left-1/2 top-1/2 flex size-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#d1b77f]/35 bg-[#11171c]/80 shadow-[0_0_80px_rgba(197,166,106,.14)]"><span className="font-serif text-5xl italic text-[#d4b982]">CW</span></div>
            <div className="absolute left-8 top-[24%]"><p className="font-mono text-[9px] tracking-[.2em] text-[#c5a66a]">01 / CREATE</p><p className="mt-2 text-[11px] text-[#d7d4cc]">Ideas into form</p></div>
            <div className="absolute bottom-[23%] right-8 text-right"><p className="font-mono text-[9px] tracking-[.2em] text-[#c5a66a]">02 / BUILD</p><p className="mt-2 text-[11px] text-[#d7d4cc]">Systems that work</p></div>
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[8px] tracking-[.28em] text-[#817b6c]">DESIGN · TECHNOLOGY · MEDIA</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 border-t border-[#c5a66a]/20 sm:grid-cols-4">{[{a:'01',b:'Create'},{a:'02',b:'Produce'},{a:'03',b:'Build'},{a:'04',b:'Innovate'}].map(x=><div key={x.a} className="flex items-center gap-3 border-r border-[#c5a66a]/15 px-6 py-5 last:border-r-0 sm:px-8"><span className="font-mono text-[9px] text-[#c5a66a]">{x.a}</span><span className="text-[11px] tracking-wide text-[#c8c4bb]">{x.b}</span></div>)}</div>
    </section>

    <section className="pt-5">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="font-mono text-[9px] uppercase tracking-[.24em] text-[#c5a66a]">The ecosystem</p><h3 className="mt-3 text-3xl font-medium tracking-[-.055em] text-[#f1eee7] sm:text-[2.6rem]">One company. Many capabilities.</h3><p className="mt-3 max-w-2xl text-xs leading-6 text-[#8f969d]">Pilih jalur sesuai kebutuhan. Setiap penawaran memiliki ruang lingkup dan harga yang ditampilkan sebelum Anda memesan.</p></div><Link href="/marketplace" className="inline-flex shrink-0 items-center gap-2 text-[10px] font-semibold uppercase tracking-[.15em] text-[#d3b77f] hover:text-[#f1d8a6]">View all offerings <ArrowUpRight className="size-3.5"/></Link></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{divisions.map(({n,title,desc,href,label,icon:Icon,tag})=><Link key={n} href={href} className="group relative min-h-[220px] overflow-hidden rounded-xl border border-white/[.085] bg-[linear-gradient(145deg,#151a20,#0d1117)] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#c5a66a]/45 hover:shadow-[0_18px_45px_rgba(0,0,0,.22)]"><div className="absolute -right-10 -top-12 size-36 rounded-full border border-white/[.045] transition group-hover:border-[#c5a66a]/20"/><div className="relative flex items-center justify-between"><span className="flex size-10 items-center justify-center rounded-lg border border-[#c5a66a]/25 bg-[#c5a66a]/[.07] text-[#c9ae7b]"><Icon className="size-[18px]"/></span><span className="font-mono text-[9px] tracking-[.18em] text-[#626c76]">{tag} / {n}</span></div><h4 className="relative mt-7 text-[17px] font-medium tracking-[-.02em] text-[#eeeae2]">{title}</h4><p className="relative mt-2 min-h-[42px] max-w-sm text-[11px] leading-6 text-[#9299a0]">{desc}</p><span className="relative mt-5 inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.15em] text-[#cbb27f]">{label}<ArrowUpRight className="size-3 transition group-hover:translate-x-1 group-hover:-translate-y-1"/></span></Link>)}</div>
    </section>

    <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="relative overflow-hidden rounded-2xl border border-[#c5a66a]/25 bg-[radial-gradient(ellipse_at_100%_0%,rgba(197,166,106,.14),transparent_48%),#11161c] p-7 sm:p-9"><div className="flex items-center gap-2 font-mono text-[9px] tracking-[.2em] text-[#c5a66a]"><Code2 className="size-4"/> FOR CLIENTS</div><h3 className="mt-5 max-w-md text-2xl font-medium tracking-[-.04em] text-[#f0ede6]">Bring the brief.<br/><span className="font-serif italic font-normal text-[#c8ad78]">We shape the work.</span></h3><p className="mt-4 max-w-md text-xs leading-6 text-[#9da2a6]">Temukan layanan dan produk yang tersedia. Untuk kebutuhan khusus, kirim brief agar tim dapat meninjau ruang lingkup, biaya, dan waktu pengerjaan.</p><Link href="/kontak" className="mt-7 inline-flex items-center gap-2 border-b border-[#c5a66a]/60 pb-2 text-[10px] font-bold uppercase tracking-[.15em] text-[#d5bc8b]">Start a project <ArrowRight className="size-3.5"/></Link></div>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_100%_0%,rgba(83,127,128,.16),transparent_48%),#11161c] p-7 sm:p-9"><div className="flex items-center gap-2 font-mono text-[9px] tracking-[.2em] text-[#91b9b1]"><Sparkles className="size-4"/> FOR CREATORS & PARTNERS</div><h3 className="mt-5 max-w-md text-2xl font-medium tracking-[-.04em] text-[#f0ede6]">Good work is<br/><span className="font-serif italic font-normal text-[#9fc2b8]">built together.</span></h3><p className="mt-4 max-w-md text-xs leading-6 text-[#9da2a6]">Editor, filmmaker, desainer, animator, dan talenta teknologi dapat mengirim portofolio untuk dipertimbangkan pada proyek yang relevan.</p><Link href="/karier" className="mt-7 inline-flex items-center gap-2 border-b border-[#91b9b1]/60 pb-2 text-[10px] font-bold uppercase tracking-[.15em] text-[#a8c9c0]">Join talent network <ArrowRight className="size-3.5"/></Link></div>
    </section>

    <section className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-[#0d1218] p-7 sm:flex-row sm:items-center sm:justify-between sm:p-9"><div><p className="font-mono text-[9px] uppercase tracking-[.22em] text-[#c5a66a]">A direct conversation</p><h3 className="mt-3 text-xl font-medium tracking-[-.035em] text-[#eeeae2]">Have something ambitious in mind?</h3><p className="mt-2 max-w-xl text-xs leading-6 text-[#8f969d]">Ceritakan tujuan Anda. Kami akan membantu menentukan jalur layanan yang paling sesuai.</p></div><Link href="/kontak" className="inline-flex shrink-0 items-center justify-center gap-3 rounded-sm border border-[#c5a66a]/50 px-6 py-4 text-[10px] font-bold uppercase tracking-[.15em] text-[#d5bc8b] transition hover:bg-[#c5a66a] hover:text-[#11130f]">Contact Cyber Wealth <ArrowUpRight className="size-4"/></Link></section>
  </PageStack>
}

const Page = HomePage as PageWithFrame
Page.getLayout = (page) => <StoreFrame eyebrow="Cyber Wealth / Official website" title="A connected digital ecosystem." intent="Creative production, creator services, technology, AI, digital products, and product innovation in one ecosystem." variant="wide" description="Cyber Wealth — creative, media, technology, AI and digital products.">{page}</StoreFrame>
export default Page
