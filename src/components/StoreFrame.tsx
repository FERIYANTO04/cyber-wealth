import Head from 'next/head'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowUpRight, Box, BriefcaseBusiness, CircleHelp, Home, LayoutDashboard, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react'

export function StoreFrame({ title, eyebrow, intent, actions, back, variant = 'reading', description, children }: {
  title: string; eyebrow?: string; intent?: string; actions?: ReactNode
  back?: { href: string; label: string }; variant?: 'reading' | 'wide'
  description?: string; children: ReactNode
}) {
  const links = [
    { href: '/', label: 'Beranda', icon: Home },
    { href: '/jasa', label: 'Layanan', icon: BriefcaseBusiness },
    { href: '/toko', label: 'Produk digital', icon: Box },
    { href: '/harga', label: 'Paket & harga', icon: Sparkles },
    { href: '/faq', label: 'Pusat bantuan', icon: CircleHelp },
    { href: '/kontak', label: 'Hubungi kami', icon: MessageCircle },
  ]
  return (
    <div data-frame="store" data-frame-variant={variant} className="min-h-screen bg-canvas text-ink">
      <Head>
        <title>{title} — Cyber Wealth</title><meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#090b10" />
        <meta name="description" content={description ?? intent ?? 'Cyber Wealth — platform digital untuk bisnis'} />
      </Head>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[248px] flex-col border-r border-line bg-surface lg:flex">
        <Link href="/" className="flex items-center gap-3 border-b border-line px-6 py-6">
          <span className="brand-mark !size-10 !rounded-xl !bg-signal !text-white">CW</span>
          <span><span className="block text-sm font-bold tracking-wide text-ink">CYBER WEALTH</span><span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[.2em] text-ink-quiet">Digital company</span></span>
        </Link>
        <div className="px-4 pt-7"><p className="eyebrow px-3 pb-3">Jelajahi</p>
          {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="nav-quiet !min-h-11 !rounded-xl"><Icon className="size-4"/> {label}</Link>)}
        </div>
        <div className="mt-auto p-4">
          <div className="rounded-2xl border border-line bg-canvas p-4"><div className="flex items-center gap-2 text-xs font-semibold"><ShieldCheck className="size-4 text-signal"/> Transaksi transparan</div><p className="mt-2 text-xs leading-5 text-ink-quiet">Informasi produk, layanan, dan pembayaran dijelaskan sebelum Anda memesan.</p></div>
          <p className="px-2 pt-4 font-mono text-[10px] tracking-wider text-ink-quiet">CYBER WEALTH © 2026</p>
        </div>
      </aside>
      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
            <Link href="/" className="flex items-center gap-2 lg:hidden"><span className="brand-mark !bg-signal !text-white">CW</span><span className="text-sm font-bold">CYBER WEALTH</span></Link>
            <nav className="flex min-w-0 items-center gap-1 overflow-x-auto text-xs sm:gap-2">
              {links.map(({ href, label }) => <Link key={href} href={href} className="whitespace-nowrap rounded-lg px-2.5 py-2 text-ink-quiet transition hover:bg-signal-soft hover:text-signal">{label}</Link>)}
            </nav>
            <Link href="/masuk" className="shrink-0 rounded-xl border border-line px-4 py-2 text-xs font-semibold text-ink transition hover:border-signal hover:text-signal">Masuk <ArrowUpRight className="ml-1 inline size-3.5"/></Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-8 sm:pt-10">
          {back && <Link href={back.href} className="mb-5 inline-flex items-center gap-2 text-xs text-ink-quiet hover:text-ink">← {back.label}</Link>}
          <div className={variant === 'wide' ? 'mb-8 flex flex-col gap-4 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between' : 'mb-7 flex flex-col gap-3 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between'}>
            <div>{eyebrow && <p className="mb-2 font-mono text-[10px] uppercase tracking-[.22em] text-signal">{eyebrow}</p>}<h1 className="heading-tight text-3xl leading-tight sm:text-4xl">{title}</h1>{intent && <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-quiet">{intent}</p>}</div>
            {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
          </div>
          {children}
        </main>
        <footer className="border-t border-line"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-[11px] text-ink-quiet sm:px-8"><span>© 2026 Cyber Wealth. Platform & digital solutions.</span><div className="flex gap-4"><Link href="/privasi">Privasi</Link><Link href="/syarat">Ketentuan</Link><Link href="/kontak">Kontak</Link></div></div></footer>
      </div>
    </div>
  )
}
