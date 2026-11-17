import type { GetServerSideProps } from 'next'
import { StoreFrame } from '@/components/StoreFrame'
import { CustomerAuthForm, FormAside } from '@/components/CustomerAuthForms'
import { PageStack } from '@/components/ui'
import { getCustomer } from '@/lib/customer-auth'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getCustomer(ctx.req)
  if (session) return { redirect: { destination: '/akun', permanent: false } }
  return { props: {} }
}

function DaftarPage() {
  return (
    <PageStack>
      <CustomerAuthForm mode="daftar" />
      <FormAside>
        Kami mengirim satu email konfirmasi. Akun aktif setelah alamat email Anda dikonfirmasi, supaya pesanan tidak
        pernah masuk ke alamat orang lain karena salah ketik.
      </FormAside>
    </PageStack>
  )
}

const Page = DaftarPage as PageWithFrame
Page.getLayout = (page) => (
  <StoreFrame
    eyebrow="Akun pembeli"
    title="Buat akun"
    intent="Simpan semua pesanan dan unduhan Anda, dan kelola langganan tanpa mencari email lama."
    description="Buat akun pembeli untuk menyimpan pesanan, unduhan, dan langganan Anda di satu tempat."
  >
    {page}
  </StoreFrame>
)
export default Page
