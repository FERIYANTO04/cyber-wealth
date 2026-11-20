import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import { desc, eq } from 'drizzle-orm'
import { requireOwnerPage } from '@/lib/auth'
import { db } from '@/lib/db'
import { activity, agents, assets, ownerAccount, products, transactions } from '@/lib/db/schema'
import type { PageWithFrame } from '@/lib/frame'

const idr = (value: number) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(value)

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }
  ctx.res.setHeader('Cache-Control', 'private, no-store, max-age=0')

  const [ownerRows, txRows, assetRows, productRows, agentRows, activityRows] = await Promise.all([
    db.select({ name: ownerAccount.name, email: ownerAccount.email, createdAt: ownerAccount.createdAt })
      .from(ownerAccount).where(eq(ownerAccount.id, guard.session.ownerId)).limit(1),
    db.select().from(transactions).where(eq(transactions.dataSource, 'live'))
      .orderBy(desc(transactions.occurredAt)).limit(12),
    db.select().from(assets).where(eq(assets.dataSource, 'live')).orderBy(desc(assets.createdAt)).limit(50),
    db.select({ id: products.id, name: products.name, priceIdr: products.priceIdr, status: products.status, updatedAt: products.updatedAt })
      .from(products).where(eq(products.dataSource, 'live')).orderBy(desc(products.updatedAt)).limit(8),
    db.select({ id: agents.id, name: agents.name, role: agents.role, status: agents.status, lastRunAt: agents.lastRunAt })
      .from(agents).orderBy(agents.sortOrder).limit(20),
    db.select({ id: activity.id, actor: activity.actor, agentName: activity.agentName, action: activity.action, detail: activity.detail, createdAt: activity.createdAt })
      .from(activity).where(eq(activity.dataSource, 'live')).orderBy(desc(activity.createdAt)).limit(8),
  ])

  const owner = ownerRows[0]
  if (!owner) return { redirect: { destination: '/login', permanent: false } }

  const allTx = await db.select({ kind: transactions.kind, amount: transactions.amountIdr })
    .from(transactions).where(eq(transactions.dataSource, 'live'))
  const totalIncome = allTx.filter((row) => row.kind === 'revenue').reduce((sum, row) => sum + Number(row.amount), 0)
  const totalExpenses = allTx.filter((row) => row.kind !== 'revenue').reduce((sum, row) => sum + Number(row.amount), 0)
  const totalAssets = assetRows.reduce((sum, row) => sum + Number(row.valueIdr), 0)
  return { props: {
    owner: { name: owner.name, email: owner.email, createdAt: owner.createdAt.toISOString() },
    revenue: totalIncome, expenses: totalExpenses, netCash: totalIncome - totalExpenses,
    assets: totalAssets, netWorth: totalAssets + totalIncome - totalExpenses,
    transactions: txRows.map((row) => ({
      id: row.id, kind: row.kind, category: row.category, description: row.description,
      amount: Number(row.amountIdr), date: row.occurredAt.toISOString(),
    })),
    assetRows: assetRows.map((row) => ({ id: row.id, name: row.name, kind: row.kind, value: Number(row.valueIdr) })),
    products: productRows.map((row) => ({ id: row.id, name: row.name, price: Number(row.priceIdr), status: row.status, updatedAt: row.updatedAt.toISOString() })),
    agents: agentRows.map((row) => ({ id: row.id, name: row.name, role: row.role, status: row.status, lastRunAt: row.lastRunAt?.toISOString() ?? null })),
    activity: activityRows.map((row) => ({ id: row.id, actor: row.actor, agentName: row.agentName, action: row.action, detail: row.detail, date: row.createdAt.toISOString() })),
  } }
}

type Props = {
  owner: { name: string; email: string; createdAt: string }
  revenue: number; expenses: number; netCash: number; assets: number; netWorth: number
  transactions: { id: string; kind: string; category: string; description: string; amount: number; date: string }[]
  assetRows: { id: string; name: string; kind: string; value: number }[]
  products: { id: string; name: string; price: number; status: string; updatedAt: string }[]
  agents: { id: string; name: string; role: string; status: string; lastRunAt: string | null }[]
  activity: { id: string; actor: string; agentName: string | null; action: string; detail: string; date: string }[]
}

