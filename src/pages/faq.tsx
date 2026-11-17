import { StoreFrame } from '@/components/StoreFrame'
import { ClosingCta, FaqSection } from '@/components/MarketingBlocks'
import { PageStack } from '@/components/ui'
import type { PageWithFrame } from '@/lib/frame'

const BUYING = [
  {
    question: 'Bagaimana produk digital dikirim?',
    answer:
      'Begitu pemilik memverifikasi dana masuk di rekening, halaman pesanan Anda menampilkan tautan unduhan. Berkasnya diambil langsung dari penyimpanan aplikasi, dan tautannya dibuat baru setiap kali dibuka.',
  },
  {
    question: 'Apakah saya perlu membuat akun untuk membeli?',
    answer:
      'Tidak. Untuk membeli produk cukup nama dan email. Tautan pesanan dan unduhan dikirim ke email itu, dan Anda bisa membukanya kapan pun.',
  },
  {
    question: 'Berapa lama akses saya berlaku?',
    answer:
      'Untuk produk sekali beli, akses unduhan melekat pada pesanan Anda dan tidak habis. Untuk produk berlangganan, akses berlaku sampai akhir periode yang sudah dibayar.',
  },
  {
    question: 'Metode pembayaran apa yang tersedia?',
    answer:
      'Transfer bank langsung ke rekening pemilik. Website tidak memproses kartu, QRIS, atau e-wallet.',
  },
  {
    question: 'Apakah data kartu atau rekening saya disimpan di sini?',
    answer:
      'Tidak. Pembeli mentransfer langsung ke rekening pemilik. Pesanan baru aktif setelah pemilik memeriksa mutasi rekening dan mengonfirmasi pembayaran.',
  },
]

const SELLING = [
  {
    question: 'Bagaimana saya mulai menjual?',
    answer:
      'Pemilik masuk ke konsol, menambahkan produk dari menu Produk digital, melampirkan berkas yang akan dikirim, lalu menerbitkannya. Produk yang terbit langsung muncul di katalog publik.',
  },
  {
    question: 'Apakah laporan penjualan bisa dipercaya?',
    answer:
      'Angka pendapatan hanya bertambah setelah pemilik memverifikasi dana masuk di rekening. Data contoh selalu diberi tanda "Demo", dan saldo buku dicatat sebagai catatan — bukan uang yang disimpan website.',
  },
  {
    question: 'Apakah ada penarikan dana otomatis?',
    answer:
      'Tidak. Uang pembeli ditransfer langsung ke rekening bank yang ditetapkan pemilik. Penarikan komisi anggota diproses manual oleh pemilik, dan statusnya baru berubah menjadi "sudah ditransfer" setelah pemilik benar-benar mengirimnya.',
  },
]

function FaqPage() {
  return (
    <PageStack>
      <FaqSection title="Untuk pembeli" items={BUYING} />
      <FaqSection title="Untuk pemilik toko" items={SELLING} />
      <ClosingCta
        headline="Belum menemukan jawabannya?"
        body="Kirim pertanyaan Anda lewat halaman kontak. Setiap pesan tersimpan dan diteruskan ke pemilik toko."
        href="/kontak"
        label="Hubungi kami"
      />
    </PageStack>
  )
}

const Page = FaqPage as PageWithFrame
Page.getLayout = (page) => (
  <StoreFrame
    eyebrow="Tanya jawab"
    title="Hal yang paling sering ditanyakan"
    intent="Pengiriman produk, metode pembayaran, keamanan data, dan cara kerja laporan penjualan."
    description="Jawaban atas pertanyaan umum tentang pembelian produk digital, metode pembayaran, pengiriman otomatis, dan laporan penjualan."
  >
    {page}
  </StoreFrame>
)
export default Page
