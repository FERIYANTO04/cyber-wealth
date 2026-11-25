import type { GetServerSideProps } from 'next'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { StoreFrame } from '@/components/StoreFrame'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async () => ({ props: {} })

const categories = [
  { label: 'All', href: '/marketplace' },
  { label: 'Agency', href: '/jasa' },
  { label: 'Creator', href: '/kreator' },
  { label: 'Video & Film', href: '/media' },
  { label: '3D Studio', href: '/showroom' },
  { label: 'Digital products', href: '/toko' },
  { label: 'Technology', href: '/marketplace' },
  { label: 'AI solutions', href: '/marketplace' },
  { label: 'Business', href: '/harga' },
  { label: 'Contact', href: '/kontak' },
]
const items = [
  { n:'01', name:'Creative Studio', type:'Agency / Design', desc:'Brand identity, graphic design and visual campaigns.', href:'/jasa', theme:'creative' },
  { n:'02', name:'Digital Experiences', type:'Technology / Web', desc:'Websites, platforms and digital product experiences.', href:'/marketplace', theme:'tech' },
  { n:'03', name:'AI & Automation', type:'Artificial intelligence', desc:'Intelligent systems and workflows for modern business.', href:'/marketplace', theme:'ai' },
  { n:'04', name:'Film & Motion', type:'Video / Production', desc:'Cinematic content, editing and motion graphics.', href:'/media', theme:'film' },
  { n:'05', name:'Digital Products', type:'Products / Downloads', desc:'Useful digital tools, templates and ready-to-use assets.', href:'/toko', theme:'product' },
  { n:'06', name:'3D & Innovation', type:'3D / Experimental', desc:'Three-dimensional visuals and emerging concepts.', href:'/showroom', theme:'innovation' },
]
function Preview({theme}:{theme:string}) {
  const base='relative h-[150px] overflow-hidden border-b border-[#c7a66a]/20'
  if(theme==='creative') return <div className={base+' bg-[#21170f]'}><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_35%,rgba(217,185,120,.4),transparent_35%),linear-gradient(125deg,#35251a,#0b0907)]"/><div className="absolute left-6 top-7 font-serif text-3xl italic text-[#ead6ac]">Form & feeling</div><div className="absolute bottom-5 left-6 h-px w-24 bg-[#d5b879]"/><div className="absolute -right-5 -top-8 size-44 rounded-full border border-[#d5b879]/40"/></div>
  if(theme==='tech') return <div className={base+' bg-[#101a20]'}><div className="absolute inset-4 border border-[#91b0b5]/30 bg-[#0b1217]/80 p-3"><div className="flex gap-1"><i className="size-1.5 rounded-full bg-[#c7a66a]"/><i className="size-1.5 rounded-full bg-white/30"/><i className="size-1.5 rounded-full bg-white/30"/></div><div className="mt-4 h-2 w-2/3 bg-[#d6c49d]/70"/><div className="mt-2 h-1 w-1/2 bg-white/20"/><div className="mt-5 grid grid-cols-3 gap-2">{[1,2,3].map(x=><div key={x} className="h-12 border border-[#91b0b5]/30 bg-[#263b43]/50"/> )}</div></div></div>
  if(theme==='ai') return <div className={base+' bg-[#15120d]'}><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(198,164,100,.25),transparent_45%)]"/><div className="absolute left-1/2 top-1/2 size-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#d7bd83]/50 shadow-[0_0_40px_rgba(215,189,131,.2)]"/><div className="absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#d7bd83]/70"/><div className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e7cb91] shadow-[0_0_20px_8px_rgba(231,203,145,.25)]"/></div>
  if(theme==='film') return <div className={base+' bg-[#191311]'}><div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_20%,rgba(211,173,111,.2),transparent_65%),radial-gradient(ellipse_at_70%_40%,#5a3b2b,#15100d_60%)]"/><div className="absolute bottom-5 left-5 font-serif text-2xl tracking-widest text-[#f0dfc2]">CINEMA</div><div className="absolute bottom-4 right-5 h-8 w-12 border border-[#d7bd83]/50"/></div>
  if(theme==='product') return <div className={base+' bg-[#211c13]'}><div className="absolute left-1/2 top-1/2 h-28 w-20 -translate-x-1/2 -translate-y-1/2 rotate-[-7deg] border border-[#d8bc80]/60 bg-gradient-to-br from-[#51412b] to-[#0d0b08] shadow-2xl"/><div className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-1 font-serif text-sm text-[#ead6ac]">THE KIT</div></div>
  return <div className={base+' bg-[#101915]'}><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(157,174,143,.2),transparent_55%),linear-gradient(135deg,#26352b,#090d0a)]"/><div className="absolute left-1/2 top-1/2 size-28 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-[#d8bc80]/50"/><div className="absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2 rotate-12 border border-[#d8bc80]/30"/></div>
}
function HomePage() {
 return <div className="grid gap-6 md:grid-cols-[155px_minmax(0,1fr)] lg:grid-cols-[180px_minmax(0,1fr)]">
  <aside className="border-b border-[#c7a66a]/20 pb-4 lg:border-b-0 lg:border-r lg:pr-5">
   <p className="font-serif text-xl text-[#e2c58d]">Explore</p><p className="mt-1 text-[8px] uppercase tracking-[.24em] text-[#85775d]">Browse categories</p>
   <nav className="mt-4 grid grid-cols-2 gap-1 md:grid-cols-1">{categories.map((c,i)=><Link key={c.label} href={c.href} className={`flex items-center gap-2 border px-3 py-2.5 text-[10px] transition ${i===0?'border-[#c7a66a]/40 bg-[#c7a66a]/10 text-[#e8ce9b]':'border-transparent text-[#a79e8d] hover:border-[#c7a66a]/20 hover:bg-white/[.03] hover:text-[#e8ce9b]'}`}><span className="font-mono text-[8px] text-[#9e8050]">{String(i+1).padStart(2,'0')}</span>{c.label}</Link>)}</nav>
  </aside>
  <section className="min-w-0">
   <div className="border-b border-[#c7a66a]/20 pb-5"><p className="font-mono text-[9px] uppercase tracking-[.28em] text-[#c9a96d]">Cyber Wealth / Digital ecosystem</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.045em] text-[#f3ecdf] sm:text-4xl">Explore our ecosystem</h1><p className="mt-2 max-w-2xl text-xs leading-6 text-[#9b9385]">A curated collection of creative studios, digital products, technology and media — built to bring ambitious ideas to life.</p></div>
   <div className="mt-5 flex items-center justify-between"><p className="text-[9px] uppercase tracking-[.2em] text-[#bda16d]">Selected work & offerings</p><span className="font-mono text-[9px] text-[#756b58]">06 COLLECTIONS</span></div>
   <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map(item=><Link href={item.href} key={item.n} className="group overflow-hidden border border-[#c7a66a]/20 bg-[#0d0c09] transition hover:-translate-y-1 hover:border-[#c7a66a]/60"><Preview theme={item.theme}/><div className="p-4"><div className="flex items-center justify-between"><span className="font-mono text-[8px] tracking-[.18em] text-[#b89a63]">{item.n} / {item.type}</span><ArrowUpRight className="size-3.5 text-[#a58a59] transition group-hover:-translate-y-1 group-hover:translate-x-1"/></div><h2 className="mt-3 text-sm font-semibold text-[#eee6d8]">{item.name}</h2><p className="mt-2 text-[10px] leading-5 text-[#938b7d]">{item.desc}</p></div></Link>)}</div>
   <div className="mt-8 border-t border-[#c7a66a]/20 pt-5"><Link href="/kontak" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[.16em] text-[#ddc18a]">Discuss a project <ArrowUpRight className="size-3.5"/></Link></div>
  </section>
 </div>
}
const Page = HomePage as PageWithFrame
Page.getLayout = (page) => <StoreFrame title="Cyber Wealth" variant="wide" description="Explore Cyber Wealth studios, services, products, technology and media.">{page}</StoreFrame>
export default Page
