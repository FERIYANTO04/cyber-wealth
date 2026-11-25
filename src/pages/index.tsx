import type { GetServerSideProps } from 'next'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight, Bot, Clapperboard, Code2, Gem, Layers3, Palette, Sparkles, Workflow } from 'lucide-react'
import { StoreFrame } from '@/components/StoreFrame'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} })

const categories = [
  ['All', '/marketplace'], ['Corporate', '/jasa'], ['Portfolio', '/kreator'],
  ['E-commerce', '/toko'], ['Technology', '/marketplace'], ['Creative', '/jasa'],
  ['Media & Film', '/media'], ['Business', '/harga'], ['Innovation', '/showroom'],
]
const showcases = [
  { title: 'Creative Studio', type: 'Brand & visual identity', desc: 'Identity systems, graphic design, and product visuals.', href: '/jasa', icon: Palette, number: '01', visual: 'from-[#33291d] via-[#17130e] to-[#090908]', mark: 'CREATE' },
  { title: 'Technology', type: 'Websites & applications', desc: 'Digital platforms and experiences designed to scale.', href: '/marketplace', icon: Code2, number: '02', visual: 'from-[#1a2935] via-[#0d141a] to-[#090908]', mark: 'BUILD' },
  { title: 'AI Studio', type: 'Intelligence & automation', desc: 'Applied AI systems and smarter business workflows.', href: '/marketplace', icon: Bot, number: '03', visual: 'from-[#25221a] via-[#12110d] to-[#090908]', mark: 'INTELLIGENCE' },
  { title: 'Drama Studio', type: 'Film & storytelling', desc: 'Video production, editing, and cinematic storytelling.', href: '/media', icon: Clapperboard, number: '04', visual: 'from-[#28201d] via-[#15100e] to-[#090908]', mark: 'STORY' },
  { title: 'Digital Products', type: 'Tools & downloadable assets', desc: 'Practical digital products ready to use after purchase.', href: '/toko', icon: Layers3, number: '05', visual: 'from-[#28251c] via-[#15130e] to-[#090908]', mark: 'PRODUCT' },
  { title: 'Innovation Lab', type: '3D & emerging ideas', desc: 'New concepts, spatial visuals, and experimental projects.', href: '/showroom', icon: Workflow, number: '06', visual: 'from-[#1e2925] via-[#101713] to-[#090908]', mark: 'EXPLORE' },
]
function HomePage() {
  return <div className="space-y-12">
    <section className="relative min-h-[390px] overflow-hidden rounded-[4px] border border-[#c7a66a]/30 bg-[#0a0a08] sm:min-h-[440px]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_83%_44%,rgba(202,164,91,.19),transparent_32%),linear-gradient(110deg,#11100d_0%,#090908_58%,#12100b_100%)]"/>
      <div className="absolute -right-20 top-[-9rem] size-[540px] rounded-full border border-[#d5b879]/20 shadow-[inset_0_0_70px_rgba(205,170,100,.06)]"/>
      <div className="absolute -right-2 top-[-3rem] size-[420px] rounded-full border border-[#d5b879]/20"/>
      <div className="absolute right-[4%] top-[15%] size-[320px] rounded-full bg-[radial-gradient(circle_at_35%_35%,#8d713e_0%,#342819_20%,#11100d_58%,#080807_72%)] opacity-80 shadow-[0_0_100px_rgba(198,160,88,.18)]"/>
      <div className="absolute right-[8%] top-[24%] size-[270px] rounded-full border border-[#e4c98f]/20"/>
      <div className="absolute right-[13%] top-[33%] size-[170px] rounded-full border border-[#e4c98f]/20"/>
      <div className="absolute inset-0 bg-gradient-to-r from-[#090908] via-[#090908]/90 to-transparent"/>
      <div className="relative flex min-h-[390px] items-center px-7 py-12 sm:min-h-[440px] sm:px-12 lg:px-16">
        <div className="max-w-2xl">
          <p className="font-mono text-[9px] uppercase tracking-[.32em] text-[#d2b477]">Independent digital company · Est. 2026</p>
          <h2 className="mt-7 text-[clamp(3rem,7vw,6.3rem)] font-medium leading-[.9] tracking-[-.07em] text-[#f4eee2]">A world of<br/>digital <span className="font-serif italic font-normal text-[#d8b978]">possibilities.</span></h2>
          <p className="mt-6 max-w-lg text-sm leading-7 text-[#aaa293]">Creative vision, advanced technology, and intelligent digital products — connected in one ecosystem built to move ideas forward.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/marketplace" className="inline-flex items-center gap-3 bg-gradient-to-r from-[#d8bc80] to-[#a98243] px-6 py-3.5 text-[9px] font-bold uppercase tracking-[.16em] text-[#17120a] hover:brightness-110">Explore ecosystem <ArrowUpRight className="size-4"/></Link>
            <Link href="/kontak" className="inline-flex items-center gap-2 border border-[#c7a66a]/45 px-5 py-3.5 text-[9px] font-semibold uppercase tracking-[.16em] text-[#e0cfaa] hover:bg-white/[.04]">Start a project <ArrowRight className="size-3.5"/></Link>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 grid grid-cols-2 border-t border-[#c7a66a]/20 bg-black/35 sm:grid-cols-4">{[['01','CREATE'],['02','PRODUCE'],['03','BUILD'],['04','INNOVATE']].map(([n,t])=><div key={n} className="flex items-center gap-3 border-r border-[#c7a66a]/15 px-5 py-4 last:border-0 sm:px-8"><span className="font-mono text-[9px] text-[#d2b477]">{n}</span><span className="text-[9px] tracking-[.2em] text-[#c8c0b1]">{t}</span></div>)}</div>
    </section>

    <section className="overflow-hidden rounded-[4px] border border-[#c7a66a]/30 bg-[#0d0c09] shadow-[0_25px_80px_rgba(0,0,0,.35)]">
      <div className="grid lg:grid-cols-[205px_minmax(0,1fr)]">
        <aside className="border-b border-[#c7a66a]/20 bg-[#0a0a08] p-5 lg:border-b-0 lg:border-r">
          <p className="font-serif text-lg text-[#dfc58f]">Explore</p><p className="mt-1 text-[9px] uppercase tracking-[.2em] text-[#766b57]">Our ecosystem</p>
          <div className="mt-5 grid grid-cols-2 gap-1 lg:grid-cols-1">{categories.map(([label,href],i)=><Link key={label} href={href} className={i===0?'flex items-center gap-3 rounded-sm border border-[#d0ae6c]/40 bg-gradient-to-r from-[#b38b4e]/30 to-[#5c4729]/10 px-3 py-2.5 text-[11px] text-[#f1d69d]':'flex items-center gap-3 rounded-sm px-3 py-2.5 text-[11px] text-[#a69d8c] transition hover:bg-white/[.04] hover:text-[#e4c789]'}><span className="font-mono text-[9px] text-[#a98950]">{String(i+1).padStart(2,'0')}</span>{label}</Link>)}</div>
          <div className="mt-8 hidden border-t border-white/10 pt-5 lg:block"><p className="text-[9px] uppercase tracking-[.2em] text-[#b99a62]">Have a brief?</p><p className="mt-2 text-xs leading-5 text-[#8e8779]">Tell us what you want to build.</p><Link href="/kontak" className="mt-4 inline-flex items-center gap-2 text-[10px] text-[#e0c58e]">Contact us <ArrowUpRight className="size-3"/></Link></div>
        </aside>
        <div className="min-w-0 p-5 sm:p-7 lg:p-8">
          <div className="flex flex-col justify-between gap-4 border-b border-[#c7a66a]/20 pb-6 sm:flex-row sm:items-end"><div><p className="font-mono text-[9px] uppercase tracking-[.28em] text-[#c8a96e]">Discover Cyber Wealth</p><h3 className="mt-3 text-2xl font-semibold tracking-[-.045em] text-[#f1ebdf] sm:text-3xl">One ecosystem. Endless possibilities.</h3><p className="mt-2 max-w-xl text-xs leading-6 text-[#938b7d]">Explore our studios, capabilities, and digital offerings — designed to work together.</p></div><Link href="/marketplace" className="inline-flex shrink-0 items-center gap-2 text-[9px] font-bold uppercase tracking-[.15em] text-[#d6b879]">View all <ArrowUpRight className="size-3.5"/></Link></div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{showcases.map(({title,type,desc,href,icon:Icon,number,visual,mark})=><Link key={number} href={href} className="group overflow-hidden rounded-[3px] border border-white/10 bg-[#11100d] transition hover:-translate-y-1 hover:border-[#c7a66a]/50">
            <div className={`relative flex h-[145px] items-center justify-center overflow-hidden bg-gradient-to-br ${visual}`}><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(222,188,120,.16),transparent_48%)]"/><div className="absolute inset-4 rounded-full border border-[#d7b978]/15"/><div className="absolute inset-8 rounded-full border border-[#d7b978]/10"/><Icon className="relative size-12 stroke-[1.1] text-[#d7b978] drop-shadow-[0_0_20px_rgba(215,185,120,.35)]"/><span className="absolute left-4 top-4 font-mono text-[8px] tracking-[.22em] text-[#c6a66d]">{number} / {mark}</span><ArrowUpRight className="absolute right-4 top-4 size-4 text-[#9c8b69] transition group-hover:-translate-y-1 group-hover:translate-x-1"/></div>
            <div className="p-4"><h4 className="text-sm font-semibold text-[#eee7d9]">{title}</h4><p className="mt-1 text-[9px] uppercase tracking-[.12em] text-[#c1a36c]">{type}</p><p className="mt-3 min-h-[38px] text-[11px] leading-5 text-[#928a7d]">{desc}</p><span className="mt-3 inline-flex items-center gap-2 text-[9px] font-semibold text-[#d5b879]">Explore studio <ArrowRight className="size-3 transition group-hover:translate-x-1"/></span></div>
          </Link>)}</div>
        </div>
      </div>
    </section>

    <section className="relative flex flex-col gap-6 overflow-hidden border-y border-[#c7a66a]/25 bg-[linear-gradient(110deg,#17130c,#0a0907_65%,#1a140b)] px-7 py-9 sm:flex-row sm:items-center sm:justify-between sm:px-12">
      <div><p className="font-mono text-[9px] uppercase tracking-[.28em] text-[#c8a96e]">Cyber Wealth · Digital ecosystem</p><h3 className="mt-3 max-w-3xl font-serif text-2xl leading-tight text-[#f2eadb] sm:text-3xl">A global digital company for a <span className="italic text-[#d9b979]">smarter future.</span></h3><p className="mt-3 text-xs text-[#9b9281]">Creative solutions. Advanced technology. Endless possibilities.</p></div>
      <Link href="/kontak" className="inline-flex shrink-0 items-center gap-3 rounded-full border border-[#c7a66a]/60 px-6 py-3 text-[10px] font-semibold text-[#e4ca95] transition hover:bg-[#c7a66a] hover:text-black">Explore our ecosystem <ArrowUpRight className="size-4"/></Link>
    </section>
  </div>
}
const Page = HomePage as PageWithFrame
Page.getLayout = (page) => <StoreFrame eyebrow="Cyber Wealth / Official website" title="" intent="" variant="wide" description="Cyber Wealth — a global digital ecosystem for creative production, technology, AI, and digital products.">{page}</StoreFrame>
export default Page
