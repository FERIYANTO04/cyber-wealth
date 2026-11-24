import type { GetServerSideProps } from 'next'
import { and, eq, gt } from 'drizzle-orm'
import { LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react'
import { StoreFrame } from '@/components/StoreFrame'
import { VirtualShowroom, type ShowroomSample } from '@/components/VirtualShowroom'
import { getSession } from '@/lib/auth'
import { getCustomer, requireCustomerPage } from '@/lib/customer-auth'
import { db } from '@/lib/db'
import { products, services, subscriptions } from '@/lib/db/schema'
import type { PageWithFrame } from '@/lib/frame'

type Props = { paidAccess: boolean; samples: ShowroomSample[] }

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const [owner, customer] = await Promise.all([getSession(ctx.req), getCustomer(ctx.req)])
  if (!owner && !customer) {
    const guard = await requireCustomerPage(ctx)
    if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }
  }

  const email = customer?.email?.toLowerCase()
  const [activeSubscription] = email
    ? await db.select({ id: subscriptions.id })
        .from(subscriptions)
        .where(and(
          eq(subscriptions.accountEmail, email),
          eq(subscriptions.status, 'active'),
          eq(subscriptions.dataSource, 'live'),
          gt(subscriptions.periodEnd, new Date()),
          gt(subscriptions.amountIdr, 0)
        ))
        .limit(1)
    : []

  const paidAccess = Boolean(owner || activeSubscription)
  if (!paidAccess) return { props: { paidAccess: false, samples: [] } }

  const [productRows, serviceRows] = await Promise.all([
    db.select({ id: products.id, name: products.name })
      .from(products)
      .where(and(eq(products.status, 'published'), eq(products.dataSource, 'live')))
      .limit(12),
    db.select({ id: services.id, name: services.name })
      .from(services)
      .where(and(eq(services.status, 'published'), eq(services.dataSource, 'live')))
      .limit(12),
  ])

  const samples: ShowroomSample[] = [
    ...productRows.map(row => ({ id: 'product-' + row.id, name: row.name, kind: 'PRODUCT' as const })),
    ...serviceRows.map(row => ({ id: 'studio-' + row.id, name: row.name, kind: 'STUDIO' as const })),
  ]
  return { props: { paidAccess: true, samples } }
}

function ShowroomPage({ paidAccess, samples }: Props) {
  return (
    <div className="space-y-6">
      {paidAccess ? (
        <>
          <VirtualShowroom samples={samples} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-[#0d121a] p-4"><p className="text-[9px] uppercase tracking-[.18em] text-[#c5a66a]">Exhibition access</p><p className="mt-2 text-sm text-white">Paid studio</p><p className="mt-1 text-[11px] leading-5 text-slate-500">Area privat untuk melihat sampel pilihan Cyber Wealth.</p></div>
            <div className="rounded-xl border border-white/10 bg-[#0d121a] p-4"><p className="text-[9px] uppercase tracking-[.18em] text-[#c5a66a]">Camera limit</p><p className="mt-2 text-sm text-white">360° · 1.0×</p><p className="mt-1 text-[11px] leading-5 text-slate-500">Pandangan dapat diputar; pembesaran dan akses detail dinonaktifkan.</p></div>
            <div className="rounded-xl border border-white/10 bg-[#0d121a] p-4"><p className="text-[9px] uppercase tracking-[.18em] text-[#c5a66a]">Asset protection</p><p className="mt-2 text-sm text-white">Sealed preview</p><p className="mt-1 text-[11px] leading-5 text-slate-500">Tidak ada file sumber, spesifikasi, atau struktur internal yang dikirim ke halaman ini.</p></div>
          </div>
        </>
      ) : (
        <section className="mx-auto max-w-2xl rounded-2xl border border-[#c5a66a]/25 bg-[#0d121a] p-7 text-center sm:p-10">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-[#c5a66a]/30 bg-[#c5a66a]/10 text-[#d8bd83]"><LockKeyhole className="size-6"/></div>
          <p className="mt-5 font-mono text-[10px] uppercase tracking-[.22em] text-[#c5a66a]">Private access</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">3D Studio khusus anggota berbayar</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-slate-400">Ruang pamer dan sampel produk tidak ditampilkan pada akun gratis. Aktifkan paket berbayar untuk membuka akses ke showroom privat.</p>
          <a href="/harga" className="mt-7 inline-flex items-center gap-2 bg-[#c5a66a] px-6 py-3.5 text-[10px] font-semibold uppercase tracking-[.16em] text-[#101010] transition hover:bg-[#dfc58f]"><Sparkles className="size-4"/> Lihat paket akses</a>
          <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-slate-600"><ShieldCheck className="size-3.5"/> Katalog privat tidak dikirim ke akun gratis.</div>
        </section>
      )}
    </div>
  )
}

const Page = ShowroomPage as PageWithFrame<Props>
Page.getLayout = (page) => (
  <StoreFrame
    eyebrow="Cyber Wealth / Private 3D Studio"
    title="Private product showroom"
    intent="Jelajahi ruang pamer Cyber Wealth dalam pandangan 360°. Sampel hanya untuk dilihat, bukan dibongkar."
    variant="wide"
    description="Showroom 3D privat Cyber Wealth untuk anggota berbayar."
  >
    {page}
  </StoreFrame>
)
export default Page
