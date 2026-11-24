import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { StoreFrame } from '@/components/StoreFrame'
import { PageStack } from '@/components/ui'
import type { PageWithFrame } from '@/lib/frame'

const examples = [
  {
    title: 'Konten 1 — Produk unggulan',
    hook: 'Lagi cari camilan untuk teman minum teh?',
    caption: 'Dibuat untuk momen santai di rumah atau bekal aktivitas. Lihat pilihan menu hari ini dan tanyakan ketersediaannya melalui WhatsApp.',
    visual: 'Ambil video close-up produk, tunjukkan tekstur bagian dalam, lalu tampilkan nama produk dan cara pemesanan.',
  },
  {
    title: 'Konten 2 — Proses dan kepercayaan',
    hook: 'Pesanan disiapkan satu per satu sebelum dikirim.',
    caption: 'Kami menyiapkan pesanan dengan teliti. Ingin pesan untuk keluarga atau acara? Kirim tanggal dan jumlah yang dibutuhkan agar kami bisa cek ketersediaan.',
    visual: 'Rekam proses persiapan dan pengemasan asli. Hindari klaim bahan, sertifikasi, atau kualitas yang belum dapat dibuktikan.',
  },
  {
    title: 'Konten 3 — Pesanan acara',
    hook: 'Butuh snack box untuk rapat atau acara keluarga?',
    caption: 'Ceritakan tanggal acara, jumlah box, dan kisaran anggaran. Kami akan bantu cek pilihan paket yang tersedia.',
    visual: 'Tampilkan isi paket yang benar-benar tersedia, jumlah per box, dan contoh kemasan. Akhiri dengan CTA untuk meminta penawaran.',
  },
]

function SampleContentPage() {
  return (
    <PageStack>
      <section className="border border-[#b99a5b]/25 bg-[#101113] p-7 sm:p-10">
        <p className="font-mono text-[10px] uppercase tracking-[.22em] text-[#c5a66a]">Contoh gratis · Cyber Wealth</p>
        <h2 className="mt-4 max-w-3xl text-3xl font-medium leading-tight tracking-[-.04em] text-[#f3f0e9] sm:text-5xl">Contoh konten promosi untuk usaha makanan dan UMKM.</h2>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-[#aaa69e]">Lihat contoh hook, caption, dan arahan video pendek yang bisa disesuaikan dengan produk Anda. Ini contoh awal, bukan janji viral atau hasil penjualan tertentu.</p>
        <Link href="/jasa/paket-konten-umkm-30-hari" className="mt-7 inline-flex items-center gap-3 bg-[#c5a66a] px-6 py-4 text-[10px] font-semibold uppercase tracking-[.16em] text-[#101010] hover:bg-[#dfc58f]">Pesan paket 30 hari <ArrowUpRight className="size-4"/></Link>
      </section>
      <section className="grid gap-5">
        {examples.map((item) => (
          <article key={item.title} className="border border-[#b99a5b]/25 bg-[#101113] p-6 sm:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#c5a66a]">{item.title}</p>
            <h3 className="mt-4 text-xl font-medium text-[#f3f0e9]">{item.hook}</h3>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div><p className="text-[10px] uppercase tracking-[.16em] text-[#c5a66a]">Contoh caption</p><p className="mt-2 text-sm leading-7 text-[#d5d0c5]">{item.caption}</p></div>
              <div><p className="text-[10px] uppercase tracking-[.16em] text-[#c5a66a]">Arahan visual</p><p className="mt-2 text-sm leading-7 text-[#aaa69e]">{item.visual}</p></div>
            </div>
          </article>
        ))}
      </section>
      <section className="border border-[#b99a5b]/25 bg-[#101113] p-7 sm:p-9">
        <h3 className="text-2xl font-medium text-[#f3f0e9]">Butuh kalender konten lengkap?</h3>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#aaa69e]">Paket Konten UMKM 30 Hari mencakup kalender 30 hari, 30 caption WhatsApp, dan 10 konsep video pendek lengkap dengan hook, naskah, storyboard, teks layar, CTA, dan hashtag. Harga mulai Rp149.000. Konsep video berupa arahan produksi, bukan video jadi.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/jasa/paket-konten-umkm-30-hari" className="inline-flex items-center gap-3 bg-[#c5a66a] px-6 py-4 text-[10px] font-semibold uppercase tracking-[.16em] text-[#101010]">Lihat detail & pesan <ArrowUpRight className="size-4"/></Link>
          <Link href="/kontak" className="inline-flex items-center border border-white/20 px-6 py-4 text-[10px] font-semibold uppercase tracking-[.16em] text-[#e9e5db]">Tanya dulu</Link>
        </div>
      </section>
    </PageStack>
  )
}

const Page = SampleContentPage as PageWithFrame
Page.getLayout = (page) => (
  <StoreFrame
    eyebrow="Contoh konten gratis"
    title="Contoh caption dan ide video untuk UMKM"
    intent="Contoh praktis untuk membantu usaha makanan menyusun promosi yang jelas dan mengundang pertanyaan pelanggan."
    description="Contoh gratis hook, caption, dan ide video promosi untuk usaha makanan dan UMKM dari Cyber Wealth."
  >
    {page}
  </StoreFrame>
)
export default Page
