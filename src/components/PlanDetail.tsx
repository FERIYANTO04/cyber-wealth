import { Badge, Panel, PanelBody, PanelHead } from '@/components/ui'
import { SubscribeForm } from '@/components/SubscribeForm'
import { money } from '@/lib/format'

/** One plan as a buyer sees it, with the subscribe form beneath it. */
export function PlanDetail({
  plan,
}: {
  plan: { code: string; summary: string; features: string[]; priceIdr: number; interval: string }
}) {
  return (
    <div className="flex flex-col gap-stack">
      <Panel>
        <PanelBody>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="signal">
              {money(plan.priceIdr)} /{plan.interval === 'month' ? 'bulan' : plan.interval}
            </Badge>
          </div>
          <p className="text-[0.9375rem] leading-relaxed text-ink">{plan.summary}</p>
          <ul className="flex flex-col gap-1.5">
            {plan.features.map((feature) => (
              <li key={feature} className="text-[0.8125rem] leading-relaxed text-ink-quiet">
                · {feature}
              </li>
            ))}
          </ul>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHead label="Mulai berlangganan" />
        <PanelBody>
          <SubscribeForm code={plan.code} />
        </PanelBody>
      </Panel>
    </div>
  )
}
