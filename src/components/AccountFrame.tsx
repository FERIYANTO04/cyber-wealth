import Head from 'next/head'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Surface: the buyer's own account. Signed-in, so it is neither the shopfront nor the
 * owner console — a masthead with a quiet local navigation, one reading column, and a
 * one-line footer. The shop pages stay on the store frame.
 */
export function AccountFrame({
  title,
  eyebrow,
  intent,
  active,
  children,
}: {
  title: string
  eyebrow?: string
  intent?: string
  active: string
  children: ReactNode
}) {
  const nav = [
    { href: '/akun', label: 'Pesanan saya' },
    { href: '/toko', label: 'Katalog' },
    { href: '/harga', label: 'Paket' },
    { href: '/kontak', label: 'Bantuan' },
  ]

  return (
    <div data-frame="account" className="min-h-screen bg-canvas">
      <Head>
        <title>{`${title} · Cyber Wealth Autopilot`}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#F7F8F6" />
        <meta name="robots" content="noindex" />
      </Head>

      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-page py-block">
          <Link href="/akun" className="flex items-center gap-2">
            <span className="brand-mark">CW</span>
            <span className="heading-tight text-[0.8125rem] leading-tight">
              Cyber Wealth
              <br />
              Akun pembeli
            </span>
          </Link>
          <nav aria-label="Navigasi akun" className="flex flex-wrap items-center gap-3">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn('nav-quiet', active === item.href && 'text-ink')}
                aria-current={active === item.href ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-page pb-section pt-stack">
        <div className="mb-stack flex flex-col gap-2 border-b border-line pb-stack">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="heading-tight text-[1.5rem] leading-tight sm:text-[1.75rem]">{title}</h1>
          {intent && <p className="max-w-prose text-[0.8125rem] leading-relaxed text-ink-quiet">{intent}</p>}
        </div>
        {children}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto w-full max-w-3xl px-page py-stack">
          <p className="text-xs leading-relaxed text-ink-quiet">
            Pembayaran dicatat setelah pemilik memverifikasi dana masuk. Unduhan tersedia selama pesanan berstatus
            lunas.
          </p>
        </div>
      </footer>
    </div>
  )
}
