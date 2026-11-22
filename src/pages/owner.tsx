import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { desc, eq } from 'drizzle-orm'
import { Activity, ArrowDownLeft, ArrowUpRight, Boxes, CircleDollarSign, LayoutDashboard, LogOut, Package, Settings2, ShieldCheck, Wallet, ExternalLink } from 'lucide-react'
import { requireOwnerPage } from '@/lib/auth'
import { db } from '@/lib/db'
import { activity as activityTable, agents, assets, ownerAccount, products, transactions } from '@/lib/db/schema'
import type { PageWithFrame } from '@/lib/frame'

const idr = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }
  ctx.res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  const [ownerRows, txRows, assetRows, productRows, agentRows, activityRows] = await Promise.all([
    db.select({ name: ownerAccount.name, email: ownerAccount.email, createdAt: ownerAccount.createdAt }).from(ownerAccount).where(eq(ownerAccount.id, guard.session.ownerId)).limit(1),
    db.select().from(transactions).where(eq(transactions.dataSource, 'live')).orderBy(desc(transactions.occurredAt)).limit(12),
    db.select().from(assets).where(eq(assets.dataSource, 'live')).orderBy(desc(assets.createdAt)).limit(50),
    db.select({ id: products.id, name: products.name, priceIdr: products.priceIdr, status: products.status, updatedAt: products.updatedAt }).from(products).where(eq(products.dataSource, 'live')).orderBy(desc(products.updatedAt)).limit(8),
    db.select({ id: agents.id, name: agents.name, role: agents.role, status: agents.status, lastRunAt: agents.lastRunAt }).from(agents).orderBy(agents.sortOrder).limit(20),
    db.select({ id: activityTable.id, actor: activityTable.actor, agentName: activityTable.agentName, action: activityTable.action, detail: activityTable.detail, createdAt: activityTable.createdAt }).from(activityTable).where(eq(activityTable.dataSource, 'live')).orderBy(desc(activityTable.createdAt)).limit(8),
  ])
  const owner = ownerRows[0]
  if (!owner) return { redirect: { destination: '/login', permanent: false } }
  const allTx = await db.select({ kind: transactions.kind, amount: transactions.amountIdr }).from(transactions).where(eq(transactions.dataSource, 'live'))
  const totalIncome = allTx.filter((r) => r.kind === 'revenue').reduce((s, r) => s + Number(r.amount), 0)
  const totalExpenses = allTx.filter((r) => r.kind !== 'revenue').reduce((s, r) => s + Number(r.amount), 0)
  const totalAssets = assetRows.reduce((s, r) => s + Number(r.valueIdr), 0)
  return { props: {
    owner: { name: owner.name, email: owner.email, createdAt: owner.createdAt.toISOString() },
    revenue: totalIncome, expenses: totalExpenses, netCash: totalIncome - totalExpenses, assets: totalAssets, netWorth: totalAssets + totalIncome - totalExpenses,
    transactions: txRows.map((r) => ({ id: r.id, kind: r.kind, category: r.category, description: r.description, amount: Number(r.amountIdr), date: r.occurredAt.toISOString() })),
    assetRows: assetRows.map((r) => ({ id: r.id, name: r.name, kind: r.kind, value: Number(r.valueIdr) })),
    products: productRows.map((r) => ({ id: r.id, name: r.name, price: Number(r.priceIdr), status: r.status, updatedAt: r.updatedAt.toISOString() })),
    agents: agentRows.map((r) => ({ id: r.id, name: r.name, role: r.role, status: r.status, lastRunAt: r.lastRunAt?.toISOString() ?? null })),
    activity: activityRows.map((r) => ({ id: r.id, actor: r.actor, agentName: r.agentName, action: r.action, detail: r.detail, date: r.createdAt.toISOString() })),
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
  const activeAgents = agents.filter((a) => /active|running|online/i.test(a.status)).length
  return <div className="min-h-screen bg-[#080b11] text-[#edf2fa] lg:h-screen lg:overflow-hidden">
    <Head><title>Owner Workspace · Cyber Wealth</title><meta name="robots" content="noindex,nofollow" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="theme-color" content="#080b11" /></Head>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[258px] flex-col border-r border-white/[0.07] bg-[#0d111a] lg:flex">
      <Link href="/owner" className="flex h-[82px] items-center gap-3 border-b border-white/[0.07] px-6"><span className="flex size-10 items-center justify-center rounded-xl bg-[#54d6b5] text-sm font-black text-[#06130f]">CW</span><span><b className="block text-sm tracking-[.13em]">CYBER WEALTH</b><small className="mt-1 block font-mono text-[9px] tracking-[.2em] text-slate-500">OWNER WORKSPACE</small></span></Link>
      <div className="px-4 pt-7"><p className="px-3 pb-3 font-mono text-[10px] uppercase tracking-[.18em] text-slate-600">Workspace</p><a href="/owner" className="mb-1 flex items-center gap-3 rounded-xl bg-[#16312f] px-3 py-3 text-sm font-semibold text-[#69dfc0]"><LayoutDashboard size={17}/> Overview</a><a href="/dashboard" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white"><Activity size={17}/> Operasional</a><a href="/toko" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white"><Package size={17}/> Halaman Publik</a></div>
      <div className="mt-8 px-4"><p className="px-3 pb-3 font-mono text-[10px] uppercase tracking-[.18em] text-slate-600">Management</p><div className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-500"><Wallet size={17}/> Keuangan</div><div className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-500"><Boxes size={17}/> Aset & produk</div><div className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-500"><Settings2 size={17}/> Pengaturan</div></div>
      <div className="mt-auto p-4"><div className="rounded-2xl border border-white/[0.07] bg-[#111925] p-4"><div className="flex items-center gap-2 text-xs font-semibold text-[#69dfc0]"><ShieldCheck size={15}/> Owner access</div><p className="mt-2 text-xs leading-5 text-slate-500">Ruang privat untuk memantau data dan aktivitas perusahaan.</p></div><form action="/api/auth/logout" method="post" className="mt-3"><button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-500 hover:bg-white/[0.04] hover:text-white"><LogOut size={16}/> Keluar</button></form></div>
    </aside>
    <div className="lg:pl-[258px]">
      <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#0b0f17]/90 backdrop-blur-xl"><div className="flex h-[82px] items-center justify-between gap-4 px-5 sm:px-8"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-slate-500">Cyber Wealth / Private</p><h1 className="mt-1 text-lg font-semibold tracking-tight">Owner overview</h1></div><div className="flex items-center gap-3"><a href="/toko" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[#54d6b5]/25 bg-[#54d6b5]/[0.08] px-3 py-2 text-xs font-semibold text-[#69dfc0] transition hover:bg-[#54d6b5]/[0.14]"><ExternalLink size={14}/> Lihat Halaman Publik</a><span className="hidden rounded-full border border-white/[0.08] px-3 py-1.5 text-[11px] font-medium text-slate-500 sm:inline-flex">● Owner workspace</span><div className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-[#17212d] text-xs font-bold">{owner.name.slice(0,1).toUpperCase()}</div></div></div></header>
      <main className="mx-auto max-w-[1600px] space-y-5 px-5 py-6 sm:px-8 lg:grid lg:h-[calc(100vh-82px)] lg:grid-rows-[auto_auto_minmax(0,1fr)_minmax(0,1fr)] lg:gap-4 lg:space-y-0 lg:overflow-hidden lg:px-7 lg:py-5">
        <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#69dfc0]">Executive dashboard</p><h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-[34px]">Selamat datang, {owner.name}</h2><p className="mt-2 text-sm text-slate-500">Ringkasan kondisi perusahaan dan aktivitas terbaru.</p></div><a href="/dashboard" className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-[#111925] px-4 py-2.5 text-xs font-semibold text-slate-200 hover:border-[#54d6b5]/40">Buka operasional <ArrowUpRight size={14}/></a></section>
        <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          <Metric icon={<CircleDollarSign size={17}/>} label="Total kekayaan tercatat" value={idr(netWorth)} note="Aset + kas bersih pembukuan" featured/>
          <Metric icon={<Wallet size={17}/>} label="Aset tercatat" value={idr(assets)} note="Nilai aset yang tersimpan"/>
          <Metric icon={<ArrowUpRight size={17}/>} label="Pendapatan kumulatif" value={idr(revenue)} note="Transaksi live tercatat"/>
          <Metric icon={<ArrowDownLeft size={17}/>} label="Pengeluaran kumulatif" value={idr(expenses)} note="Transaksi live tercatat"/>
        </section>
        <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr] lg:min-h-0">
          <Panel title="Ringkasan keuangan" subtitle="Angka berdasarkan pembukuan aplikasi"><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-white/[0.06] bg-[#0b1018] p-5"><p className="text-xs text-slate-500">Kas bersih pembukuan</p><p className="mt-3 text-2xl font-semibold tracking-tight">{idr(netCash)}</p><p className="mt-2 text-[11px] text-slate-600">Pendapatan dikurangi pengeluaran</p></div><div className="rounded-xl border border-white/[0.06] bg-[#0b1018] p-5"><p className="text-xs text-slate-500">Aktivitas tim AI</p><p className="mt-3 text-2xl font-semibold tracking-tight">{agents.length} <span className="text-sm font-normal text-slate-500">agen terdaftar</span></p><p className="mt-2 text-[11px] text-slate-600">{activeAgents} berstatus aktif/online menurut data</p></div></div><div className="mt-4 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] px-4 py-3 text-xs leading-5 text-amber-200/80">Catatan: nilai ini adalah catatan pembukuan aplikasi, bukan saldo rekening bank atau valuasi aset yang telah diverifikasi pihak ketiga.</div></Panel>
          <Panel title="Aset perusahaan" subtitle="Daftar aset dari database live">{assetRows.length ? <div className="divide-y divide-white/[0.06]">{assetRows.slice(0,6).map((a)=><div key={a.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{a.name}</p><p className="mt-1 text-[11px] text-slate-500">{a.kind}</p></div><p className="shrink-0 text-sm font-semibold tabular-nums">{idr(a.value)}</p></div>)}</div> : <Empty text="Belum ada aset live yang tercatat."/>}</Panel>
        </section>
        <section className="grid gap-4 xl:grid-cols-2 lg:min-h-0">
          <Panel title="Riwayat keuangan" subtitle="12 transaksi live terbaru">{transactions.length ? <div className="divide-y divide-white/[0.06]">{transactions.map((tx)=><div key={tx.id} className="flex items-center justify-between gap-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-200">{tx.description}</p><p className="mt-1 text-[11px] text-slate-500">{tx.category} · {new Date(tx.date).toLocaleDateString('id-ID')}</p></div><p className={`shrink-0 text-sm font-semibold tabular-nums ${tx.kind==='revenue'?'text-[#69dfc0]':'text-rose-300'}`}>{tx.kind==='revenue'?'+':'−'}{idr(tx.amount)}</p></div>)}</div>:<Empty text="Belum ada transaksi live."/>}</Panel>
          <Panel title="Kinerja tim AI" subtitle="Status sesuai catatan sistem">{agents.length ? <div className="divide-y divide-white/[0.06]">{agents.map((a)=><div key={a.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{a.name}</p><p className="mt-1 text-[11px] text-slate-500">{a.role}</p></div><div className="text-right"><span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] text-slate-300">{a.status}</span><p className="mt-1 text-[10px] text-slate-600">{a.lastRunAt?new Date(a.lastRunAt).toLocaleString('id-ID'):'Belum ada catatan eksekusi'}</p></div></div>)}</div>:<Empty text="Belum ada agen terdaftar."/>}</Panel>
        </section>
        <section className="grid gap-4 xl:grid-cols-2 lg:hidden"><Panel title="Produk tersedia" subtitle={`${products.length} produk live terakhir`}>{products.length?<div className="divide-y divide-white/[0.06]">{products.map((p)=><div key={p.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{p.name}</p><p className="mt-1 text-[11px] text-slate-500">{p.status} · {new Date(p.updatedAt).toLocaleDateString('id-ID')}</p></div><p className="shrink-0 text-sm font-semibold">{idr(p.price)}</p></div>)}</div>:<Empty text="Belum ada produk live."/>}</Panel>
          <Panel title="Aktivitas terbaru" subtitle="Log operasional, bukan klaim hasil yang belum diverifikasi">{activity.length?<div className="divide-y divide-white/[0.06]">{activity.map((item)=><div key={item.id} className="py-3"><div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-medium">{item.agentName||item.actor}: {item.action}</p><p className="text-[10px] text-slate-500">{new Date(item.date).toLocaleString('id-ID')}</p></div><p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p></div>)}</div>:<Empty text="Belum ada aktivitas live yang tercatat."/>}</Panel></section>
        <footer className="flex flex-wrap justify-between gap-2 border-t border-white/[0.07] py-5 text-[10px] text-slate-600"><span>Signed in as {owner.email}</span><span>Cyber Wealth · Owner Workspace</span></footer>
      </main>
    </div>
  </div>
}
function Metric({icon,label,value,note,featured=false}:{icon:React.ReactNode;label:string;value:string;note:string;featured?:boolean}){return <div className={`rounded-2xl border p-5 ${featured?'border-[#54d6b5]/25 bg-gradient-to-br from-[#15302e] to-[#101923]':'border-white/[0.07] bg-[#0f141e]'}`}><div className="flex items-center justify-between"><p className="text-xs font-medium text-slate-400">{label}</p><span className={`flex size-9 items-center justify-center rounded-xl ${featured?'bg-[#54d6b5]/15 text-[#69dfc0]':'bg-white/[0.05] text-slate-400'}`}>{icon}</span></div><p className="mt-5 break-words text-[22px] font-semibold tracking-tight tabular-nums sm:text-2xl">{value}</p><p className="mt-2 text-[11px] text-slate-500">{note}</p></div>}
function Panel({title,subtitle,children}:{title:string;subtitle?:string;children:React.ReactNode}){return <section className="rounded-2xl border border-white/[0.07] bg-[#0f141e] p-5 sm:p-6 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden"><div className="mb-4 shrink-0"><h3 className="text-sm font-semibold tracking-wide">{title}</h3>{subtitle&&<p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>}</div><div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pr-1">{children}</div></section>}
function Empty({text}:{text:string}){return <p className="rounded-xl border border-dashed border-white/10 bg-[#0b1018] px-4 py-7 text-center text-xs text-slate-500">{text}</p>}
const Page = OwnerDashboard as PageWithFrame<Props>
Page.getLayout = (page) => page
export default Page
