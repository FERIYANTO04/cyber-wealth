import type { GetServerSideProps } from 'next'
import { ConsoleFrame } from '@/components/ConsoleFrame'
import { SaasConsole, type OwnerPlan, type SubscriberRow } from '@/components/SaasConsole'
import { SignalLink } from '@/components/ui'
import { requireOwnerPage } from '@/lib/auth'
import { getOwnerPlans, getSaasTotals, getSubscriptions } from '@/lib/saas'
import { db } from '@/lib/db'
import { services } from '@/lib/db/schema'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }

  const [plans, subs, totals, serviceRows] = await Promise.all([
    getOwnerPlans(),
    getSubscriptions(60),
    getSaasTotals(),
    db.select({ id: services.id, name: services.name }).from(services).orderBy(services.name),
  ])

  return {
    props: {
      totals,
      plans: plans.map(
        (row): OwnerPlan => ({
          id: row.id,
          code: row.code,
          name: row.name,
          summary: row.summary,
          features: row.features,
          priceIdr: Number(row.priceIdr),
          interval: row.interval,
          serviceId: row.serviceId,
          status: row.status,
        })
      ),
      services: serviceRows,
      subscribers: subs.map(
        (row): SubscriberRow => ({
          id: row.id,
          token: row.accessToken,
          planName: row.planName,
          accountName: row.accountName,
          accountEmail: row.accountEmail,
          amountIdr: Number(row.amountIdr),
          status: row.status,
          interval: row.interval,
          autoRenew: row.autoRenew,
          dataSource: row.dataSource as 'live' | 'demo',
          paidAt: row.paidAt ? row.paidAt.toISOString() : null,
          periodEnd: row.periodEnd ? row.periodEnd.toISOString() : null,
          createdAt: row.createdAt.toISOString(),
        })
      ),
    },
  }
}

type Props = {
  plans: OwnerPlan[]
  subscribers: SubscriberRow[]
  totals: { active: number; pending: number; mrrIdr: number }
  services: { id: string; name: string }[]
}

function SaasAdminPage(props: Props) {
  return <SaasConsole {...props} />
}

const Page = SaasAdminPage as PageWithFrame<Props>
Page.getLayout = (page) => (
  <ConsoleFrame
    eyebrow="Mesin 4 · Langganan"
    title="Paket dan pelanggan"
    intent="Kelola paket langganan aplikasi, pantau pelanggan, dan lihat status pembayaran mereka."
    actions={<SignalLink href="/billing">Tagihan berulang</SignalLink>}
  >
    {page}
  </ConsoleFrame>
)
export default Page
