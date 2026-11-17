import Link from 'next/link'
import { ArrowRight, Bot, ShieldCheck } from 'lucide-react'
import { Button, Panel, SignalLink } from '@/components/ui'

/** The public front door: what the console is for, and the ways in. */
export function LandingIntro({ needsSetup }: { needsSetup: boolean }) {
  return (
    <div className="flex flex-col gap-section pt-section">
      <div className="flex flex-col gap-block">
        <p className="eyebrow">Supervised autonomy · IDR</p>
        <h1 className="heading-tight text-[2rem] leading-[1.1] sm:text-[2.5rem]">
          Bisnis yang berjalan sendiri,
          <br />
          di bawah kendali Anda.
        </h1>
        <p className="max-w-prose text-[0.9375rem] leading-relaxed text-ink-quiet">
          Agen AI menjalankan riset pasar, produk digital, pemasaran, dan tindak lanjut pelanggan. Dana, kontrak, dan
          investasi tidak pernah bergerak tanpa keputusan Anda.
        </p>
      </div>

      <div className="flex flex-col gap-block">
        <Panel className="p-page">
          <div className="flex items-start gap-3">
            <Bot className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden="true" />
            <div>
              <p className="text-[0.8125rem] font-medium text-ink">Dijalankan AI sendiri</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-quiet">
                Riset, konten, follow-up, dan laporan harian berjalan dalam alur kerja yang sudah Anda setujui.
              </p>
            </div>
          </div>
        </Panel>
        <Panel className="p-page">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-hold" aria-hidden="true" />
            <div>
              <p className="text-[0.8125rem] font-medium text-ink">Berhenti di meja Anda</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-quiet">
                Setiap transaksi dana, kontrak, dan investasi menunggu persetujuan di pusat persetujuan.
              </p>
            </div>
          </div>
        </Panel>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SignalLink href="/toko">Lihat katalog produk</SignalLink>
        <SignalLink href="/jasa">Lihat layanan jasa</SignalLink>
        <SignalLink href="/langganan">Lihat paket langganan</SignalLink>
        <SignalLink href="/member">Portal anggota · Saldo & WD</SignalLink>
      </div>

      <div className="flex flex-col gap-2">
        <Link href="/login" className="w-full sm:w-auto">
          <Button size="md" className="w-full sm:w-auto">
            {needsSetup ? 'Siapkan akun pemilik' : 'Masuk ke konsol'}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </Link>
        <p className="text-xs leading-relaxed text-ink-quiet">
          Akses tunggal untuk pemilik. Konsol tidak terbuka untuk umum.
        </p>
      </div>
    </div>
  )
}
