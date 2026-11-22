import type { GetServerSideProps } from 'next'
import Link from 'next/link'
import { ArrowUpRight, ArrowRight, Layers3, ShieldCheck, Workflow, Compass } from 'lucide-react'
import { StoreFrame } from '@/components/StoreFrame'
import { PageStack } from '@/components/ui'
import { getSession } from '@/lib/auth'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getSession(ctx.req)
  if (session) return { redirect: { destination: '/owner', permanent: false } }
  return { props: {} }
}

function HomePage() {
  return (
    <PageStack>
      <section className="relative overflow-hidden border border-[#b99a5b]/25 bg-[#101113]">
        <div className="absolute inset-0 opacity-30" style={{backgroundImage:'linear-gradient(rgba(199,169,107,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(199,169,107,.10) 1px, transparent 1px)',backgroundSize:'64px 64px'}} />
        <div className="absolute -right-24 -top-20 size-[420px] rounded-full border border-[#c5a66a]/20" /><div className="absolute -right-12 -top-8 size-[300px] rounded-full border border-[#c5a66a]/20" />
        <div className="relative grid min-h-[540px] items-end gap-12 p-7 sm:p-12 lg:grid-cols-[1.3fr_.7fr] lg:p-16">
          <div className="pb-3">
            <p className="font-mono text-[10px] uppercase tracking-[.28em] text-[#c5a66a]">A considered approach to digital business</p>
            <h2 className="mt-7 max-w-4xl text-5xl font-medium leading-[.98] tracking-[-.06em] text-[#f3f0e9] sm:text-6xl lg:text-[76px]">Clarity in strategy.<br/><span className="text-[#c5a66a]">Precision in execution.</span></h2>
            <p className="mt-7 max-w-xl text-sm leading-7 text-[#aaa69e] sm:text-base">Cyber Wealth menghadirkan solusi digital, layanan kreatif, dan produk siap pakai untuk membantu pekerjaan dan bisnis berjalan lebih terarah.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/jasa" className="inline-flex items-center gap-3 bg-[#c5a66a] px-6 py-4 text-[10px] font-semibold uppercase tracking-[.16em] text-[#101010] transition hover:bg-[#dfc58f]">Explore our services <ArrowUpRight className="size-4"/></Link>
              <Link href="/tentang" className="inline-flex items-center gap-3 border border-white/20 px-6 py-4 text-[10px] font-semibold uppercase tracking-[.16em] text-[#e9e5db] hover:border-[#c5a66a] hover:text-[#c5a66a]">Discover Cyber Wealth <ArrowRight className="size-4"/></Link>
            </div>
          </div>
          <div className="hidden border-l border-[#c5a66a]/30 pl-8 pb-4 lg:block">
            <p className="font-mono text-[10px] tracking-[.2em] text-[#c5a66a]">OUR PRINCIPLES</p>
            <div className="mt-7 space-y-7">
              <div><p className="text-2xl font-light text-[#f3f0e9]">01</p><p className="mt-1 text-xs tracking-[.12em] text-[#aaa69e]">Purpose before noise</p></div>
              <div><p className="text-2xl font-light text-[#f3f0e9]">02</p><p className="mt-1 text-xs tracking-[.12em] text-[#aaa69e]">Quality in every detail</p></div>
              <div><p className="text-2xl font-light text-[#f3f0e9]">03</p><p className="mt-1 text-xs tracking-[.12em] text-[#aaa69e]">Progress through execution</p></div>
            </div>
          </div>
        </div>
        <div className="relative grid grid-cols-2 border-t border-[#c5a66a]/20 sm:grid-cols-4">
          {['Digital solutions','Creative services','Ready-to-use products','Business systems'].map((x,i)=><div key={x} className="border-r border-[#c5a66a]/15 px-5 py-5 last:border-r-0 sm:px-7"><p className="font-mono text-[9px] text-[#c5a66a]">0{i+1}</p><p className="mt-2 text-[11px] tracking-[.06em] text-[#c5c0b5]">{x}</p></div>)}
        </div>
      </section>
      <section className="grid gap-12 py-10 lg:grid-cols-[.8fr_1.2fr] lg:py-16">
        <div><p className="font-mono text-[10px] uppercase tracking-[.22em] text-[#c5a66a]">What we do</p><h3 className="mt-4 max-w-md text-3xl font-medium leading-tight tracking-[-.04em] text-[#f3f0e9] sm:text-4xl">A connected ecosystem for modern work.</h3></div>
        <div className="grid gap-0 sm:grid-cols-2">
          <Link href="/jasa" className="group border-t border-[#b99a5b]/30 py-6 pr-6"><Workflow className="size-5 text-[#c5a66a]"/><h4 className="mt-5 text-lg text-[#f3f0e9]">Digital services</h4><p className="mt-2 text-xs leading-6 text-[#9e998f]">Website, desain, konten, dan kebutuhan pemasaran digital yang disesuaikan dengan brief.</p><span className="mt-5 inline-flex items-center gap-2 text-[10px] uppercase tracking-[.16em] text-[#c5a66a]">Explore <ArrowUpRight className="size-3.5"/></span></Link>
          <Link href="/toko" className="group border-t border-[#b99a5b]/30 py-6 sm:pl-6 sm:border-l"><Layers3 className="size-5 text-[#c5a66a]"/><h4 className="mt-5 text-lg text-[#f3f0e9]">Digital products</h4><p className="mt-2 text-xs leading-6 text-[#9e998f]">Template, footage, video siap pakai, dan aset kreatif digital.</p><span className="mt-5 inline-flex items-center gap-2 text-[10px] uppercase tracking-[.16em] text-[#c5a66a]">View catalogue <ArrowUpRight className="size-3.5"/></span></Link>
          <Link href="/harga" className="group border-t border-[#b99a5b]/30 py-6 pr-6"><Compass className="size-5 text-[#c5a66a]"/><h4 className="mt-5 text-lg text-[#f3f0e9]">Platform plans</h4><p className="mt-2 text-xs leading-6 text-[#9e998f]">Pilihan paket platform yang dapat disesuaikan dengan kebutuhan operasional.</p><span className="mt-5 inline-flex items-center gap-2 text-[10px] uppercase tracking-[.16em] text-[#c5a66a]">Compare plans <ArrowUpRight className="size-3.5"/></span></Link>
          <Link href="/tentang" className="group border-t border-[#b99a5b]/30 py-6 sm:pl-6 sm:border-l"><ShieldCheck className="size-5 text-[#c5a66a]"/><h4 className="mt-5 text-lg text-[#f3f0e9]">Our approach</h4><p className="mt-2 text-xs leading-6 text-[#9e998f]">Prinsip kerja yang mengutamakan kejelasan, tanggung jawab, dan kualitas eksekusi.</p><span className="mt-5 inline-flex items-center gap-2 text-[10px] uppercase tracking-[.16em] text-[#c5a66a]">About us <ArrowUpRight className="size-3.5"/></span></Link>
        </div>
      </section>
      <section className="flex flex-col gap-6 border border-[#b99a5b]/25 bg-[#101113] p-7 sm:flex-row sm:items-center sm:justify-between sm:p-10">
        <div><p className="font-mono text-[10px] uppercase tracking-[.22em] text-[#c5a66a]">Start a conversation</p><h3 className="mt-3 text-2xl font-medium tracking-tight text-[#f3f0e9]">Tell us what you are building.</h3><p className="mt-2 max-w-xl text-xs leading-6 text-[#9e998f]">Ceritakan kebutuhan Anda. Tim kami akan meninjau informasi yang dikirim dan menindaklanjutinya.</p></div>
        <Link href="/kontak" className="inline-flex shrink-0 items-center gap-3 border border-[#c5a66a]/60 px-6 py-4 text-[10px] font-semibold uppercase tracking-[.16em] text-[#d8bd83] hover:bg-[#c5a66a] hover:text-[#101010]">Contact Cyber Wealth <ArrowUpRight className="size-4"/></Link>
      </section>
    </PageStack>
  )
}

const Page = HomePage as PageWithFrame
Page.getLayout = (page) => (
  <StoreFrame eyebrow="Cyber Wealth / Official website" title="Digital business, thoughtfully built." intent="Strategi, layanan, dan produk digital yang dirancang untuk membuat pekerjaan lebih jelas dan bisnis bergerak lebih jauh." variant="wide" description="Cyber Wealth — digital solutions, creative services, and products for modern business.">
    {page}
  </StoreFrame>
)
export default Page
