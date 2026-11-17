import type { GetServerSideProps } from 'next'
import { ConsoleFrame } from '@/components/ConsoleFrame'
import { MemberAdmin } from '@/components/MemberAdmin'
import { requireOwnerPage } from '@/lib/auth'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }
  ctx.res.setHeader('Cache-Control', 'no-store')
  return { props: {} }
}

const Page = MemberAdmin as PageWithFrame
Page.getLayout = (page) => (
  <ConsoleFrame
    eyebrow="Pemilik"
    title="Anggota & penarikan"
    intent="Catat komisi yang benar-benar terjadi dan putuskan setiap permintaan WD sendiri."
  >
    {page}
  </ConsoleFrame>
)
export default Page
