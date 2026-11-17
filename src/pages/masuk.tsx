import type { GetServerSideProps } from 'next'
import { StoreFrame } from '@/components/StoreFrame'
import { CustomerAuthForm, FormAside } from '@/components/CustomerAuthForms'
import { PageStack, SignalLink } from '@/components/ui'
import { getCustomer } from '@/lib/customer-auth'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getCustomer(ctx.req)
  if (session) return { redirect: { destination: '/akun', permanent: false } }
  return { props: { reset: ctx.query.reset === '1' } }
}

function MasukPage({ reset }: { reset: boolean }) {
  return (
    <PageStack>
      <CustomerAuthForm mode="masuk" />
      {reset && <FormAside>Kata sandi Anda baru saja diperbarui. Silakan masuk dengan kata sandi baru.</FormAside>}
      <FormAside>
        Mengelola situs ini sebagai pemilik? <SignalLink href="/login">Masuk ke konsol pemilik</SignalLink>
      </FormAside>
    </PageStack>
  )
}

const Page = MasukPage as PageWithFrame<{ reset: boolean }>
Page.getLayout = (page) => (
  <StoreFrame
    eyebrow="Akun pembeli"
    title="Masuk untuk melihat pesanan Anda"
    intent="Semua pesanan, unduhan, dan langganan Anda ada di satu tempat."
    description="Masuk ke akun pembeli untuk melihat pesanan, unduhan produk, dan status langganan Anda."
  >
    {page}
  </StoreFrame>
)
export default Page
