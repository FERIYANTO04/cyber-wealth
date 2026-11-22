import type { GetServerSideProps } from 'next'
import Link from 'next/link'
import { ArrowUpRight, BriefcaseBusiness, Box, ShieldCheck, Sparkles } from 'lucide-react'
import { StoreFrame } from '@/components/StoreFrame'
import { PageStack } from '@/components/ui'
import { getSession } from '@/lib/auth'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getSession(ctx.req)
  if (session) return { redirect: { destination: '/owner', permanent: false } }
  return { props: {} }
}

function HomePage() {
  return (
    <PageStack>
      <section className="relative overflow-hidden rounded-[28px] border border-line bg-surface p-7 sm:p-12">
        <div className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-signal/10 blur-3xl" />
        <p className="font-mono text-[10px] uppercase tracking-[.28em] text-signal">Digital solutions · Built for progress</p>
        <h2 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">Bangun bisnis lebih cerdas. <span className="text-signal">Bergerak lebih jauh.</span></h2>
        <p className="mt-6 max-w-2xl text-sm leading-7 text-ink-quiet sm:text-base">Cyber Wealth menghadirkan produk digital, layanan kreatif, dan perangkat kerja untuk membantu individu serta bisnis bergerak lebih efisien.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/jasa" className="inline-flex items-center gap-2 rounded-xl bg-signal px-5 py-3 text-sm font-semibold text-[#07110f]">Jelajahi layanan <ArrowUpRight className="size-4"/></Link>
          <Link href="/toko" className="inline-flex items-center gap-2 rounded-xl border border-line px-5 py-3 text-sm font-semibold text-ink hover:border-signal">Lihat produk digital</Link>
        </div>
        <div className="mt-12 grid gap-3 border-t border-line pt-6 sm:grid-cols-3">
          <div><p className="text-xs text-ink-quiet">01 / Discover</p><p className="mt-2 text-sm font-semibold">Temukan solusi yang tepat</p></div>
          <div><p className="text-xs text-ink-quiet">02 / Build</p><p className="mt-2 text-sm font-semibold">Pilih produk atau layanan</p></div>
          <div><p className="text-xs text-ink-quiet">03 / Grow</p><p className="mt-2 text-sm font-semibold">Kembangkan pekerjaan dan bisnis</p></div>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <Link href="/jasa" className="group rounded-2xl border border-line bg-surface p-6 transition hover:border-signal"><BriefcaseBusiness className="size-6 text-signal"/><h3 className="mt-5 text-lg font-semibold">Layanan digital</h3><p className="mt-2 text-sm leading-6 text-ink-quiet">Jasa website, desain, konten, dan pemasaran. Kirim kebutuhan untuk ditinjau.</p><span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-signal">Lihat layanan <ArrowUpRight className="size-3.5"/></span></Link>
        <Link href="/toko" className="group rounded-2xl border border-line bg-surface p-6 transition hover:border-signal"><Box className="size-6 text-signal"/><h3 className="mt-5 text-lg font-semibold">Produk digital</h3><p className="mt-2 text-sm leading-6 text-ink-quiet">Template, panduan, dan materi praktis yang tersedia di katalog.</p><span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-signal">Jelajahi katalog <ArrowUpRight className="size-3.5"/></span></Link>
        <Link href="/harga" className="group rounded-2xl border border-line bg-surface p-6 transition hover:border-signal"><Sparkles className="size-6 text-signal"/><h3 className="mt-5 text-lg font-semibold">Paket platform</h3><p className="mt-2 text-sm leading-6 text-ink-quiet">Bandingkan paket dan fitur untuk kebutuhan operasional digital.</p><span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-signal">Bandingkan paket <ArrowUpRight className="size-3.5"/></span></Link>
      </section>
      <section className="flex flex-col gap-5 rounded-2xl border border-line p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4"><ShieldCheck className="mt-1 size-6 shrink-0 text-signal"/><div><h3 className="font-semibold">Informasi jelas sebelum Anda memesan</h3><p className="mt-1 text-sm leading-6 text-ink-quiet">Pelajari cara kerja, ketentuan, dan metode pembayaran melalui halaman bantuan.</p></div></div>
        <Link href="/faq" className="shrink-0 text-sm font-semibold text-signal">Baca pusat bantuan <ArrowUpRight className="ml-1 inline size-4"/></Link>
      </section>
    </PageStack>
  )
}

const Page = HomePage as PageWithFrame
Page.getLayout = (page) => (
  <StoreFrame eyebrow="Cyber Wealth / Official website" title="Solusi digital untuk langkah berikutnya" intent="Platform digital yang menghubungkan produk siap pakai dan layanan untuk membantu pekerjaan serta bisnis Anda." variant="wide" description="Cyber Wealth menyediakan layanan digital, produk digital, dan paket platform untuk mendukung pertumbuhan bisnis.">
    {page}
  </StoreFrame>
)
export default Page
