import type { GetServerSideProps } from 'next'
import { ConsoleFrame } from '@/components/ConsoleFrame'
import { EmailConsole, type EmailItem } from '@/components/EmailConsole'
import { requireOwnerPage } from '@/lib/auth'
import { emailConfigured, getEmailLog } from '@/lib/email'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }

  const rows = await getEmailLog(80)
  return {
    props: {
      ready: emailConfigured(),
      emails: rows.map(
        (row): EmailItem => ({
          id: row.id,
          toEmail: row.toEmail,
          kind: row.kind,
          subject: row.subject,
          body: row.body,
          status: row.status,
          detail: row.detail,
          createdAt: row.createdAt.toISOString(),
        } satisfies EmailItem)
      ),
    },
  }
}

type Props = { emails: EmailItem[]; ready: boolean }

function EmailPage({ emails, ready }: Props) {
  return <EmailConsole emails={emails} ready={ready} />
}

const Page = EmailPage as PageWithFrame<Props>
Page.getLayout = (page) => (
  <ConsoleFrame
    eyebrow="Korespondensi"
    title="Kotak keluar email"
    intent="Setiap email yang aplikasi coba kirim — konfirmasi, pengiriman produk, pengingat, dan pemberitahuan untuk Anda."
  >
    {page}
  </ConsoleFrame>
)
export default Page
