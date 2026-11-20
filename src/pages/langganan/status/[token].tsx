import type { GetServerSideProps } from 'next'
import { and, desc, eq } from 'drizzle-orm'
import { StoreFrame } from '@/components/StoreFrame'
import { SubscriptionStatus, type CycleRow, type SubscriptionDetail } from '@/components/SubscriptionStatus'
import { PageStack } from '@/components/ui'
import { db } from '@/lib/db'
import { billingRequests, emailMessages } from '@/lib/db/schema'
import { getSubscriptionCycles, intervalOf } from '@/lib/billing'
import { getSubscriptionByToken } from '@/lib/saas'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const token = String(ctx.params?.token ?? '')
  const row = await getSubscriptionByToken(token)
  if (!row) return { notFound: true }

  const [cycles, requests, emails] = await Promise.all([
    getSubscriptionCycles(row.id),
    db
      .select()
      .from(billingRequests)
      .where(and(eq(billingRequests.subscriptionId, row.id), eq(billingRequests.status, 'pending')))
      .limit(1),
    db
      .select()
      .from(emailMessages)
      .where(and(eq(emailMessages.toEmail, row.accountEmail.toLowerCase()), eq(emailMessages.relatedType, 'subscription')))
      .orderBy(desc(emailMessages.createdAt))
      .limit(10),
  ])

  const subscription: SubscriptionDetail = {
    token,
    planName: row.planName,
    accountName: row.accountName,
    accountEmail: row.accountEmail,
    amountIdr: Number(row.amountIdr),
    status: row.status,
    interval: intervalOf(row.interval),
    invoiceUrl: row.invoiceUrl,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    periodEnd: row.periodEnd ? row.periodEnd.toISOString() : null,
    autoRenew: row.autoRenew,
    autoRenewAt: row.autoRenewAt ? row.autoRenewAt.toISOString() : null,
    cancelledAt: row.cancelledAt ? row.cancelledAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    requestedKind: (requests[0]?.kind as 'cancel' | 'refund' | undefined) ?? null,
  }

  return {
    props: {
      subscription,
      cycles: cycles.map(
        (cycle): CycleRow => ({
          id: cycle.id,
          periodStart: cycle.periodStart.toISOString(),
          periodEnd: cycle.periodEnd.toISOString(),
          amountIdr: Number(cycle.amountIdr),
          status: cycle.status,
          invoiceUrl: cycle.invoiceUrl,
          paidAt: cycle.paidAt ? cycle.paidAt.toISOString() : null,
          note: cycle.note,
        })
      ),
      emails: emails
        .filter((email) => email.relatedId === row.id || email.kind.startsWith('cycle'))
        .map((email) => ({
          id: email.id,
          kind: email.kind,
          subject: email.subject,
          status: email.status,
          detail: email.detail,
          createdAt: email.createdAt.toISOString(),
        })),
    },
  }
}

type Props = {
  subscription: SubscriptionDetail
  cycles: CycleRow[]
  emails: { id: string; kind: string; subject: string; status: string; detail: string | null; createdAt: string }[]
}

function StatusPage({ subscription, cycles, emails }: Props) {
  return (
    <PageStack>
      <SubscriptionStatus subscription={subscription} cycles={cycles} emails={emails} />
    </PageStack>
  )
}

const Page = StatusPage as PageWithFrame<Props>
Page.getLayout = (page, props) => (
  <StoreFrame
    eyebrow="Dashboard pelanggan"
    title="Status langganan"
    intent={props.subscription.planName}
    back={{ href: '/langganan', label: 'Kembali ke paket' }}
  >
    {page}
  </StoreFrame>
)
export default Page
