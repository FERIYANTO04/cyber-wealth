import Link from 'next/link'
import { ArrowUpRight, Compass, ShieldCheck, Target } from 'lucide-react'
import { StoreFrame } from '@/components/StoreFrame'
import { PageStack } from '@/components/ui'
import type { PageWithFrame } from '@/lib/frame'

function AboutPage() {
  return <PageStack>
    <section className="grid gap-10 border-b border-[#b99a5b]/20 pb-12 lg:grid-cols-[.8fr_1.2fr]">
      <div><p className="font-mono text-[10px] uppercase tracking-[.22em] text-[#c5a66a]">Who we are</p><h2 className="mt-5 text-4xl font-medium leading-tight tracking-[-.05em] text-[#f3f0e9]">Built on clarity. Driven by progress.</h2></div>
      <div className="space-y-5 text-sm leading-7 text-[#aaa69e]"><p>Cyber Wealth adalah platform dan perusahaan digital yang berfokus pada penyediaan solusi, layanan kreatif, serta produk digital untuk mendukung kebutuhan kerja dan bisnis.</p><p>Kami membangun pengalaman yang mengutamakan fungsi, kejelasan informasi, dan proses yang dapat dipahami. Setiap layanan dan produk ditampilkan dengan informasi yang relevan agar pelanggan dapat mengambil keputusan secara lebih percaya diri.</p></div>
    </section>
    <section className="grid gap-4 py-8 md:grid-cols-3">
      {[{n:'01',t:'Purpose',d:'Memulai dari kebutuhan yang jelas dan tujuan yang terukur.',I:Target},{n:'02',t:'Integrity',d:'Menyampaikan informasi, ruang lingkup, dan proses secara transparan.',I:ShieldCheck},{n:'03',t:'Progress',d:'Mengembangkan solusi melalui evaluasi dan peningkatan berkelanjutan.',I:Compass}].map(({n,t,d,I})=><div key={n} className="border-t border-[#b99a5b]/30 bg-[#101113] p-6"><I className="size-5 text-[#c5a66a]"/><p className="mt-7 font-mono text-[10px] text-[#c5a66a]">{n}</p><h3 className="mt-2 text-xl text-[#f3f0e9]">{t}</h3><p className="mt-3 text-xs leading-6 text-[#9e998f]">{d}</p></div>)}
    </section>
    <section className="flex flex-col gap-5 border border-[#b99a5b]/25 p-7 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-xl text-[#f3f0e9]">Let’s build something meaningful.</h3><p className="mt-2 text-xs text-[#9e998f]">Hubungi kami untuk mendiskusikan kebutuhan digital Anda.</p></div><Link href="/kontak" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-[#c5a66a]">Get in touch <ArrowUpRight className="size-4"/></Link></section>
  </PageStack>
}
const Page=AboutPage as PageWithFrame
Page.getLayout=(page)=><StoreFrame eyebrow="About Cyber Wealth" title="A company shaped by purpose and execution." intent="Mengenal pendekatan, prinsip, dan fokus Cyber Wealth dalam membangun solusi digital." variant="wide">{page}</StoreFrame>
export default Page
