import Link from 'next/link'
import { ArrowUpRight, BriefcaseBusiness, Link2, Package, Repeat } from 'lucide-react'
import { Badge, Panel, PanelBody, PanelHead } from '@/components/ui'
import { compactMoney } from '@/lib/format'

export type EngineStat = {
  key: 'services' | 'products' | 'affiliate' | 'saas'
  label: string
  headline: string
  context: string
  href: string
}

const ICONS = {
  services: BriefcaseBusiness,
  products: Package,
  affiliate: Link2,
  saas: Repeat,
}

/** The four revenue engines in one row — every figure comes from recorded rows. */
export function EngineOverview({ engines, pending }: { engines: EngineStat[]; pending: number }) {
  return (
    <Panel>
      <PanelHead
        label="Empat mesin pendapatan"
        aside={
          pending > 0 ? (
            <Link href="/approvals" className="link-signal">
              {pending} menunggu keputusan
            </Link>
          ) : (
            <Badge tone="neutral">Tidak ada yang menunggu</Badge>
          )
        }
      />
      <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
        {engines.map((engine) => {
          const Icon = ICONS[engine.key]
          return (
            <Link
              key={engine.key}
              href={engine.href}
              className="group flex flex-col gap-2 px-page py-block transition-colors hover:bg-canvas sm:border-r sm:border-line sm:last:border-r-0"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <Icon className="size-3.5 text-signal" aria-hidden="true" />
                  <span className="eyebrow">{engine.label}</span>
                </span>
                <ArrowUpRight
                  className="go-arrow size-3.5"
                  aria-hidden="true"
                />
              </div>
              <p className="figure text-lg leading-none">{engine.headline}</p>
              <p className="text-xs leading-snug text-ink-quiet">{engine.context}</p>
            </Link>
          )
        })}
      </div>
      <div className="panel-foot">
        <PanelBody>
          <p className="text-xs leading-relaxed text-ink-quiet">
            Semua angka di atas dihitung dari catatan yang benar-benar ada di aplikasi. Pendapatan hanya bertambah setelah
            pembayaran transfer diverifikasi pemilik.
          </p>
        </PanelBody>
      </div>
    </Panel>
  )
}

export function enginesFromCounts(args: {
  services: number
  jobs: number
  products: number
  orders: number
  revenueIdr: number
  programs: number
  clicks: number
  commissionIdr: number
  plans: number
  activeSubs: number
  mrrIdr: number
}): EngineStat[] {
  return [
    {
      key: 'services',
      label: 'Jasa digital',
      headline: String(args.services),
      context: `${args.jobs} permintaan masuk · ${args.services} layanan terbit`,
      href: '/jasa-admin',
    },
    {
      key: 'products',
      label: 'Produk digital',
      headline: String(args.products),
      context: `${args.products} terbit · ${args.orders} pesanan · ${compactMoney(args.revenueIdr)} lunas`,
      href: '/produk',
    },
    {
      key: 'affiliate',
      label: 'Affiliate',
      headline: String(args.programs),
      context: `${args.clicks} klik · ${compactMoney(args.commissionIdr)} komisi`,
      href: '/affiliate',
    },
    {
      key: 'saas',
      label: 'Langganan',
      headline: String(args.activeSubs),
      context: `${args.plans} paket · ${compactMoney(args.mrrIdr)} per bulan`,
      href: '/saas-admin',
    },
  ]
}