function OwnerDashboard({ owner, revenue, expenses, netCash, assets, netWorth, transactions, assetRows, products, agents, activity }: Props) {
  return <div className="min-h-screen bg-[#f5f6f4] text-[#18211d]">
    <Head><title>Dashboard Owner · Cyber Wealth</title><meta name="robots" content="noindex,nofollow" /><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
    <header className="border-b border-black/10 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-emerald-700">Laporan privat</p><h1 className="mt-1 text-xl font-bold tracking-tight">Dashboard Owner</h1><p className="mt-1 text-sm text-gray-500">Pemantauan saja · operasional ditangani sistem AI.</p></div>
        <div className="flex flex-wrap items-center gap-2"><a href="/facebook" className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Hubungkan Meta</a><form action="/api/auth/logout" method="post"><button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold hover:bg-gray-50">Keluar</button></form></div>
      </div>
    </header>
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total kekayaan tercatat" value={idr(netWorth)} />
        <Metric label="Aset tercatat" value={idr(assets)} />
        <Metric label="Kas bersih pembukuan" value={idr(netCash)} />
        <Metric label="Pendapatan kumulatif" value={idr(revenue)} />
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        <Metric label="Total pengeluaran kumulatif" value={idr(expenses)} />
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><p className="text-xs font-semibold text-amber-900">Catatan verifikasi</p><p className="mt-2 text-sm leading-6 text-amber-900">Angka ini berasal dari pembukuan aplikasi. Bukan saldo rekening bank atau valuasi aset yang telah diverifikasi pihak ketiga.</p></div>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="Aset perusahaan">
          {assetRows.length ? <div className="divide-y divide-gray-100">{assetRows.map((a) => <div key={a.id} className="flex justify-between gap-3 py-3 text-sm"><div><p className="font-semibold">{a.name}</p><p className="text-xs text-gray-500">{a.kind}</p></div><p className="font-bold tabular-nums">{idr(a.value)}</p></div>)}</div> : <Empty text="Belum ada aset live yang tercatat." />}
        </Panel>
        <Panel title="Kinerja tim AI">
          <div className="divide-y divide-gray-100">{agents.map((a) => <div key={a.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold">{a.name}</p><p className="text-xs text-gray-500">{a.role}</p></div><div className="text-right"><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs">{a.status}</span><p className="mt-1 text-[11px] text-gray-500">{a.lastRunAt ? new Date(a.lastRunAt).toLocaleString('id-ID') : 'Belum ada catatan eksekusi'}</p></div></div>)}</div>
        </Panel>
      </section>
      <Panel title="Riwayat keuangan" subtitle="Transaksi live terbaru yang tercatat di sistem">
        {transactions.length ? <div className="divide-y divide-gray-100">{transactions.map((tx) => <div key={tx.id} className="flex items-start justify-between gap-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{tx.description}</p><p className="mt-1 text-xs text-gray-500">{tx.category} · {new Date(tx.date).toLocaleDateString('id-ID')}</p></div><p className={`shrink-0 text-sm font-bold tabular-nums ${tx.kind === 'revenue' ? 'text-emerald-700' : 'text-rose-700'}`}>{tx.kind === 'revenue' ? '+' : '−'}{idr(tx.amount)}</p></div>)}</div> : <Empty text="Belum ada transaksi live." />}
      </Panel>
      <Panel title="Aktivitas operasional terbaru" subtitle="Catatan sistem, bukan klaim pekerjaan yang belum dibuktikan">
        {activity.length ? <div className="divide-y divide-gray-100">{activity.map((item) => <div key={item.id} className="py-3"><div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-semibold">{item.agentName || item.actor}: {item.action}</p><p className="text-xs text-gray-500">{new Date(item.date).toLocaleString('id-ID')}</p></div><p className="mt-1 text-sm leading-6 text-gray-600">{item.detail}</p></div>)}</div> : <Empty text="Belum ada aktivitas live yang tercatat." />}
      </Panel>
      <Panel title="Produk yang tersedia" subtitle={`${products.length} produk live terakhir`}>
        {products.length ? <div className="divide-y divide-gray-100">{products.map((p) => <div key={p.id} className="flex justify-between gap-3 py-3 text-sm"><div><p className="font-semibold">{p.name}</p><p className="text-xs text-gray-500">{p.status} · diperbarui {new Date(p.updatedAt).toLocaleDateString('id-ID')}</p></div><p className="font-bold">{idr(p.price)}</p></div>)}</div> : <Empty text="Belum ada produk live." />}
      </Panel>
      <footer className="flex flex-wrap justify-between gap-3 pb-4 text-xs text-gray-500"><span>Akun Owner: {owner.name} · {owner.email}</span><span>Dibuat {new Date(owner.createdAt).toLocaleDateString('id-ID')}</span></footer>
    </main>
  </div>
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-xs font-medium text-gray-500">{label}</p><p className="mt-2 break-words text-xl font-bold tracking-tight tabular-nums">{value}</p></div> }
function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><div className="mb-3"><h2 className="text-base font-bold">{title}</h2>{subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}</div>{children}</section> }
function Empty({ text }: { text: string }) { return <p className="rounded-xl bg-gray-50 px-4 py-6 text-sm text-gray-500">{text}</p> }
const Page = OwnerDashboard as PageWithFrame<Props>
Page.getLayout = (page) => page
export default Page
