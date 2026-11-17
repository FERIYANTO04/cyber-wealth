import type { GetServerSideProps } from 'next'
import { and, desc, eq } from 'drizzle-orm'
import { ConsoleFrame } from '@/components/ConsoleFrame'
import { InstagramConnect, type LinkedInstagram } from '@/components/InstagramConnect'
import type { PublishRow } from '@/components/FacebookConnect'
import { PageStack } from '@/components/ui'
import { requireOwnerPage } from '@/lib/auth'
import { db } from '@/lib/db'
import { socialPosts } from '@/lib/db/schema'
import { getActiveFacebookAccount, metaConfig, redirectUriFor } from '@/lib/meta'
import { getActiveInstagramAccount } from '@/lib/instagram'
import { getContentPerformance } from '@/lib/social'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }

  const config = metaConfig()
  const origin = (ctx.req.headers['x-forwarded-proto'] as string | undefined) ?? 'https'
  const host = String(ctx.req.headers['x-forwarded-host'] ?? ctx.req.headers.host ?? '')
  const redirectUri = redirectUriFor(`${origin}://${host}`)

  const [facebook, instagram, performance] = await Promise.all([
    getActiveFacebookAccount(),
    getActiveInstagramAccount(),
    getContentPerformance(),
  ])

  const postRows = await db
    .select()
    .from(socialPosts)
    .where(and(eq(socialPosts.channel, 'instagram'), eq(socialPosts.dataSource, 'live')))
    .orderBy(desc(socialPosts.createdAt))
    .limit(40)

  const account: LinkedInstagram | null = instagram
    ? {
        id: instagram.externalId,
        username: instagram.name,
        pageId: instagram.parentId,
        status: instagram.status,
        connectedAt: instagram.connectedAt.toISOString(),
        lastCheckedAt: instagram.lastCheckedAt ? instagram.lastCheckedAt.toISOString() : null,
        lastError: instagram.lastError,
      }
    : null

  const error = typeof ctx.query.error === 'string' ? ctx.query.error : null

  return {
    props: {
      configured: config.configured,
      redirectUri,
      account,
      pageName: facebook?.name ?? null,
      pageConnected: Boolean(facebook && facebook.status === 'connected'),
      configError: error ? decodeURIComponent(error) : null,
      posts: postRows.map(
        (row): PublishRow => ({
          id: row.id,
          headline: row.headline,
          publishState: row.publishState,
          publishNote: row.publishNote,
          externalId: row.externalId,
          externalUrl: row.externalUrl,
          publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
          scheduledAt: row.scheduledAt ? row.scheduledAt.toISOString() : null,
        })
      ),
      performance: {
        clicks: performance.clicks,
        leads: performance.leads,
        sales: performance.sales,
        salesIdr: performance.salesIdr,
      },
    },
  }
}

type Props = {
  configured: boolean
  redirectUri: string
  account: LinkedInstagram | null
  pageName: string | null
  pageConnected: boolean
  configError: string | null
  posts: PublishRow[]
  performance: { clicks: number; leads: number; sales: number; salesIdr: number }
}

function InstagramPage(props: Props) {
  return (
    <PageStack>
      <InstagramConnect {...props} />
    </PageStack>
  )
}

const Page = InstagramPage as PageWithFrame<Props>
Page.getLayout = (page) => (
  <ConsoleFrame
    eyebrow="Kanal resmi"
    title="Instagram Bisnis"
    intent="Satu akun Instagram Bisnis tertaut ke Halaman Facebook Anda, dan konten yang sudah Anda setujui terbit lewat Meta Graph API."
  >
    {page}
  </ConsoleFrame>
)
export default Page
