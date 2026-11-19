import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { requireOwnerPage } from '@/lib/auth'
import { db } from '@/lib/db'
import { ownerAccount, products, proposals, transactions } from '@/lib/db/schema'
import type { PageWithFrame } from '@/lib/frame'

const idr = (value: number) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(value)

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }
  ctx.res.setHeader('Cache-Control', 'private, no-store, max-age=0')

  const [ownerRows, txRows, productRows, approvalRows] = await Promise.all([
    db.select({ name: ownerAccount.name, email: ownerAccount.email, createdAt: ownerAccount.createdAt })
      .from(ownerAccount).where(eq(ownerAccount.id, guard.session.ownerId)).limit(1),
    db.select().from(transactions).where(eq(transactions.dataSource, 'live'))
      .orderBy(desc(transactions.occurredAt)).limit(100),
    db.select({ id: products.id, name: products.name, priceIdr: products.priceIdr, status: products.status, updatedAt: products.updatedAt })
      .from(products).where(eq(products.dataSource, 'live')).orderBy(desc(products.updatedAt)).limit(100),
    db.select({ id: proposals.id, title: proposals.title, summary: proposals.summary, category: proposals.category, amountIdr: proposals.amountIdr, risk: proposals.risk, createdAt: proposals.createdAt })
      .from(proposals).where(and(
        eq(proposals.dataSource, 'live'),
        eq(proposals.status, 'pending'),
        inArray(proposals.category, ['finance', 'investment', 'contract', 'legal', 'identity', 'kyc', 'security'])
      )).orderBy(desc(proposals.createdAt)).limit(20),
  ])

  const owner = ownerRows[0]
  if (!owner) return { redirect: { destination: '/login', permanent: false } }

  const revenue = txRows.filter((row) => row.kind === 'revenue').reduce((sum, row) => sum + Number(row.amountIdr), 0)
  const expenses = txRows.filter((row) => row.kind !== 'revenue').reduce((sum, row) => sum + Number(row.amountIdr), 0)
  return { props: {
    owner: { name: owner.name, email: owner.email, createdAt: owner.createdAt.toISOString() },
    revenue, expenses, net: revenue - expenses,
    transactions: txRows.slice(0, 12).map((row) => ({
      id: row.id, kind: row.kind, category: row.category, description: row.description,
      amount: Number(row.amountIdr), date: row.occurredAt.toISOString(),
    })),
    products: productRows.map((row) => ({
      id: row.id, name: row.name, price: Number(row.priceIdr), status: row.status,
      updatedAt: row.updatedAt.toISOString(),
    })),
    approvals: approvalRows.map((row) => ({
      id: row.id, title: row.title, summary: row.summary, category: row.category,
      amount: row.amountIdr === null ? null : Number(row.amountIdr), risk: row.risk,
      createdAt: row.createdAt.toISOString(),
    })),
  } }
}

type Props = {
  owner: { name: string; email: string; createdAt: string }
  revenue: number; expenses: number; net: number
  transactions: { id: string; kind: string; category: string; description: string; amount: number; date: string }[]
  products: { id: string; name: string; price: number; status: string; updatedAt: string }[]
  approvals: { id: string; title: string; summary: string; category: string; amount: number | null; risk: string; createdAt: string }[]
}

