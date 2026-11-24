import type { GetServerSideProps } from 'next'
import Link from 'next/link'
import {
  ArrowRight, ArrowUpRight, Bot, Clapperboard, Code2, Compass,
  Layers3, Network, Package, ShieldCheck, Sparkles, Workflow,
} from 'lucide-react'
import { StoreFrame } from '@/components/StoreFrame'
import { PageStack } from '@/components/ui'
import { getSession } from '@/lib/auth'
import { getPublishedServices } from '@/lib/services'
import { getStoreProducts } from '@/lib/revenue'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getSession(ctx.req)
  if (session) return { redirect: { destination: '/owner', permanent: false } }
  const [services, products] = await Promise.all([getPublishedServices(), getStoreProducts()])
  return { props: { serviceCount: services.length, productCount: products.length } }
}

type Props = { serviceCount: number; productCount: number }

const ecosystems = [
  {
    number: '01', title: 'Product Studio', tag: 'CREATIVE & COMMERCE',
    description: 'Desain, video, konten, produk digital, dan hasil kerja kreatif yang dapat dipilih klien.',
    icon: Clapperboard, href: '/marketplace',
  },
  {
    number: '02', title: 'Technology', tag: 'SOFTWARE & SYSTEMS',
    description: 'Website, aplikasi, sistem bisnis, integrasi, dan solusi teknologi untuk kebutuhan nyata.',
    icon: Code2, href: '/marketplace',
  },
  {
    number: '03', title: 'AI', tag: 'INTELLIGENCE & AUTOMATION',
    description: 'Layanan berbantuan AI, otomatisasi alur kerja, dan agen digital untuk mempercepat pekerjaan.',
    icon: Bot, href: '/marketplace',
  },
  {
    number: '04', title: 'Drama', tag: 'STORY & ENTERTAINMENT',
    description: 'Produksi cerita, video, serial pendek, dan pengalaman hiburan digital.',
    icon: Sparkles, href: '/marketplace',
  },
]

