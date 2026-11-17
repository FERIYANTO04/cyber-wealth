import type { GetServerSideProps } from 'next'
import { StoreFrame } from '@/components/StoreFrame'
import { PricingTable, type PricingPlan } from '@/components/PricingTable'
import { ClosingCta, FaqSection, ProseSection } from '@/components/MarketingBlocks'
import { PageStack } from '@/components/ui'
import { getPublishedPlans } from '@/lib/saas'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async () => {
  const rows = await getPublishedPlans()
  return {
    props: {
      plans: rows.map(
        (row): PricingPlan => ({
          code: row.code,
          name: row.name,
          summary: row.summary,
          features: row.features.split('\n').map((line) => line.trim()).filter(Boolean),
          priceIdr: Number(row.priceIdr),
          interval: row.interval,
        })
      ),
    },
  }
}

const BILLING_FAQ = [
  {
    question: 'Bagaimana cara membayar?',
    answer:
      'Setelah memilih paket, Anda mengisi nama dan email. Website menampilkan instruksi transfer ke rekening pemilik. Paket aktif setelah pemilik memverifikasi dana masuk.',
  },
  {
    question: 'Apakah ada biaya tersembunyi?',
    answer:
      'Tidak. Harga di halaman ini adalah harga paket per periode. Pembayaran dilakukan melalui transfer bank langsung ke rekening pemilik.',
  },
  {
    question: 'Bisakah saya berhenti kapan saja?',
    answer:
      'Bisa. Perpanjangan otomatis hanya berjalan bila Anda sendiri menyalakannya saat mendaftar. Tanpa itu, tidak ada tagihan berikutnya — paket berhenti di akhir periode yang sudah dibayar.',
  },
  {
    question: 'Apa bedanya bulanan dan tahunan?',
    answer:
      'Isi paketnya sama. Tahunan dibayar sekali untuk dua belas bulan dan lebih murah dibanding dua belas kali pembayaran bulanan.',
  },
  {
    question: 'Apakah paket gratis benar-benar gratis?',
    answer:
      'Ya. Paket gratis tidak meminta kartu dan tidak berubah menjadi berbayar sendiri. Anda hanya perlu memilih paket berbayar bila membutuhkan fitur yang lebih besar.',
  },
  {
    question: 'Bagaimana kalau pembayaran saya gagal atau kedaluwarsa?',
    answer:
      'Pesanan tetap tercatat sebagai belum dibayar dan tidak ada akses yang dibuka. Anda bisa mencoba membayar lagi dari halaman status langganan yang dikirim ke email Anda.',
  },
]

function HargaPage({ plans }: { plans: PricingPlan[] }) {
  return (
    <PageStack>
      <PricingTable plans={plans} />

      <ProseSection
        title="Yang berlaku di semua paket berbayar"
        paragraphs={[
          'Pembayaran melalui transfer bank langsung ke rekening pemilik.',
          'Produk digital terkirim otomatis setelah pembayaran dikonfirmasi penyedia.',
          'Catatan transaksi dan invoice tersimpan di akun Anda.',
        ]}
      />

      <FaqSection title="Pertanyaan seputar pembayaran" items={BILLING_FAQ} />

      <ClosingCta
        headline="Masih ragu memilih paket?"
        body="Mulai dari paket gratis, atau beli satu produk digital lebih dulu untuk melihat sendiri bagaimana pengirimannya bekerja."
        href="/toko"
        label="Lihat produk"
      />
    </PageStack>
  )
}

const Page = HargaPage as PageWithFrame<{ plans: PricingPlan[] }>
Page.getLayout = (page) => (
  <StoreFrame
    eyebrow="Harga"
    title="Paket yang tumbuh bersama penjualan Anda"
    intent="Mulai gratis. Naikkan paket saat butuh otomatisasi, agen AI, dan laporan lebih lengkap."
    description="Bandingkan paket Gratis, Basic, Pro, dan Premium: harga bulanan dan tahunan, fitur tiap paket, dan cara pembayarannya."
  >
    {page}
  </StoreFrame>
)
export default Page
