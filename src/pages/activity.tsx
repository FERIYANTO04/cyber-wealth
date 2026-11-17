import type { GetServerSideProps } from 'next'
import { ConsoleFrame } from '@/components/ConsoleFrame'
import { ActivityLog } from '@/components/ActivityLog'
import { CountNote } from '@/components/ui'
import { requireOwnerPage } from '@/lib/auth'
import { getActivity } from '@/lib/data'
import type { PageWithFrame } from '@/lib/frame'
import type { FeedEntry } from '@/components/ActivityFeed'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }
  const rows = await getActivity(120)
  return {
    props: {
      entries: rows.map(
        (row): FeedEntry => ({
          id: row.id,
          actor: row.actor,
          agentName: row.agentName,
          action: row.action,
          detail: row.detail,
          dataSource: row.dataSource as 'live' | 'demo',
          createdAt: row.createdAt.toISOString(),
        })
      ),
    },
  }
}

const Page = ActivityLog as PageWithFrame<{ entries: FeedEntry[] }>
Page.getLayout = (page, props) => (
  <ConsoleFrame
    eyebrow="Rekam jejak"
    title="Log aktivitas"
    intent="Catatan lengkap apa pun yang dilakukan AI, Anda, dan sistem — tidak ada yang dihapus."
    actions={<CountNote>{props.entries.length} entri</CountNote>}
  >
    {page}
  </ConsoleFrame>
)
export default Page
