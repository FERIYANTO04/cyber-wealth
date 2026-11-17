import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Badge, EmptyState, Panel, SignalLink } from '@/components/ui'
import { money } from '@/lib/format'

export type ServiceItem = {
  slug: string
  name: string
  summary: string
  category: string
  priceFromIdr: number
  deliveryDays: number
}

const CATEGORY: Record<string, string> = {
  desain: 'Desain',
  website: 'Website',
  konten: 'Konten',
  pemasaran: 'Pemasaran digital',
}

/** The agency's offer list — what can be ordered, and from what price. */
export function ServiceCatalog({ services, isOwner }: { services: ServiceItem[]; isOwner: boolean }) {
  if (services.length === 0) {
    return (
      <Panel>
        <EmptyState
          title="Belum ada layanan yang ditawarkan"
          body={
            isOwner
              ? 'Tambahkan layanan pertama dari halaman jasa di konsol, lalu terbitkan agar calon klien bisa mengirim brief.'
              : 'Daftar layanan sedang disiapkan. Silakan kembali lagi nanti.'
          }
          action={
            isOwner ? (
              <SignalLink href="/jasa-admin">Kelola layanan</SignalLink>
            ) : undefined
          }
        />
      </Panel>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-block sm:grid-cols-2">
      {services.map((service) => (
        <Link
          key={service.slug}
          href={`/jasa/${service.slug}`}
          className="panel-frame group flex flex-col justify-between p-page transition-colors hover:border-signal/40"
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <Badge>{CATEGORY[service.category] ?? service.category}</Badge>
              <ArrowUpRight
                className="go-arrow size-4 shrink-0"
                aria-hidden="true"
              />
            </div>
            <p className="mt-2 heading-tight text-[0.9375rem] leading-snug">{service.name}</p>
            <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-quiet">{service.summary}</p>
          </div>
          <p className="mt-3 font-mono text-xs text-ink-quiet">
            Mulai {money(service.priceFromIdr)} · {service.deliveryDays} hari kerja
          </p>
        </Link>
      ))}
    </div>
  )
}
