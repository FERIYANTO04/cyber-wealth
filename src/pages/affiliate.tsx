import type { GetServerSideProps } from 'next'
import { ConsoleFrame } from '@/components/ConsoleFrame'
import { AffiliateDesk, type CommissionRow, type LinkRow, type ProgramRow } from '@/components/AffiliateDesk'
import { requireOwnerPage } from '@/lib/auth'
import { getAffiliateTotals, getCommissions, getLinks, getPrograms } from '@/lib/affiliate'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }

  const [programs, links, commissions, totals] = await Promise.all([
    getPrograms(),
    getLinks(),
    getCommissions(),
    getAffiliateTotals(),
  ])

  const host = ctx.req.headers['x-forwarded-host'] ?? ctx.req.headers.host ?? 'localhost:8080'
  const proto = (ctx.req.headers['x-forwarded-proto'] as string | undefined) ?? 'http'

  return {
    props: {
      origin: `${proto}://${host}`,
      totals: { clicks: totals.clicks, recordedIdr: totals.recordedIdr, paidOutIdr: totals.paidOutIdr },
      programs: programs.map(
        (row): ProgramRow => ({
          id: row.id,
          name: row.name,
          network: row.network,
          signupUrl: row.signupUrl,
          commissionNote: row.commissionNote,
          commissionRate: row.commissionRate,
          market: row.market,
          status: row.status,
        })
      ),
      links: links.map(
        (row): LinkRow => ({
          id: row.link.id,
          slug: row.link.slug,
          label: row.link.label,
          destinationUrl: row.link.destinationUrl,
          channel: row.link.channel,
          clicks: row.link.clicks,
          programName: row.programName,
          network: row.network,
        })
      ),
      commissions: commissions.map(
        (row): CommissionRow => ({
          id: row.commission.id,
          amountIdr: Number(row.commission.amountIdr),
          periodLabel: row.commission.periodLabel,
          status: row.commission.status,
          note: row.commission.note,
          createdAt: row.commission.createdAt.toISOString(),
          programName: row.programName,
        })
      ),
    },
  }
}

type Props = {
  origin: string
  programs: ProgramRow[]
  links: LinkRow[]
  commissions: CommissionRow[]
  totals: { clicks: number; recordedIdr: number; paidOutIdr: number }
}

function AffiliatePage(props: Props) {
  return <AffiliateDesk {...props} />
}

const Page = AffiliatePage as PageWithFrame<Props>
Page.getLayout = (page) => (
  <ConsoleFrame
    eyebrow="Mesin 3 · Affiliate"
    title="Pemasaran affiliate"
    intent="Kelola program, tautan pelacak, dan komisi yang benar-benar tercatat di laporan jaringan."
  >
    {page}
  </ConsoleFrame>
)
export default Page
