import Link from 'next/link'
import { ArrowUpRight, Boxes, Clapperboard, Cpu, Palette, Sparkles } from 'lucide-react'
import { Badge, EmptyState, Panel, SignalLink } from '@/components/ui'
import { money } from '@/lib/format'

export type ServiceItem = {
  slug: string
  name: string
  summary: string
  category: string
  priceFromIdr: number
  deliveryDays: number
}

const CATEGORY: Record<string, string> = {
  desain: 'Desain grafis', website: 'Website', konten: 'Konten',
  pemasaran: 'Pemasaran digital', video: 'Produksi video',
  editing: 'Video editing', motion: 'Motion graphics',
  ai: 'AI creative studio', branding: 'Brand identity',
  social: 'Konten sosial media',
}

const studios = [
  { n: '01', name: 'Product Studio', focus: 'Digital products & experiences', detail: 'From the first idea to a product people can use.', icon: Boxes },
  { n: '02', name: 'Technology', focus: 'Websites & applications', detail: 'Digital foundations built for what comes next.', icon: Cpu },
  { n: '03', name: 'AI Studio', focus: 'Intelligence & automation', detail: 'Practical AI systems that make work move faster.', icon: Sparkles },
  { n: '04', name: 'Drama Studio', focus: 'Film & storytelling', detail: 'Visual stories made to hold attention.', icon: Clapperboard },
]

export function ServiceCatalog({ services, isOwner }: { services: ServiceItem[]; isOwner: boolean }) {
  if (services.length === 0) {
    return <Panel><EmptyState title="Studio sedang menyiapkan penawaran" body={isOwner ? 'Terbitkan layanan dari konsol agar tampil di sini.' : 'Penawaran baru akan segera tersedia.'} action={isOwner ? <SignalLink href="/jasa-admin">Kelola layanan</SignalLink> : undefined} /></Panel>
  }

  return (
    <div className="space-y-16">
      <section aria-labelledby="studios-heading">
        <div className="mb-6 flex items-end justify-between gap-4 border-b border-white/10 pb-4">
          <div><p className="font-mono text-[10px] uppercase tracking-[.24em] text-[#55d6b5]">The ecosystem</p><h2 id="studios-heading" className="mt-2 text-2xl font-semibold tracking-[-.04em] text-white sm:text-3xl">Four studios. One direction.</h2></div>
          <span className="hidden font-mono text-[10px] tracking-widest text-slate-500 sm:block">CW / 01—04</span>
        </div>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
          {studios.map(({ n, name, focus, detail, icon: Icon }) => (
            <div key={n} className="group relative min-h-[210px] overflow-hidden bg-[#0c111a] p-6 transition-colors hover:bg-[#111c27] sm:p-7">
              <div className="flex items-center justify-between"><span className="font-mono text-[10px] tracking-[.2em] text-[#55d6b5]">{n} / STUDIO</span><Icon className="size-5 text-slate-500 transition group-hover:text-[#55d6b5]" /></div>
              <h3 className="mt-10 text-xl font-semibold tracking-tight text-white">{name}</h3>
              <p className="mt-2 text-xs font-medium uppercase tracking-[.12em] text-slate-300">{focus}</p>
              <p className="mt-3 max-w-[24rem] text-xs leading-6 text-slate-500">{detail}</p>
              <div className="pointer-events-none absolute -bottom-12 -right-8 size-36 rounded-full border border-[#55d6b5]/10 transition group-hover:scale-110" />
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="offers-heading">
        <div className="mb-6 flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="font-mono text-[10px] uppercase tracking-[.24em] text-[#55d6b5]">Selected capabilities</p><h2 id="offers-heading" className="mt-2 text-2xl font-semibold tracking-[-.04em] text-white sm:text-3xl">Explore what we create.</h2></div>
          <p className="max-w-sm text-xs leading-6 text-slate-500">Setiap proyek dimulai dari kebutuhan yang jelas. Pilih layanan untuk melihat detail dan mengirim brief.</p>
        </div>
        <div className="divide-y divide-white/10 border-y border-white/10">
          {services.map((service, index) => (
            <Link key={service.slug} href={`/jasa/${service.slug}`} className="group grid gap-3 py-5 transition-colors hover:bg-white/[.025] sm:grid-cols-[52px_minmax(0,1fr)_auto] sm:items-center sm:gap-5 sm:px-3">
              <span className="font-mono text-xs tracking-widest text-slate-600">{String(index + 1).padStart(2, '0')}</span>
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2"><Badge>{CATEGORY[service.category] ?? service.category}</Badge></div>
                <h3 className="text-base font-semibold tracking-tight text-slate-100 transition group-hover:text-[#75e2c5]">{service.name}</h3>
                <p className="mt-1 max-w-3xl text-xs leading-6 text-slate-500">{service.summary}</p>
              </div>
              <div className="flex items-center justify-between gap-5 sm:justify-end">
                <div className="sm:text-right"><p className="font-mono text-xs text-slate-200">{service.priceFromIdr > 0 ? `From ${money(service.priceFromIdr)}` : 'Custom quote'}</p><p className="mt-1 text-[10px] text-slate-600">Est. {service.deliveryDays} working days</p></div>
                <ArrowUpRight className="size-4 shrink-0 text-slate-500 transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-[#55d6b5]" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-[#55d6b5]/20 bg-[radial-gradient(circle_at_85%_20%,rgba(85,214,181,.12),transparent_35%),linear-gradient(120deg,#111a25,#0b1018)] p-7 sm:p-10">
        <p className="font-mono text-[10px] uppercase tracking-[.24em] text-[#55d6b5]">Start a conversation</p>
        <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="max-w-2xl text-2xl font-semibold tracking-[-.04em] text-white sm:text-3xl">Have a bigger idea in mind?</h2><p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">Tell us what you are building. We’ll help shape the right team, scope, and next step.</p></div>
          <Link href="/kontak" className="inline-flex shrink-0 items-center justify-center gap-3 rounded-full bg-[#55d6b5] px-6 py-3 text-xs font-bold text-[#07110f] transition hover:bg-[#8cebd3]">Discuss a project <ArrowUpRight className="size-4" /></Link>
        </div>
      </section>
    </div>
  )
}
