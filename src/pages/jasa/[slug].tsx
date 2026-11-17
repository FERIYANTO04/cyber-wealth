import type { GetServerSideProps } from 'next'
import { and, eq } from 'drizzle-orm'
import { StoreFrame } from '@/components/StoreFrame'
import { ServiceDetail } from '@/components/ServiceDetail'
import { db } from '@/lib/db'
import { plans, services } from '@/lib/db/schema'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const slug = String(ctx.params?.slug ?? '')
  const [service] = await db.select().from(services).where(eq(services.slug, slug)).limit(1)
  if (!service || service.status !== 'published') return { notFound: true }

  const retainerRows = await db
    .select()
    .from(plans)
    .where(and(eq(plans.serviceId, service.id), eq(plans.status, 'published')))

  return {
    props: {
      retainers: retainerRows.map((row) => ({
        code: row.code,
        name: row.name,
        summary: row.summary,
        priceIdr: Number(row.priceIdr),
        interval: row.interval,
      })),
      service: {
        slug: service.slug,
        name: service.name,
        summary: service.summary,
        detail: service.detail,
        priceFromIdr: Number(service.priceFromIdr),
        deliveryDays: service.deliveryDays,
      },
    },
  }
}

type Props = {
  retainers: { code: string; name: string; summary: string; priceIdr: number; interval: string }[]
  service: {
    slug: string
    name: string
    summary: string
    detail: string
    priceFromIdr: number
    deliveryDays: number
  }
}

function ServicePage({ service, retainers }: Props) {
  return <ServiceDetail service={service} retainers={retainers} />
}

const Page = ServicePage as PageWithFrame<Props>
Page.getLayout = (page, props) => (
  <StoreFrame
    eyebrow="Layanan digital"
    title={props.service.name}
    intent={props.service.summary}
    back={{ href: '/jasa', label: 'Semua layanan' }}
  >
    {page}
  </StoreFrame>
)
export default Page
