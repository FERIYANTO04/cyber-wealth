import type { GetServerSideProps } from 'next'
import { and, eq } from 'drizzle-orm'
import { StoreFrame } from '@/components/StoreFrame'
import { PlanDetail } from '@/components/PlanDetail'
import { db } from '@/lib/db'
import { plans } from '@/lib/db/schema'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const code = String(ctx.params?.code ?? '')
  const [plan] = await db
    .select()
    .from(plans)
    .where(and(eq(plans.code, code), eq(plans.status, 'published')))
    .limit(1)
  if (!plan) return { notFound: true }
  return {
    props: {
      plan: {
        code: plan.code,
        name: plan.name,
        summary: plan.summary,
        features: plan.features.split('\n').map((line) => line.trim()).filter(Boolean),
        priceIdr: Number(plan.priceIdr),
        interval: plan.interval,
      },
    },
  }
}

type Props = {
  plan: { code: string; name: string; summary: string; features: string[]; priceIdr: number; interval: string }
}

function PlanPage({ plan }: Props) {
  return <PlanDetail plan={plan} />
}

const Page = PlanPage as PageWithFrame<Props>
Page.getLayout = (page, props) => (
  <StoreFrame
    eyebrow="Langganan aplikasi"
    title={props.plan.name}
    intent={props.plan.summary}
    back={{ href: '/langganan', label: 'Semua paket' }}
  >
    {page}
  </StoreFrame>
)
export default Page
