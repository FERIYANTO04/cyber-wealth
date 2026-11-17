import Link from 'next/link'
import { ArrowUpRight, BriefcaseBusiness, Link2, Package, Repeat } from 'lucide-react'
import { Badge, Panel, PanelBody } from '@/components/ui'
import { compactMoney } from '@/lib/format'

export type HubEngine = {
  key: 'services' | 'products' | 'affiliate' | 'saas'
  title: string
  description: string
  status: string
  figures: { label: string; value: string }[]
  href: string
  live: boolean
}

const ICONS = {
  services: BriefcaseBusiness,
  products: Package,
  affiliate: Link2,
  saas: Repeat,
}

/** The four engines, each with what it has actually recorded and a way in. */
export function EngineHub({ engines }: { engines: HubEngine[] }) {
  return (
    <Panel>
      <PanelBody>
        <p className="max-w-prose text-[0.8125rem] leading-relaxed text-ink-quiet">
          Empat mesin pendapatan berjalan di atas data yang Anda kelola sendiri. Setiap angka di bawah dihitung dari
          catatan nyata di aplikasi ini — tidak ada pendapatan yang diperkirakan atau dijanjikan.
        </p>
      </PanelBody>
      <div className="grid grid-cols-1 divide-y divide-line border-t border-line sm:grid-cols-2 sm:divide-y-0">
        {engines.map((engine) => {
          const Icon = ICONS[engine.key]
          return (
            <div key={engine.key} className="flex flex-col gap-2 border-line px-page py-stack sm:border-r sm:last:border-r-0">
              <div className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0 text-signal" aria-hidden="true" />
                  <span className="heading-tight text-[0.9375rem]">{engine.title}</span>
                </span>
                <Badge tone={engine.live ? 'signal' : 'neutral'}>{engine.status}</Badge>
              </div>
              <p className="max-w-prose text-xs leading-relaxed text-ink-quiet">{engine.description}</p>
              <dl className="flex flex-wrap gap-x-4 gap-y-1">
                {engine.figures.map((figure) => (
                  <div key={figure.label} className="flex items-baseline gap-1.5">
                    <dt className="text-[0.6875rem] uppercase tracking-wide text-ink-quiet">{figure.label}</dt>
                    <dd className="figure text-[0.8125rem]">{figure.value}</dd>
                  </div>
                ))}
              </dl>
              <Link href={engine.href} className="link-signal inline-flex w-fit items-center gap-1">
                Buka {engine.title.toLowerCase()}
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

export function buildHub(args: {
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
}): HubEngine[] {
  return [
    {
      key: 'services',
      title: 'Jasa digital',
      description: 'Layanan desain, website, konten, dan pemasaran. Klien mengirim brief dari halaman publik; Anda meninjau dan menyusun penawaran.',
      status: args.services > 0 ? 'Terbit' : 'Belum ada layanan',
      figures: [
        { label: 'layanan', value: String(args.services) },
        { label: 'permintaan', value: String(args.jobs) },
      ],
      href: '/jasa-admin',
      live: args.services > 0,
    },
    {
      key: 'products',
      title: 'Produk digital',
      description: 'Template, e-book, dan materi bisnis dengan halaman penjualan dan checkout. Produk terkirim setelah pembayaran terkonfirmasi.',
      status: args.products > 0 ? 'Terbit' : 'Belum ada produk',
      figures: [
        { label: 'terbit', value: String(args.products) },
        { label: 'lunas', value: String(args.orders) },
        { label: 'pendapatan', value: compactMoney(args.revenueIdr) },
      ],
      href: '/produk',
      live: args.products > 0,
    },
    {
      key: 'affiliate',
      title: 'Affiliate',
      description: 'Program affiliate sah, tautan pelacak dengan hitungan klik sendiri, dan komisi yang hanya dicatat dari laporan resmi jaringan.',
      status: args.programs > 0 ? 'Berjalan' : 'Belum ada program',
      figures: [
        { label: 'program', value: String(args.programs) },
        { label: 'klik', value: String(args.clicks) },
        { label: 'komisi', value: compactMoney(args.commissionIdr) },
      ],
      href: '/affiliate',
      live: args.programs > 0,
    },
    {
      key: 'saas',
      title: 'Langganan',
      description: 'Paket berlangganan aplikasi dengan dashboard pelanggan. Langganan aktif hanya setelah pembayaran diverifikasi pemilik setelah dana masuk.',
      status: args.plans > 0 ? 'Terbit' : 'Belum ada paket',
      figures: [
        { label: 'paket', value: String(args.plans) },
        { label: 'aktif', value: String(args.activeSubs) },
        { label: 'per bulan', value: compactMoney(args.mrrIdr) },
      ],
      href: '/saas-admin',
      live: args.plans > 0,
    },
  ]
}
