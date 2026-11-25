import type { GetServerSideProps } from 'next'
import { ConsoleFrame } from '@/components/ConsoleFrame'
import { ServiceDesk, type JobRow, type OwnerService } from '@/components/ServiceDesk'
import { requireOwnerPage } from '@/lib/auth'
import { getOwnerServices, getServiceRequests } from '@/lib/services'
import { aiConfigured } from '@/lib/ai'
import type { PageWithFrame } from '@/lib/frame'
import { sqlClient } from '@/lib/db'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }

  const [services, requests, tokenRows] = await Promise.all([
    getOwnerServices(),
    getServiceRequests(60),
    sqlClient`select id, proposal_token from service_request order by created_at desc limit 100`,
  ])
  const proposalTokens = new Map(tokenRows.map((row) => [String(row.id), row.proposal_token ? String(row.proposal_token) : null]))

  return {
    props: {
      aiReady: aiConfigured(),
      services: services.map(
        (row): OwnerService => ({
          id: row.id,
          slug: row.slug,
          name: row.name,
          summary: row.summary,
          category: row.category,
          priceFromIdr: Number(row.priceFromIdr),
          deliveryDays: row.deliveryDays,
          status: row.status,
        })
      ),
      jobs: requests.map(
        (row): JobRow => ({
          id: row.id,
          code: row.code,
          serviceName: row.serviceName,
          name: row.name,
          email: row.email,
          company: row.company,
          market: row.market,
          brief: row.brief,
          budgetIdr: row.budgetIdr === null ? null : Number(row.budgetIdr),
          status: row.status,
          proposalBody: row.proposalBody,
          proposalAmountIdr: row.proposalAmountIdr === null ? null : Number(row.proposalAmountIdr),
          proposalSource: row.proposalSource,
          proposalToken: proposalTokens.get(row.id) ?? null,
          createdAt: row.createdAt.toISOString(),
        })
      ),
    },
  }
}

type Props = { aiReady: boolean; services: OwnerService[]; jobs: JobRow[] }

function JasaAdminPage({ services, jobs, aiReady }: Props) {
  return <ServiceDesk services={services} jobs={jobs} aiReady={aiReady} />
}

const Page = JasaAdminPage as PageWithFrame<Props>
Page.getLayout = (page) => (
  <ConsoleFrame
    eyebrow="Mesin 1 · Jasa digital"
    title="Layanan dan pesanan jasa"
    intent="Kelola katalog layanan, tinjau brief calon klien, dan susun penawaran untuk mereka."
  >
    {page}
  </ConsoleFrame>
)
export default Page
