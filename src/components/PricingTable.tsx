import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { Badge, Button, Panel, Segmented, SignalLink } from '@/components/ui'
import { money } from '@/lib/format'

export type PricingPlan = {
  code: string
  name: string
  summary: string
  features: string[]
  priceIdr: number
  interval: string
}

/** One tier, as its own card. `highlighted` is the tier the page argues for. */
function TierCard({ plan, highlighted }: { plan: PricingPlan; highlighted: boolean }) {
  return (
    <Panel className={highlighted ? 'flex flex-col border-signal' : 'flex flex-col'}>
      <div className="flex flex-1 flex-col gap-3 p-page">
        <div className="flex items-center justify-between gap-2">
          <p className="heading-tight text-base">{plan.name}</p>
          {highlighted && <Badge tone="signal">Paling dipilih</Badge>}
        </div>
        <p className="text-xs leading-relaxed text-ink-quiet">{plan.summary}</p>
        <p className="figure text-[1.5rem] leading-none">
          {plan.priceIdr === 0 ? 'Gratis' : money(plan.priceIdr)}
        </p>
        <p className="text-xs text-ink-quiet">
          {plan.priceIdr === 0 ? 'tanpa kartu, selamanya' : `per ${plan.interval === 'year' ? 'tahun' : 'bulan'}`}
        </p>
        <ul className="mt-1 flex flex-col gap-1.5">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-[0.8125rem] leading-relaxed text-ink">
              <Check className="mt-0.5 size-3.5 shrink-0 text-signal" aria-hidden="true" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
      <div className="panel-foot">
        <Link href={`/langganan/paket/${plan.code}`}>
          <Button variant={highlighted ? 'primary' : 'secondary'} className="w-full">
            {plan.priceIdr === 0 ? 'Mulai gratis' : `Pilih ${plan.name}`}
          </Button>
        </Link>
      </div>
    </Panel>
  )
}

/**
 * The public pricing page's table: three paid tiers with a monthly/yearly switch, the
 * free tier beside them. Prices come from the plans the owner published, never from
 * this file.
 */
export function PricingTable({ plans }: { plans: PricingPlan[] }) {
  const [interval, setInterval] = useState<'month' | 'year'>('month')

  // The free tier always gets its own row below the paid grid, so it is never one of
  // the three columns — otherwise it appears twice on the page.
  const free = plans.find((plan) => plan.priceIdr === 0)
  const current = plans.filter((plan) => plan.interval === interval && plan.priceIdr > 0)
  const highlighted = current.find((plan) => plan.code === 'pro') ?? current[1] ?? current[0]

  return (
    <div className="flex flex-col gap-section">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          value={interval}
          onChange={setInterval}
          label="Periode pembayaran"
          options={[
            { value: 'month', label: 'Bulanan' },
            { value: 'year', label: 'Tahunan · hemat 2 bulan' },
          ]}
        />
        <p className="text-xs leading-relaxed text-ink-quiet">
          Semua harga dalam Rupiah. Pembayaran melalui transfer langsung ke rekening pemilik.
        </p>
      </div>

      {current.length === 0 ? (
        <Panel>
          <div className="p-page">
            <p className="heading-tight text-sm">Paket sedang disiapkan</p>
            <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-quiet">
              Belum ada paket untuk periode ini. Sementara itu,{' '}
              <SignalLink href="/toko">lihat produk digital</SignalLink> yang bisa dibeli satuan.
            </p>
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-block md:grid-cols-3">
          {current.map((plan) => (
            <TierCard key={plan.code} plan={plan} highlighted={plan.code === highlighted?.code} />
          ))}
        </div>
      )}

      {free && (
        <Panel>
          <div className="flex flex-col gap-3 p-page sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="heading-tight text-sm">{free.name} — untuk mencoba tanpa biaya</p>
              <p className="mt-1 max-w-prose text-[0.8125rem] leading-relaxed text-ink-quiet">{free.summary}</p>
            </div>
            <Link href={`/langganan/paket/${free.code}`} className="shrink-0">
              <Button variant="secondary">Mulai gratis</Button>
            </Link>
          </div>
        </Panel>
      )}
    </div>
  )
}
