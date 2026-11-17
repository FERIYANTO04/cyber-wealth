import type { GetServerSideProps } from 'next'
import { StoreFrame } from '@/components/StoreFrame'
import { ResetPasswordForm } from '@/components/CustomerAuthForms'
import { PageStack } from '@/components/ui'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const token = typeof ctx.query.token === 'string' ? ctx.query.token : ''
  if (!token) return { redirect: { destination: '/lupa-sandi', permanent: false } }
  return { props: { token } }
}

function AturUlangPage({ token }: { token: string }) {
  return (
    <PageStack>
      <ResetPasswordForm token={token} />
    </PageStack>
  )
}

const Page = AturUlangPage as PageWithFrame<{ token: string }>
Page.getLayout = (page) => (
  <StoreFrame
    eyebrow="Akun pembeli"
    title="Buat kata sandi baru"
    intent="Tautan ini hanya berlaku sekali dan berakhir dalam satu jam."
    description="Atur ulang kata sandi akun pembeli Anda."
  >
    {page}
  </StoreFrame>
)
export default Page
