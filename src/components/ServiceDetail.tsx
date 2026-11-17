import { Badge, Panel, PanelBody, PanelHead } from '@/components/ui'
import { ServiceBriefForm } from '@/components/ServiceBriefForm'
import { RetainerList, type Retainer } from '@/components/RetainerList'
import { money } from '@/lib/format'

/** One service as a client sees it, with the brief form beneath it. */
export function ServiceDetail({
  service,
  retainers,
}: {
  service: { slug: string; detail: string; priceFromIdr: number; deliveryDays: number }
  retainers: Retainer[]
}) {
  return (
    <div className="flex flex-col gap-stack">
      <Panel>
        <PanelBody>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="signal">Mulai {money(service.priceFromIdr)}</Badge>
            <Badge>{service.deliveryDays} hari kerja</Badge>
          </div>
          <p className="text-[0.9375rem] leading-relaxed text-ink">{service.detail}</p>
        </PanelBody>
      </Panel>

      <RetainerList retainers={retainers} />

      <Panel>
        <PanelHead label="Kirim brief" />
        <PanelBody>
          <ServiceBriefForm slug={service.slug} />
        </PanelBody>
      </Panel>
    </div>
  )
}
