import type { GetServerSideProps } from 'next'
import { and, desc, eq } from 'drizzle-orm'
import { ConsoleFrame } from '@/components/ConsoleFrame'
import { FacebookConnect, type LinkedPage, type PageCandidate, type PublishRow } from '@/components/FacebookConnect'
import { PageStack } from '@/components/ui'
import { requireOwnerPage } from '@/lib/auth'
import { db } from '@/lib/db'
import { socialPosts } from '@/lib/db/schema'
import { getActiveFacebookAccount, getFacebookAccounts, listPages, metaConfig, openToken, redirectUriFor } from '@/lib/meta'
import { getContentPerformance } from '@/lib/social'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }

  const config = metaConfig()
  const origin = (ctx.req.headers['x-forwarded-proto'] as string | undefined) ?? 'https'
  const host = String(ctx.req.headers['x-forwarded-host'] ?? ctx.req.headers.host ?? '')
  const redirectUri = redirectUriFor(`${origin}://${host}`)

  const accounts = await getFacebookAccounts()
  const active = await getActiveFacebookAccount()

  // The page picker only lists pages from the sealed user token in the HttpOnly cookie.
  let pages: PageCandidate[] = []
  const chooseMode = ctx.query.choose === '1'
  if (chooseMode) {
    const sealed = ctx.req.cookies.cwa_meta_pending
    const token = sealed ? openToken(sealed) : null
    if (token) {
      const listed = await listPages(token)
      if (listed.ok) pages = listed.pages.map((page) => ({ id: page.id, name: page.name, category: page.category ?? null }))
    }
  }

  const postRows = await db
    .select()
    .from(socialPosts)
    .where(and(eq(socialPosts.channel, 'facebook'), eq(socialPosts.dataSource, 'live')))
    .orderBy(desc(socialPosts.createdAt))
    .limit(40)

  const performance = await getContentPerformance()
  const error = typeof ctx.query.error === 'string' ? ctx.query.error : null

  const page: LinkedPage | null = active
    ? {
        id: active.externalId,
        name: active.name,
        status: active.status,
        connectedAt: active.connectedAt.toISOString(),
        lastCheckedAt: active.lastCheckedAt ? active.lastCheckedAt.toISOString() : null,
        lastError: active.lastError,
        tokenExpiresAt: active.tokenExpiresAt ? active.tokenExpiresAt.toISOString() : null,
      }
    : accounts[0]
      ? {
          id: accounts[0].id,
          name: accounts[0].name,
          status: accounts[0].status,
          connectedAt: accounts[0].connectedAt,
          lastCheckedAt: accounts[0].lastCheckedAt,
          lastError: accounts[0].lastError,
          tokenExpiresAt: accounts[0].tokenExpiresAt,
        }
      : null

  return {
    props: {
      configured: config.configured,
      appId: config.appId ? `${config.appId}` : '',
      redirectUri,
      page,
      pages,
      chooseMode,
      connected: ctx.query.connected === '1',
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
      performance: { clicks: performance.clicks, leads: performance.leads, sales: performance.sales, salesIdr: performance.salesIdr },
    },
  }
}

type Props = {
  configured: boolean
  appId: string
  redirectUri: string
  page: LinkedPage | null
  pages: PageCandidate[]
  chooseMode: boolean
  connected: boolean
  configError: string | null
  posts: PublishRow[]
  performance: { clicks: number; leads: number; sales: number; salesIdr: number }
}

function FacebookPage(props: Props) {
  return (
    <PageStack>
      <FacebookConnect {...props} />
    </PageStack>
  )
}

const Page = FacebookPage as PageWithFrame<Props>
Page.getLayout = (page) => (
  <ConsoleFrame
    eyebrow="Kanal resmi"
    title="Facebook Page"
    intent="Hubungkan halaman bisnis Anda, lalu konten yang sudah Anda setujui terbit lewat Meta Graph API."
  >
    {page}
  </ConsoleFrame>
)
export default Page
