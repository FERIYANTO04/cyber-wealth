import Head from 'next/head'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'

/**
 * Surface: the public storefront. Anyone can reach these pages — no login — so the
 * frame is its own: a quiet masthead, one centred reading column, and no console
 * navigation. It shares the palette and type of the console on purpose.
 */
export function StoreFrame({
  title,
  eyebrow,
  intent,
  actions,
  back,
  variant = 'reading',
  description,
  children,
}: {
  title: string
  eyebrow?: string
  intent?: string
  actions?: ReactNode
  back?: { href: string; label: string }
  /** `reading` is one centred column; `wide` is the marketing front, one size up. */
  variant?: 'reading' | 'wide'
  /** Overrides the meta description when the page needs its own. */
  description?: string
  children: ReactNode
}) {
  return (
    <div
      data-frame="store"
      data-frame-variant={variant}
      className="min-h-screen bg-canvas"
    >
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#F7F8F6" />
        <meta name="description" content={description ?? intent ?? 'Katalog produk digital.'} />
      </Head>

      <header className="border-b border-line bg-surface">
        <div
          className={
            variant === 'wide'
              ? 'mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-page py-block'
              : 'mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-page py-block'
          }
        >
          <Link href="/toko" className="flex items-center gap-2">
            <span className="brand-mark">CW</span>
            <span className="heading-tight text-[0.8125rem] leading-tight">
              Cyber Wealth
              <br />
              Digital Store
            </span>
          </Link>
          <nav aria-label="Navigasi utama" className="flex items-center gap-1">
            <Link href="/toko" className="nav-quiet">
              Produk
            </Link>
            <Link href="/harga" className="nav-quiet">
              Harga
            </Link>
            <Link href="/faq" className="nav-quiet hidden sm:flex">
              FAQ
            </Link>
            <Link href="/kontak" className="nav-quiet hidden sm:flex">
              Kontak
            </Link>
            <Link href="/masuk" className="nav-quiet hidden md:flex">
              Masuk
            </Link>
          </nav>
        </div>
      </header>

      <main
        className={
          variant === 'wide'
            ? 'mx-auto w-full max-w-5xl px-page pb-section pt-section'
            : 'mx-auto w-full max-w-3xl px-page pb-section pt-stack'
        }
      >
        {back && (
          <Link
            href={back.href}
            className="mb-block inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-quiet transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            {back.label}
          </Link>
        )}

        <div
          className={
            variant === 'wide'
              ? 'hidden'
              : 'mb-stack flex flex-col gap-3 border-b border-line pb-stack sm:flex-row sm:items-end sm:justify-between'
          }
        >
          <div className="min-w-0">
            {eyebrow && (
              <p className="mb-1 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-quiet">{eyebrow}</p>
            )}
            <h1 className="heading-tight text-[1.5rem] leading-tight sm:text-[1.875rem]">{title}</h1>
            {intent && <p className="mt-1.5 max-w-prose text-[0.875rem] leading-relaxed text-ink-quiet">{intent}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>

        {children}
      </main>

      <footer className="border-t border-line">
        <div
          className={
            variant === 'wide'
              ? 'mx-auto flex w-full max-w-5xl flex-col gap-block px-page py-section'
              : 'mx-auto w-full max-w-3xl px-page py-stack'
          }
        >
          {variant === 'wide' && (
            <nav aria-label="Informasi" className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <Link href="/harga" className="link-quiet">
                Harga
              </Link>
              <Link href="/faq" className="link-quiet">
                Tanya jawab
              </Link>
              <Link href="/kontak" className="link-quiet">
                Kontak
              </Link>
              <Link href="/privasi" className="link-quiet">
                Kebijakan privasi
              </Link>
              <Link href="/syarat" className="link-quiet">
                Syarat layanan
              </Link>
            </nav>
          )}
          <p className="text-xs leading-relaxed text-ink-quiet">
            Produk digital dikirim setelah pemilik memverifikasi dana masuk ke rekening.
          </p>
        </div>
      </footer>
    </div>
  )
}