function OwnerOnlyDashboard({ owner, revenue, expenses, net, transactions, products, approvals }: Props) {
  return <div className="min-h-screen bg-[#f5f6f4] text-[#18211d]">
    <Head>
      <title>Dashboard Pribadi Owner</title>
      <meta name="robots" content="noindex,nofollow" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </Head>
    <header className="border-b border-black/10 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-emerald-700">Area privat</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight">Dashboard Owner</h1>
          <p className="mt-1 text-sm text-gray-500">Ringkasan pribadi. Tidak ada menu operasional bisnis.</p>
        </div>
        <form action="/api/auth/logout" method="post"><button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold hover:bg-gray-50">Keluar</button></form>
      </div>
    </header>
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Total pendapatan tercatat" value={idr(revenue)} />
        <Metric label="Total pengeluaran tercatat" value={idr(expenses)} />
        <Metric label="Selisih bersih tercatat" value={idr(net)} />
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-base font-bold">Persetujuan penting</h2><p className="mt-1 text-xs text-gray-500">Hanya keputusan yang membutuhkan Owner. Kendala teknis ditangani AI CEO.</p></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold">{approvals.length} menunggu</span></div>
        {approvals.length ? <div className="divide-y divide-gray-100">{approvals.map((item) => <div key={item.id} className="py-4"><div className="flex flex-wrap items-start justify-between gap-2"><p className="text-sm font-semibold">{item.title}</p><span className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleDateString('id-ID')}</span></div><p className="mt-1 text-sm leading-6 text-gray-600">{item.summary}</p><div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500"><span>Kategori: {item.category}</span><span>Risiko: {item.risk}</span>{item.amount !== null && <span>Nilai: {idr(item.amount)}</span>}</div></div>)}</div> : <Empty text="Tidak ada persetujuan penting yang menunggu. AI CEO tetap menangani pekerjaan operasional dan teknis." />}
        {approvals.length > 0 && <Link href="/approvals" className="mt-4 inline-flex rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Tinjau dan putuskan</Link>}
      </section>
      <section className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-base font-bold">Pendapatan & pengeluaran</h2><span className="text-xs text-gray-500">12 catatan terbaru</span></div>
          {transactions.length ? <div className="divide-y divide-gray-100">
            {transactions.map((tx) => <div key={tx.id} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0"><p className="truncate text-sm font-semibold">{tx.description}</p><p className="mt-1 text-xs text-gray-500">{tx.category} · {new Date(tx.date).toLocaleDateString('id-ID')}</p></div>
              <p className={`shrink-0 text-sm font-bold tabular-nums ${tx.kind === 'revenue' ? 'text-emerald-700' : 'text-rose-700'}`}>{tx.kind === 'revenue' ? '+' : '−'}{idr(tx.amount)}</p>
            </div>)}
          </div> : <Empty text="Belum ada transaksi keuangan yang tercatat." />}
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold">Data pribadi owner</h2>
          <dl className="space-y-4">
            <Profile label="Nama" value={owner.name} />
            <Profile label="Email akun" value={owner.email} />
            <Profile label="Akun dibuat" value={new Date(owner.createdAt).toLocaleDateString('id-ID', { dateStyle: 'long' })} />
            <Profile label="Akses" value="Owner saja · login diperlukan" />
          </dl>
          <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">Halaman ini hanya menampilkan ringkasan dan data akun. Tidak menyediakan kontrol agen, pelanggan, kampanye, atau operasional bisnis.</p>
        </div>
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-base font-bold">Produk</h2><span className="text-xs text-gray-500">{products.length} produk</span></div>
        {products.length ? <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead><tr className="border-b border-gray-100 text-xs text-gray-500"><th className="pb-3 font-medium">Nama produk</th><th className="pb-3 font-medium">Harga</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Diperbarui</th></tr></thead><tbody>
          {products.map((product) => <tr key={product.id} className="border-b border-gray-50 last:border-0"><td className="py-3 pr-4 font-semibold">{product.name}</td><td className="py-3 pr-4 tabular-nums">{idr(product.price)}</td><td className="py-3 pr-4"><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs">{product.status}</span></td><td className="py-3 text-gray-500">{new Date(product.updatedAt).toLocaleDateString('id-ID')}</td></tr>)}
        </tbody></table></div> : <Empty text="Belum ada produk yang tercatat." />}
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-3 pb-4 text-xs text-gray-500"><span>Data transaksi bersumber dari catatan aplikasi, bukan verifikasi saldo bank.</span><Link href="/login" className="underline underline-offset-4">Akses login owner</Link></footer>
    </main>
  </div>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-xs font-medium text-gray-500">{label}</p><p className="mt-2 break-words text-2xl font-bold tracking-tight tabular-nums">{value}</p></div>
}
function Profile({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-gray-500">{label}</dt><dd className="mt-1 break-words text-sm font-semibold">{value}</dd></div>
}
function Empty({ text }: { text: string }) { return <p className="rounded-xl bg-gray-50 px-4 py-6 text-sm text-gray-500">{text}</p> }

const Page = OwnerOnlyDashboard as PageWithFrame<Props>
Page.getLayout = (page) => page
export default Page
