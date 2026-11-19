import Link from 'next/link'
import { ArrowRight, ArrowUpRight, Layers3, MessageCircle, Sparkles } from 'lucide-react'
import { Button, Panel, SignalLink } from '@/components/ui'

/** Public company homepage. Owner controls stay behind the private sign-in route. */
export function LandingIntro({ needsSetup: _needsSetup }: { needsSetup: boolean }) {
  return (
    <div className="flex flex-col gap-section pb-section">
      <header className="flex items-center justify-between gap-4 border-b border-line pb-4">
        <Link href="/" className="text-sm font-semibold tracking-[0.18em] text-ink">
          CYBER WEALTH
        </Link>
        <nav className="hidden items-center gap-5 text-xs text-ink-quiet sm:flex" aria-label="Navigasi utama">
          <SignalLink href="/toko">Produk</SignalLink>
          <SignalLink href="/jasa">Layanan</SignalLink>
          <SignalLink href="/langganan">Langganan</SignalLink>
          <SignalLink href="/kontak">Kontak</SignalLink>
        </nav>
        <Link href="/login" className="text-xs font-medium text-ink hover:text-signal">
          Owner <ArrowUpRight className="ml-1 inline size-3" aria-hidden="true" />
        </Link>
      </header>

      <section className="grid gap-8 py-8 sm:grid-cols-[1.2fr_0.8fr] sm:items-center sm:py-14">
        <div className="flex flex-col items-start gap-5">
          <p className="eyebrow">CYBER WEALTH · DIGITAL BUSINESS</p>
          <h1 className="heading-tight max-w-2xl text-[2.35rem] leading-[1.04] sm:text-[3.5rem]">
            Solusi digital untuk langkah bisnis yang lebih maju.
          </h1>
          <p className="max-w-prose text-base leading-relaxed text-ink-quiet">
            Temukan produk digital, layanan kreatif, dan paket berlangganan dalam satu tempat.
            Pilih kebutuhan Anda, lihat detailnya, lalu lanjutkan melalui proses pemesanan yang tersedia.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/toko">
              <Button size="md">Jelajahi produk <ArrowRight className="size-4" aria-hidden="true" /></Button>
            </Link>
            <SignalLink href="/kontak">Konsultasi kebutuhan</SignalLink>
          </div>
        </div>

        <Panel className="flex flex-col gap-4 p-page">
          <div className="flex items-center justify-between">
            <span className="eyebrow">PUSAT LAYANAN</span>
            <Sparkles className="size-4 text-signal" aria-hidden="true" />
          </div>
          <div className="border-t border-line pt-4">
            <p className="text-sm font-medium text-ink">Satu pintu untuk kebutuhan digital</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-quiet">
              Lihat pilihan yang tersedia dan pilih jalur yang paling sesuai dengan kebutuhan Anda.
            </p>
          </div>
          <div className="grid gap-3">
            <Link href="/toko" className="group flex items-center justify-between rounded-xl border border-line p-3 hover:border-signal">
              <span className="flex items-center gap-3">
                <Layers3 className="size-4 text-signal" aria-hidden="true" />
                <span><span className="block text-sm font-medium text-ink">Produk digital</span><span className="block text-xs text-ink-quiet">Template, panduan, dan materi</span></span>
              </span>
              <ArrowUpRight className="size-4 text-ink-quiet" aria-hidden="true" />
            </Link>
            <Link href="/jasa" className="group flex items-center justify-between rounded-xl border border-line p-3 hover:border-signal">
              <span className="flex items-center gap-3">
                <MessageCircle className="size-4 text-signal" aria-hidden="true" />
                <span><span className="block text-sm font-medium text-ink">Layanan digital</span><span className="block text-xs text-ink-quiet">Desain, website, konten, pemasaran</span></span>
              </span>
              <ArrowUpRight className="size-4 text-ink-quiet" aria-hidden="true" />
            </Link>
          </div>
        </Panel>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Panel className="p-page">
          <p className="eyebrow">01 · BELANJA</p>
          <h2 className="mt-2 text-sm font-semibold text-ink">Produk digital</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-quiet">Pilih produk yang tersedia dan akses setelah pembayaran terkonfirmasi.</p>
          <div className="mt-4"><SignalLink href="/toko">Buka katalog</SignalLink></div>
        </Panel>
        <Panel className="p-page">
          <p className="eyebrow">02 · KERJA SAMA</p>
          <h2 className="mt-2 text-sm font-semibold text-ink">Jasa profesional</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-quiet">Kirim kebutuhan Anda untuk ditinjau dan mendapatkan penawaran.</p>
          <div className="mt-4"><SignalLink href="/jasa">Lihat layanan</SignalLink></div>
        </Panel>
        <Panel className="p-page">
          <p className="eyebrow">03 · BERLANGGANAN</p>
          <h2 className="mt-2 text-sm font-semibold text-ink">Paket layanan</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-quiet">Bandingkan paket dan kelola langganan melalui portal pelanggan.</p>
          <div className="mt-4"><SignalLink href="/langganan">Bandingkan paket</SignalLink></div>
        </Panel>
      </section>

      <footer className="flex flex-col gap-2 border-t border-line pt-5 text-xs text-ink-quiet sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} Cyber Wealth. Informasi produk dan layanan mengikuti katalog yang tersedia.</span>
        <div className="flex flex-wrap gap-4">
          <SignalLink href="/faq">Bantuan</SignalLink>
          <SignalLink href="/syarat">Syarat layanan</SignalLink>
          <SignalLink href="/privasi">Privasi</SignalLink>
          <SignalLink href="/kontak">Hubungi kami</SignalLink>
        </div>
      </footer>
    </div>
  )
}
