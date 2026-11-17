import type { GetServerSideProps } from 'next'
import { ConsoleFrame } from '@/components/ConsoleFrame'
import { SettingsPanels } from '@/components/SettingsPanels'
import { requireOwnerPage } from '@/lib/auth'
import { getSettings } from '@/lib/data'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }
  const settings = await getSettings()
  return {
    props: {
      email: guard.session.email,
      aiPaused: settings.aiPaused,
      target: settings.netWorthTargetIdr,
    },
  }
}

const Page = SettingsPanels as PageWithFrame<{ email: string; aiPaused: boolean; target: number }>
Page.getLayout = (page) => (
  <ConsoleFrame eyebrow="Pemilik" title="Pengaturan" intent="Kendali atas operasi AI dan akun pemilik.">
    {page}
  </ConsoleFrame>
)
export default Page
