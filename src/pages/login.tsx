import type { GetServerSideProps } from 'next'
import { sql } from 'drizzle-orm'
import { GateFrame } from '@/components/GateFrame'
import { LoginForm } from '@/components/LoginForm'
import { db } from '@/lib/db'
import { ownerAccount } from '@/lib/db/schema'
import { getSession } from '@/lib/auth'
import { isRestricted } from '@/lib/owner-access'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getSession(ctx.req)
  if (session) return { redirect: { destination: '/dashboard', permanent: false } }
  const rows = await db.select({ n: sql<number>`count(*)::int` }).from(ownerAccount)
  return { props: { needsSetup: (rows[0]?.n ?? 0) === 0, restricted: isRestricted() } }
}

const Page = LoginForm as PageWithFrame<{ needsSetup: boolean; restricted: boolean }>
Page.getLayout = (page) => <GateFrame title="Masuk · Cyber Wealth Autopilot">{page}</GateFrame>
export default Page
