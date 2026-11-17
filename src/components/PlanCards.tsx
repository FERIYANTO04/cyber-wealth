import Link from 'next/link'
import { Check } from 'lucide-react'
import { Badge, EmptyState, Panel } from '@/components/ui'
import { money } from '@/lib/format'
import { SignalLink } from '@/components/ui'

export type PlanRow = {
  code: string
  name: string
  summary: string
  features: string[]
  priceIdr: number
  interval: string
}

/** The subscription tiers as a buyer sees them. */
export function PlanCards({ plans, isOwner }: { plans: PlanRow[]; isOwner: boolean }) {
  if (plans.length === 0) {
    return (
      <Panel>
        <EmptyState
          title="Belum ada paket langganan"
          body={
            isOwner
              ? 'Buat paket pertama dari halaman langganan di konsol, lalu terbitkan agar calon pelanggan bisa mendaftar.'
              : 'Paket langganan sedang disiapkan. Silakan kembali lagi nanti.'
          }
          action={isOwner ? <SignalLink href="/saas-admin">Kelola paket langganan</SignalLink> : undefined}
        />
      </Panel>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-block sm:grid-cols-2">
      {plans.map((plan) => (
        <div key={plan.code} className="panel-frame flex flex-col justify-between">
          <div className="flex flex-col gap-2 p-page">
            <div className="flex items-center justify-between gap-2">
              <p className="heading-tight text-[0.9375rem]">{plan.name}</p>
              <Badge tone="signal">{plan.interval === 'month' ? 'Bulanan' : plan.interval}</Badge>
            </div>
            <p className="text-[0.8125rem] leading-relaxed text-ink-quiet">{plan.summary}</p>
            <p className="figure text-lg">
              {money(plan.priceIdr)}
              <span className="ml-1 font-sans text-xs font-normal text-ink-quiet">
                /{plan.interval === 'month' ? 'bulan' : plan.interval}
              </span>
            </p>
            <ul className="flex flex-col gap-1.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-[0.8125rem] leading-relaxed text-ink">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-signal" aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          <div className="panel-foot">
            <Link href={`/langganan/paket/${plan.code}`} className="link-signal">
              Pilih paket ini
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}
