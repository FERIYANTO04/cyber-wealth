import type { GetServerSideProps } from 'next'
import { StoreFrame } from '@/components/StoreFrame'
import { ServiceCatalog, type ServiceItem } from '@/components/ServiceCatalog'
import { SignalLink } from '@/components/ui'
import { getPublishedServices } from '@/lib/services'
import { getSession } from '@/lib/auth'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const [rows, session] = await Promise.all([getPublishedServices(), getSession(ctx.req)])
  return {
    props: {
      isOwner: Boolean(session),
      services: rows.map(
        (row): ServiceItem => ({
          slug: row.slug,
          name: row.name,
          summary: row.summary,
          category: row.category,
          priceFromIdr: Number(row.priceFromIdr),
          deliveryDays: row.deliveryDays,
        })
      ),
    },
  }
}

type Props = { isOwner: boolean; services: ServiceItem[] }

function JasaPage({ services, isOwner }: Props) {
  return <ServiceCatalog services={services} isOwner={isOwner} />
}

const Page = JasaPage as PageWithFrame<Props>
Page.getLayout = (page, props) => (
  <StoreFrame
    eyebrow="Layanan digital"
    title="Video, desain, konten, dan solusi digital"
    intent="Studio kreatif untuk video editing, motion graphics, desain grafis, branding, konten media sosial, website, dan produksi berbantuan AI. Kirim brief untuk mendapatkan ruang lingkup dan penawaran yang sesuai."
    actions={
      props.isOwner ? (
        <SignalLink href="/jasa-admin">Kelola layanan</SignalLink>
      ) : undefined
    }
  >
    {page}
  </StoreFrame>
)
export default Page
