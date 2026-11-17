import Head from 'next/head'
import type { ReactNode } from 'react'

/**
 * Surface: the member wallet — the referral partner's own area. It is neither the
 * owner console nor the shop: one reading column, no owner navigation, and a single
 * sign-out beside the account's name.
 */
export function MemberFrame({
  title,
  eyebrow,
  intent,
  accountLabel,
  signOut,
  children,
}: {
  title: string
  eyebrow?: string
  intent?: string
  accountLabel?: string
  signOut?: ReactNode
  children: ReactNode
}) {
  return (
    <div data-frame="member" className="min-h-screen bg-canvas">
      <Head>
        <title>{`${title} · Cyber Wealth Autopilot`}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#F7F8F6" />
      </Head>

      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-page py-block">
          <div className="flex items-center gap-2">
            <span className="brand-mark">CW</span>
            <span className="heading-tight text-[0.8125rem] leading-tight">
              Cyber Wealth
              <br />
              Member Area
            </span>
          </div>
          {(accountLabel || signOut) && (
            <div className="flex items-center gap-3">
              {accountLabel && (
                <span className="hidden text-[0.8125rem] text-ink-quiet sm:inline">{accountLabel}</span>
              )}
              {signOut}
            </div>
          )}
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
            Komisi dihitung dari catatan yang disetujui pemilik. Penarikan diproses manual setelah diperiksa — tidak
            ada transfer otomatis.
          </p>
        </div>
      </footer>
    </div>
  )
}
