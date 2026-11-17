import type { GetServerSideProps } from 'next'
import { StoreFrame } from '@/components/StoreFrame'
import { VerifyEmailPanel } from '@/components/CustomerAuthForms'
import { PageStack } from '@/components/ui'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const token = typeof ctx.query.token === 'string' ? ctx.query.token : ''
  return { props: { token } }
}

function VerifikasiPage({ token }: { token: string }) {
  return (
    <PageStack>
      <VerifyEmailPanel token={token} />
    </PageStack>
  )
}

const Page = VerifikasiPage as PageWithFrame<{ token: string }>
Page.getLayout = (page) => (
  <StoreFrame
    eyebrow="Akun pembeli"
    title="Konfirmasi email"
    intent="Satu langkah lagi sebelum akun Anda aktif."
    description="Konfirmasi alamat email akun pembeli Anda."
  >
    {page}
  </StoreFrame>
)
export default Page
