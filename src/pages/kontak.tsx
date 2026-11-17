import type { GetServerSideProps } from 'next'
import { StoreFrame } from '@/components/StoreFrame'
import { ContactForm } from '@/components/ContactForm'
import { ContactIntro } from '@/components/MarketingBlocks'
import { PageStack } from '@/components/ui'
import { emailConfig } from '@/lib/email'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async () => {
  const { from } = emailConfig()
  const usable = from && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(from) && !/example\.com$/i.test(from)
  return { props: { email: usable ? from : null } }
}

function KontakPage({ email }: { email: string | null }) {
  return (
    <PageStack>
      <ContactIntro email={email} />
      <ContactForm />
    </PageStack>
  )
}

const Page = KontakPage as PageWithFrame<{ email: string | null }>
Page.getLayout = (page) => (
  <StoreFrame
    eyebrow="Kontak"
    title="Ada pertanyaan atau kendala?"
    intent="Tulis pesan Anda. Setiap pesan tersimpan di aplikasi ini dan diteruskan ke pemilik toko."
    description="Hubungi pemilik toko lewat formulir kontak untuk pertanyaan produk, pembayaran, atau kendala pesanan."
  >
    {page}
  </StoreFrame>
)
export default Page
