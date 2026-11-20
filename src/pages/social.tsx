import type { GetServerSideProps } from 'next'
import { ConsoleFrame } from '@/components/ConsoleFrame'
import { SocialStudio, type ChannelOption, type MarketOption } from '@/components/SocialStudio'
import { requireOwnerPage } from '@/lib/auth'
import { getPosts, getStudioTotals } from '@/lib/social'
import { CampaignDrafts, type CampaignRow } from '@/components/CampaignDrafts'
import { PageStack } from '@/components/ui'
import { db } from '@/lib/db'
import { campaignDrafts } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'
import { CHANNELS, MARKETS, channelShort } from '@/lib/labels'
import { aiConfigured } from '@/lib/ai'
import { getActiveFacebookAccount } from '@/lib/meta'
import { getActiveInstagramAccount } from '@/lib/instagram'
import { telegramReady as checkTelegramReady } from '@/lib/telegram'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }

  const posts = await getPosts(150)
  const totals = await getStudioTotals()
  const facebook = await getActiveFacebookAccount()
  const instagram = await getActiveInstagramAccount()
  const telegram = await checkTelegramReady().catch(() => false)
  const drafts = await db.select().from(campaignDrafts).orderBy(desc(campaignDrafts.createdAt)).limit(20)

  const channels: ChannelOption[] = CHANNELS.map((channel) => ({
    key: channel.key,
    label: channel.label,
    short: channelShort(channel.key),
    limit: channel.limit,
    note: channel.note,
  }))
  const markets: MarketOption[] = MARKETS.map((market) => ({ key: market.key, label: market.label }))

  return {
    props: {
      posts,
      totals,
      channels,
      markets,
      aiReady: aiConfigured(),
      facebookReady: Boolean(facebook && facebook.status === 'connected'),
      instagramReady: Boolean(instagram && instagram.status === 'connected'),
      telegramReady: telegram,
      drafts: drafts.map(
        (row): CampaignRow => ({
          id: row.id,
          title: row.title,
          channel: row.channel,
          audience: row.audience,
          body: row.body,
          source: row.source,
          createdAt: row.createdAt.toISOString(),
        })
      ),
    },
  }
}

type Props = {
  posts: Awaited<ReturnType<typeof getPosts>>
  totals: Awaited<ReturnType<typeof getStudioTotals>>
  channels: ChannelOption[]
  markets: MarketOption[]
  aiReady: boolean
  facebookReady: boolean
  instagramReady: boolean
  telegramReady: boolean
  drafts: CampaignRow[]
}

function SocialPage(props: Props) {
  return (
    <PageStack>
      <SocialStudio
        initialPosts={props.posts}
        totals={props.totals}
        channels={props.channels}
        markets={props.markets}
        aiReady={props.aiReady}
        facebookReady={props.facebookReady}
        instagramReady={props.instagramReady}
        telegramReady={props.telegramReady}
      />
      <CampaignDrafts drafts={props.drafts} />
    </PageStack>
  )
}

const Page = SocialPage as PageWithFrame<Props>
Page.getLayout = (page) => (
  <ConsoleFrame
    eyebrow="Pemasaran"
    title="Studio konten sosial"
    intent="Draf promosi untuk pasar Indonesia dan internasional, kalender konten, dan persetujuan Anda sebelum apa pun dijadwalkan."
  >
    {page}
  </ConsoleFrame>
)
export default Page
