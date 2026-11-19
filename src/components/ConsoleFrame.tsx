import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import type { ReactNode } from 'react'
import {
  Bot,
  BriefcaseBusiness,
  Camera,
  LayoutDashboard,
  Link2,
  LogOut,
  Mail,
  Megaphone,
  Package,
  Plug,
  Repeat,
  ScrollText,
  Settings,
  Share2,
  ShieldCheck,
  Store,
  Users,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard', label: 'Ringkasan', short: 'Beranda', icon: LayoutDashboard },
  { href: '/approvals', label: 'Persetujuan', short: 'Setujui', icon: ShieldCheck },
  { href: '/autopilot', label: 'Autopilot', short: 'Autopilot', icon: Bot },
  { href: '/agents', label: 'Agen', short: 'Agen', icon: Users },
  { href: '/jasa-admin', label: 'Jasa digital', short: 'Jasa', icon: BriefcaseBusiness },
  { href: '/produk', label: 'Produk digital', short: 'Produk', icon: Package },
  { href: '/affiliate', label: 'Affiliate', short: 'Affiliate', icon: Link2 },
  { href: '/admin/pelanggan', label: 'Pelanggan & pesan', short: 'Pelanggan', icon: Users },
  { href: '/admin/members', label: 'Anggota & WD', short: 'Anggota', icon: Wallet },
  { href: '/saas-admin', label: 'Langganan', short: 'Langganan', icon: Repeat },
  { href: '/billing', label: 'Tagihan berulang', short: 'Tagihan', icon: Repeat },
  { href: '/email', label: 'Kotak keluar email', short: 'Email', icon: Mail },
  { href: '/finance', label: 'Keuangan Owner', short: 'Owner', icon: Wallet },
  { href: '/company-finance', label: 'Keuangan perusahaan', short: 'Perusahaan', icon: BriefcaseBusiness },
  { href: '/discovery', label: 'Business Discovery', short: 'Discovery', icon: Store },
  { href: '/revenue', label: 'Mesin pendapatan', short: 'Pendapatan', icon: Store },
  { href: '/social', label: 'Studio konten sosial', short: 'Konten', icon: Megaphone },
  { href: '/facebook', label: 'Facebook Page', short: 'Facebook', icon: Share2 },
  { href: '/instagram', label: 'Instagram Bisnis', short: 'Instagram', icon: Camera },
  { href: '/integrasi', label: 'Integrasi', short: 'Integrasi', icon: Plug },
  { href: '/activity', label: 'Log aktivitas', short: 'Log', icon: ScrollText },
  { href: '/settings', label: 'Pengaturan', short: 'Akun', icon: Settings },
]

// The bottom bar on a phone carries the six places the owner visits most; the rest
// live on the full rail. Six is the ceiling: a seventh would push each tab below a
// comfortable thumb target.
const MOBILE_NAV = ['/dashboard', '/approvals', '/autopilot', '/discovery', '/produk', '/integrasi']

function QuietNavButton({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="submit"
      className="nav-quiet w-full"
    >
      {icon}
      {children}
    </button>
  )
}

/** Surface: every page behind the owner login. Owns navigation, the container and the title block. */
export function ConsoleFrame({
  title,
  eyebrow,
  intent,
  actions,
  children,
}: {
  title: string
  eyebrow?: string
  intent?: string
  actions?: ReactNode
  children: ReactNode
}) {
  const router = useRouter()
  const active = (href: string) => router.pathname === href || router.pathname.startsWith(`${href}/`)

  return (
    <div data-frame="console" className="min-h-screen bg-canvas">
      <Head>
        <title>{`${title} · Cyber Wealth Autopilot`}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#F7F8F6" />
      </Head>

      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex items-center gap-2 px-page py-stack">
          <span className="brand-mark">CW</span>
          <span className="heading-tight text-[0.8125rem] leading-tight">
            Cyber Wealth
            <br />
            Autopilot
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-2" aria-label="Navigasi utama">
          {NAV.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active(item.href) ? 'page' : undefined}
                className={cn(
                  'nav-quiet',
                  active(item.href) && 'bg-signal-soft font-medium text-signal hover:bg-signal-soft hover:text-signal'
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-line p-2">
          <form action="/api/auth/logout" method="post">
            <QuietNavButton icon={<LogOut className="size-4" aria-hidden="true" />}>Keluar</QuietNavButton>
          </form>
        </div>
      </aside>

      <div className="lg:pl-56">
        <main className="w-full max-w-console px-page pb-24 pt-stack md:px-6 lg:pb-section lg:pt-section">
          <div className="mb-stack flex flex-col gap-3 border-b border-line pb-stack sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              {eyebrow && (
                <p className="mb-1 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-quiet">
                  {eyebrow}
                </p>
              )}
              <h1 className="heading-tight text-[1.5rem] leading-tight sm:text-[1.75rem]">
                {title}
              </h1>
              {intent && <p className="mt-1 max-w-prose text-[0.8125rem] text-ink-quiet">{intent}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
          </div>
          {children}
        </main>
      </div>

      {/* Mobile bottom bar */}
      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-6 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {NAV.filter((item) => MOBILE_NAV.includes(item.href)).map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(item.href) ? 'page' : undefined}
              className={cn(
                'flex min-h-14 flex-col items-center justify-center gap-1 text-[0.625rem] transition-colors',
                active(item.href) ? 'text-signal' : 'text-ink-quiet'
              )}
            >
              <Icon className="size-[1.125rem]" aria-hidden="true" />
              {item.short}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
