import type { GetServerSideProps } from 'next'
import { sql } from 'drizzle-orm'
import { StoreFrame } from '@/components/StoreFrame'
import {
  ClosingCta,
  FeatureGrid,
  HowItWorks,
  MarketingHero,
  type MarketingFeature,
} from '@/components/MarketingBlocks'
import { db } from '@/lib/db'
import { ownerAccount } from '@/lib/db/schema'
import { getSession } from '@/lib/auth'
import { getPublishedPlans } from '@/lib/saas'
import { getStoreProducts } from '@/lib/revenue'
import { money } from '@/lib/format'
import type { PageWithFrame } from '@/lib/frame'

/**
 * The public front door. Its job is one thing: convince a visitor this is a real
 * place to buy, then send them to the catalogue or the pricing page. Every figure on
 * it is read from the database — nothing here is an invented statistic.
 */
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getSession(ctx.req)
  const [owners, plans, products] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(ownerAccount),
    getPublishedPlans(),
    getStoreProducts(),
  ])

  const cheapest = plans.find((plan) => Number(plan.priceIdr) > 0)
  return {
    props: {
      isOwner: Boolean(session),
      needsSetup: (owners[0]?.n ?? 0) === 0,
      productCount: products.length,
      cheapestPrice: cheapest ? Number(cheapest.priceIdr) : null,
      cheapestInterval: cheapest?.interval ?? 'month',
    },
  }
}

const FEATURES: MarketingFeature[] = [
  {
    title: 'Katalog yang langsung bisa dijual',
    body: 'Setiap produk punya halaman sendiri, harga, dan berkas yang dikirim otomatis setelah pembayaran lunas.',
  },
  {
    title: 'Pembayaran yang dikonfirmasi penyedia',
    body: 'Pembayaran melalui transfer langsung ke rekening pemilik. Pesanan baru dianggap lunas setelah mutasi rekening diverifikasi.',
  },
  {
    title: 'Otomatisasi yang diawasi',
    body: 'Agen menyiapkan draf produk, konten, dan pengingat. Yang menyangkut uang tetap berhenti di tangan Anda.',
  },
  {
    title: 'Catatan keuangan yang jujur',
    body: 'Pendapatan muncul hanya dari pembayaran terkonfirmasi. Angka contoh selalu ditandai sebagai contoh.',
  },
]

const STEPS = [
  { title: 'Pilih produk atau paket', body: 'Lihat katalog digital atau bandingkan paket langganan.' },
  { title: 'Bayar dengan cara Anda', body: 'Transfer langsung ke rekening pemilik.' },
  { title: 'Pembayaran dikonfirmasi', body: 'Kami menunggu konfirmasi penyedia, bukan menghitung klik.' },
  { title: 'Akses terbuka otomatis', body: 'Unduhan dan langganan aktif tanpa perlu menunggu admin.' },
]

type Props = {
  isOwner: boolean
  needsSetup: boolean
  productCount: number
  cheapestPrice: number | null
  cheapestInterval: string
}

function LandingPage({ needsSetup, productCount, cheapestPrice, cheapestInterval }: Props) {
  const priceLine =
    cheapestPrice === null
      ? 'Tersedia paket gratis'
      : `Paket berbayar mulai ${money(cheapestPrice)} per ${cheapestInterval === 'year' ? 'tahun' : 'bulan'}`

  return (
    <div className="flex flex-col gap-section">
      <MarketingHero
        eyebrow="Toko digital · Pembayaran otomatis"
        headline="Jual produk digital Anda, terima transfer, kirim setelah diverifikasi."
        subhead="Satu tempat untuk katalog, pembayaran transfer bank, unduhan, langganan, dan laporan penjualan. Produk dikirim setelah pemilik memverifikasi dana masuk."
        primary={{ href: '/toko', label: 'Lihat produk' }}
        secondary={{ href: '/harga', label: 'Bandingkan paket' }}
        proof={[`${productCount} produk siap dibeli`, priceLine, 'Transfer bank langsung']}
      />

      <FeatureGrid features={FEATURES} />
      <HowItWorks steps={STEPS} />

      <ClosingCta
        headline="Siap mencoba?"
        body={
          needsSetup
            ? 'Paket gratis tersedia tanpa kartu. Pemilik dapat menyiapkan konsol dari halaman masuk.'
            : 'Mulai dari paket gratis, lalu naikkan paket kapan pun penjualan Anda bertumbuh.'
        }
        href="/harga"
        label="Lihat harga"
      />
    </div>
  )
}

const Page = LandingPage as PageWithFrame<Props>
Page.getLayout = (page) => (
  <StoreFrame
    variant="wide"
    title="Cyber Wealth Autopilot — jual produk digital, terima pembayaran otomatis"
    description="Katalog produk digital, pembayaran transfer langsung ke rekening pemilik, unduhan setelah pembayaran diverifikasi, langganan manual, dan laporan penjualan."
  >
    {page}
  </StoreFrame>
)
export default Page
