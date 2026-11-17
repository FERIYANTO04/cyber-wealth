import type { GetServerSideProps } from 'next'
import { StoreFrame } from '@/components/StoreFrame'
import { PlanCards, type PlanRow } from '@/components/PlanCards'
import { SignalLink } from '@/components/ui'
import { getPublishedPlans } from '@/lib/saas'
import { getSession } from '@/lib/auth'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const [rows, session] = await Promise.all([getPublishedPlans(), getSession(ctx.req)])
  return {
    props: {
      isOwner: Boolean(session),
      plans: rows.map(
        (row): PlanRow => ({
          code: row.code,
          name: row.name,
          summary: row.summary,
          features: row.features.split('\n').map((line) => line.trim()).filter(Boolean),
          priceIdr: Number(row.priceIdr),
          interval: row.interval,
        })
      ),
    },
  }
}

type Props = { isOwner: boolean; plans: PlanRow[] }

function LanggananPage({ plans, isOwner }: Props) {
  return <PlanCards plans={plans} isOwner={isOwner} />
}

const Page = LanggananPage as PageWithFrame<Props>
Page.getLayout = (page, props) => (
  <StoreFrame
    eyebrow="Langganan aplikasi"
    title="Paket berlangganan"
    intent="Pilih paket, bayar, lalu kelola langganan Anda dari satu halaman."
    actions={props.isOwner ? <SignalLink href="/saas-admin">Kelola paket</SignalLink> : undefined}
  >
    {page}
  </StoreFrame>
)
export default Page
