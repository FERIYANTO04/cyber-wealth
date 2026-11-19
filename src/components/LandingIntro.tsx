import Link from 'next/link'
import { ArrowRight, ArrowUpRight, MessageCircle, UserRound } from 'lucide-react'
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
          <SignalLink href="/jasa">Layanan</SignalLink>
          <SignalLink href="/kontak">Kontak</SignalLink>
        </nav>
        <Link href="/member" className="flex items-center gap-1 text-xs font-medium text-ink hover:text-signal">
          <UserRound className="size-3" aria-hidden="true" /> Portal pelanggan
        </Link>
      </header>

      <section className="grid gap-8 py-8 sm:grid-cols-[1.2fr_0.8fr] sm:items-center sm:py-14">
        <div className="flex flex-col items-start gap-5">
          <p className="eyebrow">CYBER WEALTH · LAYANAN DIGITAL</p>
          <h1 className="heading-tight max-w-2xl text-[2.35rem] leading-[1.04] sm:text-[3.5rem]">
            Konten usaha lebih terencana. Promosi lebih konsisten.
          </h1>
          <p className="max-w-prose text-base leading-relaxed text-ink-quiet">
            Kami membantu usaha kecil menyiapkan kalender konten, caption promosi, dan konsep visual
            berdasarkan produk serta target pelanggan Anda. Kirim brief, tinjau penawaran, lalu mulai
            setelah ruang lingkup dan harga disepakati.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/jasa">
              <Button size="md">Lihat layanan <ArrowRight className="size-4" aria-hidden="true" /></Button>
            </Link>
            <SignalLink href="/kontak">Konsultasi kebutuhan</SignalLink>
          </div>
        </div>

        <Panel className="flex flex-col gap-4 p-page">
          <div className="flex items-center justify-between">
            <span className="eyebrow">LAYANAN TERSEDIA</span>
            <MessageCircle className="size-4 text-signal" aria-hidden="true" />
          </div>
          <div className="border-t border-line pt-4">
            <p className="text-sm font-medium text-ink">Paket Konten UMKM 30 Hari</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-quiet">
              Kalender konten 30 hari, 30 caption promosi, 10 konsep visual/reels, dan satu kali revisi.
            </p>
            <p className="mt-3 text-sm font-semibold text-ink">Mulai Rp149.000</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-quiet">
              Penawaran akhir dikonfirmasi setelah brief ditinjau. Estimasi pengerjaan dua hari kerja
              setelah ruang lingkup dan harga disepakati.
            </p>
          </div>
          <Link href="/jasa" className="flex items-center justify-between rounded-xl border border-line p-3 hover:border-signal">
            <span className="text-sm font-medium text-ink">Lihat detail dan kirim brief</span>
            <ArrowUpRight className="size-4 text-ink-quiet" aria-hidden="true" />
          </Link>
        </Panel>
      </section>

      <footer className="flex flex-col gap-2 border-t border-line pt-5 text-xs text-ink-quiet sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} Cyber Wealth. Penawaran mengikuti ruang lingkup yang disepakati.</span>
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
