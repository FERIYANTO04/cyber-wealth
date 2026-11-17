import { StoreFrame } from '@/components/StoreFrame'
import { ProseSection } from '@/components/MarketingBlocks'
import { PageStack } from '@/components/ui'
import type { PageWithFrame } from '@/lib/frame'

const SECTIONS = [
  {
    title: 'Apa yang Anda beli',
    paragraphs: [
      'Produk digital berupa berkas (misalnya panduan atau template) yang dapat diunduh setelah pembayaran dikonfirmasi. Paket langganan memberi akses fitur selama periode yang dibayar.',
      'Gambar dan deskripsi di halaman produk menjelaskan isi yang Anda terima. Bila berkas yang diterima tidak sesuai deskripsinya, hubungi kami lewat halaman kontak.',
    ],
  },
  {
    title: 'Harga dan pembayaran',
    paragraphs: [
      'Semua harga dalam Rupiah dan sudah termasuk ketentuan yang tertulis di halaman produk atau halaman harga saat Anda membeli.',
      'Pembayaran dilakukan melalui transfer langsung ke rekening pemilik. Pesanan baru dianggap lunas setelah pemilik memeriksa mutasi rekening dan mengonfirmasi dana masuk.',
      'Pembayaran yang gagal atau kedaluwarsa tidak membuka akses apa pun. Anda dapat mencoba lagi dari halaman status pesanan atau langganan Anda.',
    ],
  },
  {
    title: 'Langganan dan perpanjangan',
    paragraphs: [
      'Perpanjangan otomatis hanya berjalan jika Anda sendiri menyalakannya. Tanpa itu, tidak ada tagihan berikutnya yang dibuat.',
      'Anda dapat mematikan perpanjangan otomatis kapan saja dari halaman status langganan. Paket tetap berlaku sampai akhir periode yang sudah dibayar.',
    ],
  },
  {
    title: 'Pengembalian dana',
    paragraphs: [
      'Karena produk digital langsung dapat diunduh, pembelian yang sudah berhasil diunduh umumnya tidak dapat dikembalikan. Bila berkas rusak atau tidak dapat dibuka, hubungi kami — berkas akan diperbaiki atau dananya dikembalikan.',
      'Permintaan pengembalian dana diperiksa pemilik toko. Jika disetujui, dana dikirim kembali melalui transfer bank manual.',
    ],
  },
  {
    title: 'Penggunaan yang wajar',
    paragraphs: [
      'Produk yang Anda beli untuk dipakai sendiri atau di dalam usaha Anda. Anda tidak boleh menjual ulang, menyebarkan, atau mengklaim sebagai karya sendiri tanpa izin tertulis.',
      'Kami dapat menutup akses bila ada penyalahgunaan, misalnya upaya mengakses berkas tanpa membayar atau mengganggu layanan.',
    ],
  },
  {
    title: 'Batasan tanggung jawab',
    paragraphs: [
      'Produk digital bersifat informatif. Hasil usaha bergantung pada keadaan masing-masing, dan tidak ada jaminan pendapatan tertentu.',
      'Layanan dapat dihentikan sementara untuk pemeliharaan. Kami berusaha memberi kabar lebih dulu bila penghentian itu direncanakan.',
    ],
  },
]

function SyaratPage() {
  return (
    <PageStack>
      {SECTIONS.map((section) => (
        <ProseSection key={section.title} title={section.title} paragraphs={section.paragraphs} />
      ))}
    </PageStack>
  )
}

const Page = SyaratPage as PageWithFrame
Page.getLayout = (page) => (
  <StoreFrame
    eyebrow="Syarat layanan"
    title="Ketentuan membeli dan berlangganan"
    intent="Hak dan kewajiban Anda sebagai pembeli, serta aturan pengembalian dana dan perpanjangan."
    description="Syarat layanan: ketentuan pembelian produk digital, langganan, pembayaran, pengembalian dana, dan penggunaan yang wajar."
  >
    {page}
  </StoreFrame>
)
export default Page
