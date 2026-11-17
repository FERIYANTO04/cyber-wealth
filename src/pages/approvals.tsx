import type { GetServerSideProps } from 'next'
import { ConsoleFrame } from '@/components/ConsoleFrame'
import { ApprovalBoard } from '@/components/ApprovalBoard'
import { CountNote } from '@/components/ui'
import { requireOwnerPage } from '@/lib/auth'
import { getPendingProposals, getRecentDecisions } from '@/lib/data'
import type { PageWithFrame } from '@/lib/frame'
import type { ProposalItem } from '@/components/ProposalCard'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }
  const pending = await getPendingProposals()
  const decided = await getRecentDecisions(15)

  return {
    props: {
      pending: pending.map(
        (row): ProposalItem => ({
          id: row.proposal.id,
          title: row.proposal.title,
          summary: row.proposal.summary,
          category: row.proposal.category,
          amountIdr: row.proposal.amountIdr === null ? null : Number(row.proposal.amountIdr),
          risk: row.proposal.risk,
          status: row.proposal.status,
          decidedAt: row.proposal.decidedAt ? row.proposal.decidedAt.toISOString() : null,
          decisionNote: row.proposal.decisionNote,
          dataSource: row.proposal.dataSource as 'live' | 'demo',
          createdAt: row.proposal.createdAt.toISOString(),
          agentName: row.agentName,
          agentRole: row.agentRole,
        })
      ),
      decided: decided.map(
        (row): ProposalItem => ({
          id: row.id,
          title: row.title,
          summary: row.summary,
          category: row.category,
          amountIdr: row.amountIdr === null ? null : Number(row.amountIdr),
          risk: row.risk,
          status: row.status,
          decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
          decisionNote: row.decisionNote,
          dataSource: row.dataSource as 'live' | 'demo',
          createdAt: row.createdAt.toISOString(),
          agentName: null,
          agentRole: null,
        })
      ),
    },
  }
}

const Page = ApprovalBoard as PageWithFrame<{ pending: ProposalItem[]; decided: ProposalItem[] }>
Page.getLayout = (page, props) => (
  <ConsoleFrame
    eyebrow="Kendali pemilik"
    title="Pusat persetujuan"
    intent="AI tidak dapat membelanjakan dana, memindahkan uang, menandatangani kontrak, atau berinvestasi tanpa keputusan Anda di sini."
    actions={<CountNote>{`${props.pending.length} menunggu`}</CountNote>}
  >
    {page}
  </ConsoleFrame>
)
export default Page
