import { StoreFrame } from '@/components/StoreFrame'
import { ProseSection } from '@/components/MarketingBlocks'
import { PageStack } from '@/components/ui'
import type { PageWithFrame } from '@/lib/frame'

const SECTIONS = [
  {
    title: 'Data apa yang kami kumpulkan',
    paragraphs: [
      'Saat Anda membeli produk, kami menyimpan nama, alamat email, dan detail pesanan Anda. Saat Anda membuat akun atau berlangganan, kami juga menyimpan data yang Anda isi sendiri di formulir.',
      'Kami tidak pernah menerima atau menyimpan nomor kartu, PIN, atau kata sandi perbankan Anda. Pembayaran dilakukan melalui transfer bank langsung ke rekening pemilik.',
    ],
  },
  {
    title: 'Untuk apa data itu dipakai',
    paragraphs: [
      'Untuk mengirim produk yang Anda beli, menampilkan status pesanan dan langganan Anda, mengirim pemberitahuan terkait pesanan, dan menyusun laporan penjualan bagi pemilik toko.',
      'Kami tidak menjual data Anda kepada pihak lain, dan tidak mengirim promosi yang tidak Anda minta.',
    ],
  },
  {
    title: 'Siapa yang bisa melihatnya',
    paragraphs: [
      'Pemilik toko dapat melihat pesanan, pelanggan, dan pesan yang Anda kirim. Data akun hanya dapat diakses oleh pemilik akun yang bersangkutan.',
      'Penyedia email hanya menerima data yang diperlukan untuk mengirim pemberitahuan. Pembayaran dilakukan melalui transfer langsung ke rekening pemilik.',
    ],
  },
  {
    title: 'Berapa lama disimpan',
    paragraphs: [
      'Catatan pesanan dan transaksi disimpan selama diperlukan untuk pembukuan dan kewajiban hukum. Bila Anda ingin data Anda dihapus, tulis permintaan lewat halaman kontak.',
    ],
  },
  {
    title: 'Keamanan',
    paragraphs: [
      'Kata sandi disimpan dalam bentuk terenkripsi dan tidak dapat dibaca kembali, termasuk oleh pemilik aplikasi. Sesi login disimpan pada cookie yang tidak dapat dibaca skrip di browser.',
      'Berkas produk disimpan privat; tautan unduhan dibuat sementara dan hanya untuk pesanan yang pembayarannya sudah dikonfirmasi.',
    ],
  },
]

function PrivasiPage() {
  return (
    <PageStack>
      {SECTIONS.map((section) => (
        <ProseSection key={section.title} title={section.title} paragraphs={section.paragraphs} />
      ))}
    </PageStack>
  )
}

const Page = PrivasiPage as PageWithFrame
Page.getLayout = (page) => (
  <StoreFrame
    eyebrow="Kebijakan privasi"
    title="Bagaimana kami memperlakukan data Anda"
    intent="Ditulis dalam bahasa sehari-hari: apa yang kami simpan, untuk apa, dan siapa yang bisa melihatnya."
    description="Kebijakan privasi: data yang dikumpulkan saat membeli produk digital, cara pemakaiannya, dan cara meminta penghapusan."
  >
    {page}
  </StoreFrame>
)
export default Page