function HomePage({ serviceCount, productCount }: Props) {
  return (
    <PageStack>
      <section className="relative isolate overflow-hidden rounded-[28px] border border-white/[.09] bg-[#0b1420]">
        <div className="pointer-events-none absolute inset-0 -z-10" style={{backgroundImage:'radial-gradient(circle at 78% 24%, rgba(62,171,224,.20), transparent 34%), radial-gradient(circle at 12% 90%, rgba(76,113,172,.14), transparent 36%), linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)',backgroundSize:'auto, auto, 54px 54px, 54px 54px'}} />
        <div className="relative grid items-center gap-7 px-4 py-8 sm:gap-10 sm:px-10 sm:py-12 lg:min-h-[500px] lg:grid-cols-[1.1fr_.9fr] lg:px-14 lg:py-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#6dcfff]/25 bg-[#6dcfff]/[.08] px-3 py-2 font-mono text-[9px] font-semibold tracking-[.18em] text-[#8bd9ff]">
              <span className="size-1.5 rounded-full bg-[#73d4ff] shadow-[0_0_12px_#73d4ff]" />
              GLOBAL DIGITAL ECOSYSTEM
            </div>
            <h2 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-.06em] text-white sm:mt-7 sm:text-6xl lg:text-[72px]">
              One platform.<br />
              <span className="bg-gradient-to-r from-[#8bd9ff] via-[#b7dfff] to-[#8a9dff] bg-clip-text text-transparent">Multiple economies.</span>
            </h2>
            <p className="mt-5 max-w-xl text-xs leading-6 text-[#a8b8c9] sm:mt-7 sm:text-base sm:leading-7">
              Cyber Wealth menghubungkan layanan kreatif, teknologi, AI, produk digital, dan hiburan dalam satu tempat. Temukan solusi, pilih layanan, kelola pesanan, dan berkembang melalui satu akun.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/marketplace" className="inline-flex items-center gap-3 rounded-xl bg-[#80d4ff] px-5 py-4 text-[10px] font-bold uppercase tracking-[.14em] text-[#07111a] transition hover:bg-[#b0e5ff]">
                Explore ecosystem <ArrowUpRight className="size-4" />
              </Link>
              <Link href="/masuk" className="inline-flex items-center gap-3 rounded-xl border border-white/15 bg-white/[.035] px-5 py-4 text-[10px] font-semibold uppercase tracking-[.14em] text-white transition hover:border-[#80d4ff]/50 hover:bg-white/[.07]">
                Client sign in <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-[10px] text-[#8195a9]">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="size-3.5 text-[#80d4ff]" /> One account</span>
              <span className="inline-flex items-center gap-2"><Network className="size-3.5 text-[#80d4ff]" /> Connected services</span>
              <span className="inline-flex items-center gap-2"><Workflow className="size-3.5 text-[#80d4ff]" /> Unified workflow</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[470px]">
            <div className="absolute inset-8 rounded-full bg-[#48bfff]/10 blur-3xl" />
            <div className="relative rounded-[26px] border border-[#8bd9ff]/20 bg-[#0d1a29]/90 p-5 shadow-[0_30px_100px_rgba(0,0,0,.35)] backdrop-blur-xl sm:p-6">
              <div className="flex items-center justify-between border-b border-white/[.08] pb-4">
                <div><p className="font-mono text-[9px] tracking-[.2em] text-[#80d4ff]">CYBER WEALTH</p><p className="mt-1 text-sm font-semibold text-white">Ecosystem overview</p></div>
                <span className="rounded-full border border-[#80d4ff]/20 bg-[#80d4ff]/[.08] px-2.5 py-1 font-mono text-[8px] tracking-wider text-[#8bd9ff]">CONNECTED</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {ecosystems.map(({number,title,tag,icon:Icon}) => (
                  <div key={number} className="rounded-2xl border border-white/[.08] bg-white/[.035] p-4 transition hover:border-[#80d4ff]/35 hover:bg-[#80d4ff]/[.05]">
                    <div className="flex items-center justify-between"><Icon className="size-5 text-[#80d4ff]" /><span className="font-mono text-[9px] text-[#637d94]">{number}</span></div>
                    <p className="mt-5 text-sm font-semibold text-white">{title}</p>
                    <p className="mt-1 text-[8px] tracking-[.12em] text-[#7891a8]">{tag}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-2xl border border-[#80d4ff]/15 bg-gradient-to-r from-[#17344a] to-[#18233a] p-4">
                <div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-xl bg-[#80d4ff]/10 text-[#80d4ff]"><Network className="size-4" /></div><div><p className="text-xs font-semibold text-white">One connected platform</p><p className="mt-1 text-[10px] text-[#8da5ba]">Discover · Order · Manage · Grow</p></div><ArrowUpRight className="ml-auto size-4 text-[#80d4ff]" /></div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-4 hidden rounded-xl border border-white/10 bg-[#142335] px-4 py-3 shadow-xl sm:block"><p className="font-mono text-[8px] tracking-[.16em] text-[#80d4ff]">PLATFORM MODEL</p><p className="mt-1 text-xs font-semibold text-white">One account. One ecosystem.</p></div>
          </div>
        </div>
        <div className="relative grid grid-cols-2 border-t border-white/[.08] bg-black/10 sm:grid-cols-4">
          {[
            {value:String(serviceCount),label:'Published services'},
            {value:String(productCount),label:'Digital products'},
            {value:'01',label:'Connected platform'},
            {value:'24/7',label:'Digital access'},
          ].map((item,i)=><div key={item.label} className="border-r border-white/[.07] px-5 py-5 last:border-r-0 sm:px-7"><p className="text-2xl font-semibold tracking-tight text-white">{item.value}</p><p className="mt-1 text-[9px] uppercase tracking-[.13em] text-[#8195a9]">{item.label}</p></div>)}
        </div>
      </section>

      <section className="pt-5">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="font-mono text-[9px] tracking-[.2em] text-[#80d4ff]">THE ECOSYSTEM / 01—04</p><h3 className="mt-3 text-3xl font-semibold tracking-[-.045em] text-white sm:text-4xl">Explore what you can build.</h3><p className="mt-3 max-w-2xl text-xs leading-6 text-slate-400">Empat pintu utama menuju layanan dan pengalaman di dalam Cyber Wealth.</p></div>
          <Link href="/marketplace" className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.13em] text-[#80d4ff] hover:text-white">Open marketplace <ArrowUpRight className="size-3.5" /></Link>
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {ecosystems.map(({number,title,tag,description,icon:Icon,href}) => (
            <Link key={number} href={href} className="group min-w-0 rounded-2xl border border-white/[.09] bg-[#0d131d] p-3 transition duration-200 hover:-translate-y-1 hover:border-[#80d4ff]/35 hover:bg-[#111e2d] sm:p-5">
              <div className="flex items-center justify-between"><div className="flex size-11 items-center justify-center rounded-xl border border-[#80d4ff]/15 bg-[#80d4ff]/[.07] text-[#80d4ff]"><Icon className="size-5" /></div><span className="font-mono text-[9px] text-slate-600">{number}</span></div>
              <p className="mt-4 text-base font-semibold tracking-tight text-white sm:mt-6 sm:text-lg">{title}</p>
              <p className="mt-1 font-mono text-[8px] tracking-[.13em] text-[#80d4ff]">{tag}</p>
              <p className="mt-3 text-[10px] leading-5 text-slate-400 sm:mt-4 sm:min-h-[72px] sm:text-xs sm:leading-6">{description}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.12em] text-slate-300 group-hover:text-[#80d4ff]">Explore <ArrowUpRight className="size-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
        <div className="rounded-2xl border border-white/[.09] bg-[#0d131d] p-6 sm:p-8">
          <p className="font-mono text-[9px] tracking-[.2em] text-[#80d4ff]">ONE ACCOUNT / ONE WORKSPACE</p>
          <h3 className="mt-3 max-w-lg text-2xl font-semibold leading-tight tracking-[-.04em] text-white sm:text-3xl">Your work, orders, and digital services in one place.</h3>
          <p className="mt-4 max-w-xl text-xs leading-6 text-slate-400">Jelajahi katalog, pilih layanan, lakukan pemesanan, dan pantau aktivitas melalui satu pengalaman yang terhubung.</p>
          <div className="mt-7 grid grid-cols-2 gap-3">
            {[
              {icon:Compass,label:'Discover marketplace'},
              {icon:Package,label:'Manage orders'},
              {icon:Layers3,label:'Access products'},
              {icon:ShieldCheck,label:'Secure account'},
            ].map(({icon:Icon,label})=><div key={label} className="flex items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.025] px-3 py-3 text-[10px] text-slate-300"><Icon className="size-4 shrink-0 text-[#80d4ff]" />{label}</div>)}
          </div>
          <Link href="/marketplace" className="mt-7 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#80d4ff]">Start exploring <ArrowRight className="size-3.5" /></Link>
        </div>
        <div className="flex flex-col justify-between rounded-2xl border border-[#80d4ff]/20 bg-gradient-to-br from-[#13283a] via-[#101b2a] to-[#101522] p-6 sm:p-8">
          <div><div className="flex size-11 items-center justify-center rounded-xl bg-[#80d4ff]/10 text-[#80d4ff]"><Bot className="size-5" /></div><p className="mt-6 font-mono text-[9px] tracking-[.2em] text-[#80d4ff]">BUILT TO EXPAND</p><h3 className="mt-3 text-2xl font-semibold leading-tight tracking-[-.04em] text-white">A platform designed to grow beyond one industry.</h3><p className="mt-4 text-xs leading-6 text-slate-400">Mulai dari layanan yang sudah tersedia. Ekosistem baru dapat ditambahkan secara bertahap tanpa memecah pengalaman pelanggan.</p></div>
          <div className="mt-8 flex flex-wrap gap-2"><span className="rounded-full border border-white/10 px-3 py-2 text-[9px] text-slate-300">AI & automation</span><span className="rounded-full border border-white/10 px-3 py-2 text-[9px] text-slate-300">Technology</span><span className="rounded-full border border-white/10 px-3 py-2 text-[9px] text-slate-300">Digital commerce</span><span className="rounded-full border border-white/10 px-3 py-2 text-[9px] text-slate-300">Media</span></div>
        </div>
      </section>

      <section className="flex flex-col gap-5 rounded-2xl border border-white/[.09] bg-[#0d131d] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div><p className="font-mono text-[9px] tracking-[.2em] text-[#80d4ff]">READY TO GET STARTED?</p><h3 className="mt-2 text-2xl font-semibold tracking-[-.04em] text-white">Find the right place to start.</h3><p className="mt-2 max-w-xl text-xs leading-6 text-slate-400">Lihat katalog layanan dan produk yang tersedia sekarang.</p></div>
        <Link href="/marketplace" className="inline-flex shrink-0 items-center justify-center gap-3 rounded-xl bg-[#80d4ff] px-5 py-4 text-[10px] font-bold uppercase tracking-[.13em] text-[#07111a] transition hover:bg-[#b0e5ff]">Browse marketplace <ArrowUpRight className="size-4" /></Link>
      </section>
    </PageStack>
  )
}

const Page = HomePage as PageWithFrame<Props>
Page.getLayout = (page) => (
  <StoreFrame
    eyebrow="Cyber Wealth / Ecosystem"
    title="One platform. Multiple economies."
    intent="Satu ekosistem digital untuk menemukan layanan, teknologi, AI, produk, dan pengalaman kreatif."
    variant="wide"
    description="Cyber Wealth — connected digital ecosystem for creative services, technology, AI, products, and media."
  >
    {page}
  </StoreFrame>
)
export default Page
