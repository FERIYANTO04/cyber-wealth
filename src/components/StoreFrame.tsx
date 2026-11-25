import Head from 'next/head'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowUpRight, Menu } from 'lucide-react'

export function StoreFrame({ title, eyebrow, intent, actions, back, variant = 'reading', description, children }: {
  title: string; eyebrow?: string; intent?: string; actions?: ReactNode
  back?: { href: string; label: string }; variant?: 'reading' | 'wide'
  description?: string; children: ReactNode
}) {
  const links = [
    { href: '/', label: 'Overview' },
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/kreator', label: 'Creator & Media' },
    { href: '/media', label: 'Video & Film' },
    { href: '/showroom', label: '3D Studio' },
    { href: '/jasa', label: 'Digital Services' },
    { href: '/toko', label: 'Products' },
    { href: '/harga', label: 'Pricing' },
  ]
  return (
    <div data-frame="store" data-frame-variant={variant} className="min-h-screen overflow-hidden bg-[#080806] text-[#f3eee3]">
      <Head>
        <title>{title} — Cyber Wealth</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#080806" />
        <meta name="description" content={description ?? intent ?? 'Cyber Wealth — digital business solutions'} />
      </Head>
      <header className="relative z-40 border-b border-[#c7a66a]/20 bg-[#090907]/95">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-5 px-5 py-5 sm:px-8 lg:px-12">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <span className="font-serif text-4xl leading-none text-[#d9bb7b]">CW</span>
            <span className="h-9 w-px bg-[#c7a66a]/45"/>
            <span><span className="block text-[12px] font-semibold tracking-[.22em] text-[#f4ead5] sm:text-sm">CYBER WEALTH</span><span className="mt-1 block text-[8px] uppercase tracking-[.38em] text-[#9b8b6c]">Digital ecosystem</span></span>
          </Link>
          <nav className="hidden items-center gap-5 xl:flex">
            {links.map((l) => <Link key={l.href} href={l.href} className="whitespace-nowrap text-[10px] font-medium tracking-wide text-[#b7b0a2] transition hover:text-[#e4c789]">{l.label}</Link>)}
          </nav>
          <Link href="/kontak" className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#c7a66a]/60 px-4 py-2.5 text-[9px] font-bold uppercase tracking-[.15em] text-[#e4c789] transition hover:bg-[#c7a66a] hover:text-black">Contact <ArrowUpRight className="size-3.5"/></Link>
        </div>
        <nav className="flex gap-5 overflow-x-auto border-t border-white/[.06] px-5 py-3 sm:px-8 lg:px-12 xl:hidden">
          {links.map((l) => <Link key={l.href} href={l.href} className="shrink-0 whitespace-nowrap text-[10px] text-[#a8a092] hover:text-[#e4c789]">{l.label}</Link>)}
        </nav>
      </header>
      <div className="relative">
        <div className="pointer-events-none absolute -right-48 -top-36 size-[580px] rounded-full border border-[#c7a66a]/10"/>
        <div className="pointer-events-none absolute -right-24 -top-24 size-[430px] rounded-full border border-[#c7a66a]/10"/>
        <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-[48vw] bg-[radial-gradient(ellipse_at_80%_20%,rgba(190,151,79,.13),transparent_58%)]"/>
        <div className="relative mx-auto w-full max-w-[1600px] px-5 pb-20 pt-8 sm:px-8 sm:pt-10 lg:px-12 lg:pt-12">
          {back && <Link href={back.href} className="mb-6 inline-flex items-center gap-2 text-xs text-[#a79c87] hover:text-[#e4c789]">← {back.label}</Link>}
          {(eyebrow || title || intent || actions) && <div className={variant === 'wide' ? 'mb-9 flex flex-col gap-5 border-b border-[#c7a66a]/20 pb-8 sm:flex-row sm:items-end sm:justify-between' : 'mb-8 flex flex-col gap-4 border-b border-[#c7a66a]/20 pb-7 sm:flex-row sm:items-end sm:justify-between'}>
            <div>{eyebrow && <p className="mb-3 font-mono text-[9px] uppercase tracking-[.28em] text-[#d0ad6e]">{eyebrow}</p>}<h1 className="max-w-4xl text-3xl font-semibold leading-[1.05] tracking-[-.045em] text-[#f5efe4] sm:text-4xl lg:text-5xl">{title}</h1>{intent && <p className="mt-4 max-w-2xl text-sm leading-7 text-[#a49c8e]">{intent}</p>}</div>
            {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
          </div>}
          {children}
        </div>
      </div>
      <footer className="border-t border-[#c7a66a]/20 bg-[#090907]">
        <div className="mx-auto grid max-w-[1600px] gap-8 px-5 py-10 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr] lg:px-12">
          <div><div className="font-serif text-3xl text-[#d9bb7b]">CW <span className="font-sans text-xs font-semibold tracking-[.2em] text-[#f1e8d8]">CYBER WEALTH</span></div><p className="mt-3 max-w-sm text-xs leading-6 text-[#817969]">A global digital ecosystem for creative production, technology, intelligence, and ideas built for what comes next.</p></div>
          <div><p className="text-[9px] uppercase tracking-[.24em] text-[#c7a66a]">Explore</p><div className="mt-4 grid gap-3 text-xs text-[#a49c8e]"><Link href="/marketplace">Marketplace</Link><Link href="/jasa">Digital services</Link><Link href="/toko">Digital products</Link></div></div>
          <div><p className="text-[9px] uppercase tracking-[.24em] text-[#c7a66a]">Company</p><div className="mt-4 grid gap-3 text-xs text-[#a49c8e]"><Link href="/tentang">About Cyber Wealth</Link><Link href="/kontak">Contact</Link><Link href="/privasi">Privacy</Link></div></div>
        </div>
      </footer>
    </div>
  )
}
