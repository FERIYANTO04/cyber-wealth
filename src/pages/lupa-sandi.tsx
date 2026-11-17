import { StoreFrame } from '@/components/StoreFrame'
import { ForgotPasswordForm, FormAside } from '@/components/CustomerAuthForms'
import { PageStack } from '@/components/ui'
import type { PageWithFrame } from '@/lib/frame'

function LupaSandiPage() {
  return (
    <PageStack>
      <ForgotPasswordForm />
      <FormAside>
        Demi keamanan, jawaban di halaman ini selalu sama — kami tidak memberi tahu apakah sebuah alamat email
        terdaftar atau tidak.
      </FormAside>
    </PageStack>
  )
}

const Page = LupaSandiPage as PageWithFrame
Page.getLayout = (page) => (
  <StoreFrame
    eyebrow="Akun pembeli"
    title="Lupa kata sandi"
    intent="Masukkan email akun Anda; kami kirim tautan untuk membuat kata sandi baru."
    description="Atur ulang kata sandi akun pembeli Anda lewat tautan aman yang dikirim ke email."
  >
    {page}
  </StoreFrame>
)
export default Page
