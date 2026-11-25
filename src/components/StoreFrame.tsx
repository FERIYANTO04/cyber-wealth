import Head from 'next/head'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'

export function StoreFrame({ title, eyebrow, intent, actions, back, variant = 'reading', description, children }: {
  title: string; eyebrow?: string; intent?: string; actions?: ReactNode
  back?: { href: string; label: string }; variant?: 'reading' | 'wide'
  description?: string; children: ReactNode
}) {
  const links = [
    { href: '/', label: 'Overview', group: 'DISCOVER' },
    { href: '/marketplace', label: 'Marketplace', group: 'DISCOVER' },
    { href: '/kreator', label: 'Creator & Media', group: 'STUDIOS' },
    { href: '/media', label: 'Video & Film', group: 'STUDIOS' },
    { href: '/showroom', label: '3D Studio', group: 'STUDIOS' },
    { href: '/jasa', label: 'Digital Services', group: 'BUSINESS' },
    { href: '/toko', label: 'Digital Products', group: 'BUSINESS' },
    { href: '/harga', label: 'Plans & Pricing', group: 'BUSINESS' },
  ]
  return (
    <div data-frame="store" data-frame-variant={variant} className="min-h-screen bg-[#080806] text-[#f3eee3]">
      <Head>
        <title>{title || 'Cyber Wealth'} — Cyber Wealth</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#080806" />
        <meta name="description" content={description ?? intent ?? 'Cyber Wealth — digital business solutions'} />
      </Head>
      <div className="min-h-screen lg:grid lg:grid-cols-[238px_minmax(0,1fr)]">
        <aside className="relative z-40 border-b border-[#c7a66a]/25 bg-[#0b0a08] lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:border-[#c7a66a]/20">
          <div className="flex items-center justify-between px-5 py-5 lg:block lg:px-6 lg:py-8">
            <Link href="/" className="flex items-center gap-3">
              <span className="font-serif text-4xl leading-none text-[#d9bb7b]">CW</span>
              <span className="h-9 w-px bg-[#c7a66a]/45"/>
              <span><span className="block text-[11px] font-semibold tracking-[.2em] text-[#f4ead5]">CYBER WEALTH</span><span className="mt-1 block text-[7px] uppercase tracking-[.34em] text-[#9b8b6c]">Digital ecosystem</span></span>
            </Link>
            <Link href="/kontak" className="inline-flex items-center gap-2 rounded-full border border-[#c7a66a]/60 px-3 py-2 text-[8px] font-bold uppercase tracking-[.14em] text-[#e4c789] lg:hidden">Contact <ArrowUpRight className="size-3"/></Link>
          </div>
          <div className="hidden px-4 pb-8 lg:block">
            {['DISCOVER','STUDIOS','BUSINESS'].map(group=><div key={group} className="mb-7">
              <p className="mb-3 px-3 font-mono text-[8px] tracking-[.24em] text-[#8c7955]">{group}</p>
              <nav className="grid gap-1">{links.filter(l=>l.group===group).map(l=><Link key={l.href} href={l.href} className={`group flex items-center justify-between rounded-sm border px-3 py-3 text-[11px] transition ${l.href==='/'?'border-[#c7a66a]/35 bg-gradient-to-r from-[#b38b4e]/20 to-transparent text-[#ecd29b]':'border-transparent text-[#aaa292] hover:border-[#c7a66a]/20 hover:bg-white/[.035] hover:text-[#e4c789]'}`}><span>{l.label}</span><ArrowUpRight className="size-3 text-[#786b52] opacity-0 transition group-hover:opacity-100"/></Link>)}</nav>
            </div>)}
            <div className="absolute bottom-7 left-7 right-7 border-t border-[#c7a66a]/20 pt-5"><p className="text-[8px] uppercase tracking-[.2em] text-[#b99a62]">Have a project?</p><Link href="/kontak" className="mt-2 inline-flex items-center gap-2 text-[11px] text-[#e2c78f]">Let’s talk <ArrowUpRight className="size-3"/></Link></div>
          </div>
          <nav className="flex gap-2 overflow-x-auto border-t border-white/[.06] px-4 py-2.5 lg:hidden">{links.map(l=><Link key={l.href} href={l.href} className="shrink-0 whitespace-nowrap rounded-sm px-3 py-2 text-[10px] text-[#b6ad9c] hover:bg-white/[.05] hover:text-[#e4c789]">{l.label}</Link>)}</nav>
        </aside>
        <div className="relative min-w-0">
          <header className="hidden h-[62px] items-center justify-between border-b border-[#c7a66a]/15 bg-[#090907]/75 px-7 lg:flex xl:px-10">
            <p className="font-mono text-[8px] uppercase tracking-[.22em] text-[#837964]">CYBER WEALTH <span className="mx-2 text-[#b99a62]">/</span> DIGITAL ECOSYSTEM</p>
            <Link href="/kontak" className="inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[.15em] text-[#d8bd83] hover:text-white">Contact <ArrowUpRight className="size-3"/></Link>
          </header>
          <div className="pointer-events-none absolute -right-48 -top-36 size-[580px] rounded-full border border-[#c7a66a]/10"/>
          <div className="pointer-events-none absolute -right-24 -top-24 size-[430px] rounded-full border border-[#c7a66a]/10"/>
          <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-[48vw] bg-[radial-gradient(ellipse_at_80%_20%,rgba(190,151,79,.13),transparent_58%)]"/>
          <main className="relative mx-auto w-full max-w-[1500px] px-4 pb-16 pt-6 sm:px-7 sm:pt-8 xl:px-10 xl:pt-10">
            {back && <Link href={back.href} className="mb-6 inline-flex items-center gap-2 text-xs text-[#a79c87] hover:text-[#e4c789]">← {back.label}</Link>}
            {(eyebrow || title || intent || actions) && <div className={variant === 'wide' ? 'mb-9 flex flex-col gap-5 border-b border-[#c7a66a]/20 pb-8 sm:flex-row sm:items-end sm:justify-between' : 'mb-8 flex flex-col gap-4 border-b border-[#c7a66a]/20 pb-7 sm:flex-row sm:items-end sm:justify-between'}>
              <div>{eyebrow && <p className="mb-3 font-mono text-[9px] uppercase tracking-[.28em] text-[#d0ad6e]">{eyebrow}</p>}{title && <h1 className="max-w-4xl text-3xl font-semibold leading-[1.05] tracking-[-.045em] text-[#f5efe4] sm:text-4xl lg:text-5xl">{title}</h1>}{intent && <p className="mt-4 max-w-2xl text-sm leading-7 text-[#a49c8e]">{intent}</p>}</div>
              {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
            </div>}
            {children}
          </main>
          <footer className="border-t border-[#c7a66a]/20 bg-[#090907]">
            <div className="grid gap-7 px-5 py-8 sm:grid-cols-3 sm:px-7 xl:px-10">
              <div><div className="font-serif text-2xl text-[#d9bb7b]">CW <span className="font-sans text-[10px] font-semibold tracking-[.2em] text-[#f1e8d8]">CYBER WEALTH</span></div><p className="mt-3 max-w-sm text-[10px] leading-6 text-[#817969]">A global digital ecosystem for creative production, technology, intelligence, and ideas built for what comes next.</p></div>
              <div><p className="text-[8px] uppercase tracking-[.24em] text-[#c7a66a]">Explore</p><div className="mt-3 grid gap-2 text-[10px] text-[#a49c8e]"><Link href="/marketplace">Marketplace</Link><Link href="/jasa">Digital services</Link><Link href="/toko">Digital products</Link></div></div>
              <div><p className="text-[8px] uppercase tracking-[.24em] text-[#c7a66a]">Company</p><div className="mt-3 grid gap-2 text-[10px] text-[#a49c8e]"><Link href="/tentang">About Cyber Wealth</Link><Link href="/kontak">Contact</Link><Link href="/privasi">Privacy</Link></div></div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
