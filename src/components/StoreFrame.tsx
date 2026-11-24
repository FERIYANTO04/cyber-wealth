import Head from 'next/head'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowUpRight, BadgeDollarSign, CircleHelp, Clapperboard, Compass, Film, Grid2X2, Home, Info, Layers3, Mail, Package, Sparkles } from 'lucide-react'

export function StoreFrame({ title, eyebrow, intent, actions, back, variant = 'reading', description, children }: {
  title: string; eyebrow?: string; intent?: string; actions?: ReactNode
  back?: { href: string; label: string }; variant?: 'reading' | 'wide'
  description?: string; children: ReactNode
}) {
  const groups = [
    { label: 'WORKSPACE', links: [
      { href: '/', label: 'Overview', icon: Home },
      { href: '/marketplace', label: 'Marketplace', icon: Grid2X2 },
      { href: '/kreator', label: 'Creator & Media', icon: Clapperboard },
      { href: '/media', label: 'Video & Media', icon: Film },
      { href: '/showroom', label: '3D Studio', icon: Sparkles },
      { href: '/jasa', label: 'Layanan digital', icon: Layers3 },
      { href: '/toko', label: 'Produk digital', icon: Package },
    ]},
    { label: 'DISCOVER', links: [
      { href: '/harga', label: 'Paket & harga', icon: BadgeDollarSign },
      { href: '/tentang', label: 'Tentang kami', icon: Info },
      { href: '/faq', label: 'Pusat bantuan', icon: CircleHelp },
    ]},
  ]
  return (
    <div data-frame="store" data-frame-variant={variant} className="min-h-screen bg-[#080b11] text-[#edf2fa]">
      <Head>
        <title>{title} — Cyber Wealth</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#080b11" />
        <meta name="description" content={description ?? intent ?? 'Cyber Wealth — digital business solutions'} />
      </Head>
      <div className="min-h-screen lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
        <aside className="relative z-40 border-b border-white/10 bg-[#0b1019] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r lg:border-white/10">
          <div className="flex items-center justify-between px-5 py-5 lg:px-6 lg:py-7">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl border border-[#55d6b5]/40 bg-[#55d6b5]/10 text-sm font-bold tracking-tight text-[#55d6b5] shadow-[0_0_28px_rgba(85,214,181,.10)]">CW</span>
              <span><span className="block text-[13px] font-bold tracking-[.16em] text-white">CYBER WEALTH</span><span className="mt-1 block text-[9px] uppercase tracking-[.22em] text-slate-500">Digital ecosystem</span></span>
            </Link>
            <span className="hidden rounded-full border border-[#55d6b5]/20 bg-[#55d6b5]/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-[#55d6b5] lg:inline-flex">Online</span>
          </div>
          <div className="hidden px-4 pb-5 lg:block">
            <div className="rounded-xl border border-white/[.07] bg-gradient-to-br from-[#142333] to-[#0e1520] p-4">
              <div className="flex items-center gap-2 text-[#55d6b5]"><Sparkles className="size-4"/><span className="text-[10px] font-semibold uppercase tracking-[.18em]">Digital solutions</span></div>
              <p className="mt-2 text-xs leading-5 text-slate-400">Satu tempat untuk layanan kreatif dan produk digital bisnis Anda.</p>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:gap-7 lg:overflow-y-auto lg:px-4 lg:pb-5">
            {groups.map(group => <div key={group.label} className="flex shrink-0 gap-1 lg:flex-col">
              <p className="hidden px-3 pb-2 font-mono text-[9px] font-semibold tracking-[.2em] text-slate-600 lg:block">{group.label}</p>
              {group.links.map(({href,label,icon:Icon}) => <Link key={href} href={href} className="group flex min-h-10 shrink-0 items-center gap-3 rounded-lg border border-transparent px-3 text-[11px] font-medium text-slate-400 transition hover:border-white/[.06] hover:bg-white/[.05] hover:text-white lg:w-full lg:text-[12px]">
                <Icon className="size-4 shrink-0 text-slate-500 transition group-hover:text-[#55d6b5]"/><span>{label}</span><ArrowUpRight className="ml-auto hidden size-3 text-slate-600 group-hover:block"/>
              </Link>)}
            </div>)}
          </nav>
          <div className="hidden border-t border-white/[.07] p-4 lg:block">
            <Link href="/kontak" className="flex items-center justify-between rounded-xl bg-[#55d6b5] px-4 py-3 text-[11px] font-bold text-[#07110f] transition hover:bg-[#7ce7cb]">
              <span className="flex items-center gap-2"><Mail className="size-4"/> Hubungi tim kami</span><ArrowUpRight className="size-4"/>
            </Link>
            <Link href="/masuk" className="mt-3 flex min-h-10 items-center justify-center rounded-lg border border-white/10 text-[11px] font-medium text-slate-400 transition hover:border-white/20 hover:text-white">Masuk ke akun <ArrowUpRight className="ml-2 size-3"/></Link>
            <p className="mt-5 text-center font-mono text-[9px] tracking-wider text-slate-600">© 2026 CYBER WEALTH</p>
          </div>
        </aside>
        <div className="min-w-0">
          <div className="sticky top-0 z-30 flex h-[58px] items-center justify-between border-b border-white/[.07] bg-[#080b11]/85 px-5 backdrop-blur-xl sm:px-8 lg:px-10">
            <div className="flex items-center gap-2 text-[10px] tracking-wide text-slate-500"><Compass className="size-3.5 text-[#55d6b5]"/> Cyber Wealth <span className="text-slate-700">/</span> <span className="text-slate-300">{eyebrow?.split('/').pop()?.trim() || 'Workspace'}</span></div>
            <div className="flex items-center gap-3"><span className="hidden text-[10px] text-slate-500 sm:block">Digital services & products</span><Link href="/kontak" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[10px] font-semibold text-slate-300 transition hover:border-[#55d6b5]/40 hover:text-[#55d6b5]">Contact <ArrowUpRight className="size-3"/></Link></div>
          </div>
          <main className="mx-auto w-full max-w-[1500px] px-5 pb-20 pt-8 sm:px-8 sm:pt-10 lg:px-10 lg:pt-12">
            {back && <Link href={back.href} className="mb-6 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-[#55d6b5]">← {back.label}</Link>}
            <div className={variant === 'wide' ? 'mb-9 flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between' : 'mb-8 flex flex-col gap-4 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between'}>
              <div>{eyebrow && <p className="mb-3 font-mono text-[10px] uppercase tracking-[.22em] text-[#55d6b5]">{eyebrow}</p>}<h1 className="max-w-4xl text-3xl font-semibold leading-[1.1] tracking-[-.045em] text-white sm:text-4xl lg:text-5xl">{title}</h1>{intent && <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">{intent}</p>}</div>
              {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
            </div>
            {children}
          </main>
          <footer className="border-t border-white/[.07] bg-[#0b1019]">
            <div className="mx-auto grid max-w-[1500px] gap-8 px-5 py-10 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr] lg:px-10">
              <div><div className="text-xs font-bold tracking-[.2em] text-white">CYBER WEALTH</div><p className="mt-3 max-w-sm text-xs leading-6 text-slate-500">Digital services, creative solutions, and products designed to help businesses move forward.</p></div>
              <div><p className="text-[10px] uppercase tracking-[.2em] text-[#55d6b5]">Explore</p><div className="mt-4 grid gap-3 text-xs text-slate-400"><Link href="/jasa">Layanan digital</Link><Link href="/toko">Produk digital</Link><Link href="/harga">Paket & harga</Link></div></div>
              <div><p className="text-[10px] uppercase tracking-[.2em] text-[#55d6b5]">Support</p><div className="mt-4 grid gap-3 text-xs text-slate-400"><Link href="/faq">Pusat bantuan</Link><Link href="/kontak">Kontak</Link><Link href="/privasi">Privasi</Link><Link href="/syarat">Syarat layanan</Link></div></div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
