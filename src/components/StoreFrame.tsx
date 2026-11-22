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
    { href: '/', label: 'Beranda' },
    { href: '/tentang', label: 'Tentang' },
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/jasa', label: 'Layanan' },
    { href: '/toko', label: 'Produk' },
    { href: '/harga', label: 'Paket' },
    { href: '/faq', label: 'Bantuan' },
  ]
  return (
    <div data-frame="store" data-frame-variant={variant} className="min-h-screen bg-[#08090b] text-[#f3f0e9]">
      <Head>
        <title>{title} — Cyber Wealth</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#08090b" />
        <meta name="description" content={description ?? intent ?? 'Cyber Wealth — digital business solutions'} />
      </Head>
      <div className="border-b border-[#b99a5b]/20 bg-[#0d0e10]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-3 text-[10px] uppercase tracking-[.2em] text-[#9d9688] sm:px-8 lg:px-12">
          <span>Independent digital company</span><span className="hidden sm:block">Strategy · Technology · Growth</span>
        </div>
      </div>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#08090b]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-5 px-5 py-4 sm:px-8 lg:px-12">
          <Link href="/" className="group flex shrink-0 items-center gap-3">
            <span className="flex size-10 items-center justify-center border border-[#c8a96b]/60 text-sm font-semibold tracking-[-.08em] text-[#d7bd86]">CW</span>
            <span><span className="block text-[13px] font-semibold tracking-[.19em] text-[#f4f0e7]">CYBER WEALTH</span><span className="mt-1 block text-[9px] uppercase tracking-[.25em] text-[#958b78]">Digital company</span></span>
          </Link>
          <nav className="hidden items-center gap-7 lg:flex">
            {links.map(({href,label}) => <Link key={href} href={href} className="text-[11px] tracking-[.08em] text-[#aaa69e] transition hover:text-[#d8bd83]">{label}</Link>)}
          </nav>
          <div className="flex shrink-0 items-center gap-3">
            <Link href="/kontak" className="hidden items-center gap-2 border border-[#b99a5b]/60 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[.16em] text-[#d8bd83] transition hover:bg-[#b99a5b] hover:text-[#101010] sm:inline-flex">Hubungi kami <ArrowUpRight className="size-3.5"/></Link>
            <Link href="/masuk" className="text-[10px] uppercase tracking-[.16em] text-[#aaa69e] hover:text-white">Masuk</Link>
          </div>
        </div>
        <nav className="flex gap-6 overflow-x-auto border-t border-white/[.06] px-5 py-3 text-[10px] tracking-[.1em] text-[#aaa69e] lg:hidden sm:px-8">
          {links.map(({href,label}) => <Link key={href} href={href} className="shrink-0 hover:text-[#d8bd83]">{label}</Link>)}
          <Link href="/kontak" className="shrink-0 text-[#d8bd83]">Kontak</Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-[1440px] px-5 pb-24 pt-9 sm:px-8 sm:pt-12 lg:px-12">
        {back && <Link href={back.href} className="mb-6 inline-flex items-center gap-2 text-xs text-[#a49d8e] hover:text-[#d8bd83]">← {back.label}</Link>}
        <div className={variant === 'wide' ? 'mb-10 flex flex-col gap-5 border-b border-[#b99a5b]/20 pb-9 sm:flex-row sm:items-end sm:justify-between' : 'mb-8 flex flex-col gap-4 border-b border-[#b99a5b]/20 pb-7 sm:flex-row sm:items-end sm:justify-between'}>
          <div>{eyebrow && <p className="mb-3 font-mono text-[10px] uppercase tracking-[.24em] text-[#c5a66a]">{eyebrow}</p>}<h1 className="max-w-4xl text-3xl font-medium leading-[1.12] tracking-[-.045em] text-[#f3f0e9] sm:text-4xl lg:text-5xl">{title}</h1>{intent && <p className="mt-4 max-w-2xl text-sm leading-7 text-[#a9a49a]">{intent}</p>}</div>
          {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </div>
        {children}
      </main>
      <footer className="border-t border-[#b99a5b]/20 bg-[#0d0e10]">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr] lg:px-12">
          <div><div className="text-xs font-semibold tracking-[.2em]">CYBER WEALTH</div><p className="mt-3 max-w-sm text-xs leading-6 text-[#969187]">Membangun pengalaman digital yang terarah, fungsional, dan dirancang untuk mendukung perkembangan bisnis.</p></div>
          <div><p className="text-[10px] uppercase tracking-[.2em] text-[#c5a66a]">Explore</p><div className="mt-4 grid gap-3 text-xs text-[#aaa69e]"><Link href="/tentang">Tentang perusahaan</Link><Link href="/jasa">Layanan digital</Link><Link href="/toko">Produk digital</Link><Link href="/harga">Paket & harga</Link></div></div>
          <div><p className="text-[10px] uppercase tracking-[.2em] text-[#c5a66a]">Information</p><div className="mt-4 grid gap-3 text-xs text-[#aaa69e]"><Link href="/faq">Pusat bantuan</Link><Link href="/karier">Karier & kolaborasi</Link><Link href="/kontak">Hubungi kami</Link><Link href="/privasi">Kebijakan privasi</Link><Link href="/syarat">Syarat layanan</Link></div></div>
        </div>
        <div className="border-t border-white/[.06]"><div className="mx-auto flex max-w-[1440px] flex-wrap justify-between gap-3 px-5 py-5 text-[10px] tracking-[.08em] text-[#77736b] sm:px-8 lg:px-12"><span>© 2026 CYBER WEALTH. ALL RIGHTS RESERVED.</span><span>DESIGNED WITH INTENTION.</span></div></div>
      </footer>
    </div>
  )
}
