import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { count, countDistinct, desc, eq, gte, sql } from 'drizzle-orm'
import { Activity, ArrowDownLeft, ArrowUpRight, Boxes, CircleDollarSign, Clapperboard, LayoutDashboard, LogOut, Package, Settings2, ShieldCheck, Wallet, ExternalLink } from 'lucide-react'
import { requireOwnerPage } from '@/lib/auth'
import { db } from '@/lib/db'
import { activity as activityTable, agentRuns, agents, assets, ownerAccount, products, serviceRequests, siteVisit, transactions } from '@/lib/db/schema'
import type { PageWithFrame } from '@/lib/frame'

const idr = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }
  ctx.res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const [ownerRows, txRows, assetRows, productRows, agentRows, activityRows, visitToday, visitorToday, visitWeek, dailyVisits, topPages, requestCount, runRows] = await Promise.all([
    db.select({ name: ownerAccount.name, email: ownerAccount.email, createdAt: ownerAccount.createdAt }).from(ownerAccount).where(eq(ownerAccount.id, guard.session.ownerId)).limit(1),
    db.select().from(transactions).where(eq(transactions.dataSource, 'live')).orderBy(desc(transactions.occurredAt)).limit(12),
    db.select().from(assets).where(eq(assets.dataSource, 'live')).orderBy(desc(assets.createdAt)).limit(50),
    db.select({ id: products.id, name: products.name, priceIdr: products.priceIdr, status: products.status, updatedAt: products.updatedAt }).from(products).where(eq(products.dataSource, 'live')).orderBy(desc(products.updatedAt)).limit(8),
    db.select({ id: agents.id, name: agents.name, role: agents.role, status: agents.status, lastRunAt: agents.lastRunAt }).from(agents).orderBy(agents.sortOrder).limit(20),
    db.select({ id: activityTable.id, actor: activityTable.actor, agentName: activityTable.agentName, action: activityTable.action, detail: activityTable.detail, createdAt: activityTable.createdAt }).from(activityTable).where(eq(activityTable.dataSource, 'live')).orderBy(desc(activityTable.createdAt)).limit(8),
    db.select({ value: count() }).from(siteVisit).where(gte(siteVisit.viewedAt, todayStart)),
    db.select({ value: countDistinct(siteVisit.visitorHash) }).from(siteVisit).where(gte(siteVisit.viewedAt, todayStart)),
    db.select({ value: count() }).from(siteVisit).where(gte(siteVisit.viewedAt, since7)),
    db.select({ day: sql<string>`to_char(date_trunc('day', ${siteVisit.viewedAt}), 'YYYY-MM-DD')`, views: count(), visitors: countDistinct(siteVisit.visitorHash) }).from(siteVisit).where(gte(siteVisit.viewedAt, since7)).groupBy(sql`date_trunc('day', ${siteVisit.viewedAt})`).orderBy(sql`date_trunc('day', ${siteVisit.viewedAt})`),
    db.select({ path: siteVisit.path, views: count() }).from(siteVisit).where(gte(siteVisit.viewedAt, since7)).groupBy(siteVisit.path).orderBy(desc(count())).limit(5),
    db.select({ value: count() }).from(serviceRequests),
    db.select({ agentName: agentRuns.agentName, status: agentRuns.status, startedAt: agentRuns.startedAt, finishedAt: agentRuns.finishedAt, itemsCreated: agentRuns.itemsCreated }).from(agentRuns).where(gte(agentRuns.startedAt, since7)).orderBy(desc(agentRuns.startedAt)).limit(300),
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
    analytics: {
      todayViews: Number(visitToday[0]?.value ?? 0), todayVisitors: Number(visitorToday[0]?.value ?? 0),
      weekViews: Number(visitWeek[0]?.value ?? 0),
      daily: dailyVisits.map((r) => ({ day: r.day, views: Number(r.views), visitors: Number(r.visitors) })),
      topPages: topPages.map((r) => ({ path: r.path, views: Number(r.views) })),
      clientRequests: Number(requestCount[0]?.value ?? 0),
      agentRuns: runRows.length,
      agentSuccess: runRows.filter((r) => /^(success|succeeded|completed|done)$/i.test(r.status)).length,
      agentFailed: runRows.filter((r) => /^(failed|error|cancelled)$/i.test(r.status)).length,
      agentItems: runRows.reduce((sum, r) => sum + Number(r.itemsCreated || 0), 0),
    },
    agents: agentRows.map((r) => ({ id: r.id, name: r.name, role: r.role, status: r.status, lastRunAt: r.lastRunAt?.toISOString() ?? null })),
    activity: activityRows.map((r) => ({ id: r.id, actor: r.actor, agentName: r.agentName, action: r.action, detail: r.detail, date: r.createdAt.toISOString() })),
  } }
}

type Props = {
  analytics: { todayViews: number; todayVisitors: number; weekViews: number; daily: { day: string; views: number; visitors: number }[]; topPages: { path: string; views: number }[]; clientRequests: number; agentRuns: number; agentSuccess: number; agentFailed: number; agentItems: number }
  owner: { name: string; email: string; createdAt: string }
  revenue: number; expenses: number; netCash: number; assets: number; netWorth: number
  transactions: { id: string; kind: string; category: string; description: string; amount: number; date: string }[]
  assetRows: { id: string; name: string; kind: string; value: number }[]
  products: { id: string; name: string; price: number; status: string; updatedAt: string }[]
  agents: { id: string; name: string; role: string; status: string; lastRunAt: string | null }[]
  activity: { id: string; actor: string; agentName: string | null; action: string; detail: string; date: string }[]
}

function OwnerDashboard({ analytics, owner, revenue, expenses, netCash, assets, netWorth, transactions, assetRows, products, agents, activity }: Props) {
  const activeAgents = agents.filter((a) => /active|running|online/i.test(a.status)).length
  const money = (n: number) => idr(n)
  return <div className="min-h-screen bg-[#070a0f] text-[#f2f5f8] lg:h-screen lg:overflow-hidden">
    <Head><title>Cyber Wealth — Executive Office</title><meta name="robots" content="noindex,nofollow" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="theme-color" content="#070a0f" /></Head>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col border-r border-white/[0.065] bg-[#0a0e14] lg:flex">
      <Link href="/owner" className="flex h-[76px] items-center gap-3 border-b border-white/[0.065] px-6">
        <span className="flex size-10 items-center justify-center rounded-[13px] border border-[#b7a16a]/30 bg-gradient-to-br from-[#b7a16a] to-[#78613a] text-sm font-black tracking-tight text-[#090c10] shadow-[0_4px_24px_rgba(183,161,106,.16)]">CW</span>
        <span><b className="block text-[13px] font-semibold tracking-[.17em]">CYBER WEALTH</b><small className="mt-1 block font-mono text-[9px] tracking-[.19em] text-[#8c929c]">EXECUTIVE OFFICE</small></span>
      </Link>
      <div className="px-4 pt-7">
        <p className="px-3 pb-3 font-mono text-[9px] uppercase tracking-[.2em] text-[#646d79]">Main workspace</p>
        <Link href="/owner" className="mb-1 flex items-center gap-3 rounded-xl border border-[#b7a16a]/15 bg-[#b7a16a]/[0.09] px-3 py-3 text-[13px] font-semibold text-[#d8c18b]"><LayoutDashboard size={16}/> Executive overview</Link>
        <Link href="/dashboard" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] text-[#929ba8] transition hover:bg-white/[0.04] hover:text-white"><Activity size={16}/> Operations center</Link>
        <Link href="/toko" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] text-[#929ba8] transition hover:bg-white/[0.04] hover:text-white"><Package size={16}/> Public storefront <ExternalLink size={12} className="ml-auto opacity-60"/></Link>
      </div>
      <div className="mt-7 px-4">
        <p className="px-3 pb-3 font-mono text-[9px] uppercase tracking-[.2em] text-[#646d79]">Company management</p>
        <Link href="/finance" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] text-[#929ba8] transition hover:bg-white/[0.04] hover:text-white"><Wallet size={16}/> Financial ledger</Link>
        <Link href="/produk" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] text-[#929ba8] transition hover:bg-white/[0.04] hover:text-white"><Boxes size={16}/> Products & assets</Link>
        <Link href="/agents" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] text-[#929ba8] transition hover:bg-white/[0.04] hover:text-white"><Settings2 size={16}/> AI workforce</Link>
        <Link href="/studio" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] text-[#929ba8] transition hover:bg-white/[0.04] hover:text-white"><Clapperboard size={16}/> Creative production</Link>
      </div>
      <div className="mt-auto p-4">
        <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#121a22] to-[#0c1118] p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#c8b27e]"><ShieldCheck size={14}/> PRIVATE OWNER ACCESS</div>
          <p className="mt-2 text-[11px] leading-5 text-[#818b98]">Akses eksekutif untuk pemantauan perusahaan.</p>
        </div>
        <form action="/api/auth/logout" method="post" className="mt-3"><button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[12px] text-[#7e8996] transition hover:bg-white/[0.04] hover:text-white"><LogOut size={15}/> Sign out</button></form>
      </div>
    </aside>
    <div className="lg:pl-[252px]">
      <header className="sticky top-0 z-20 border-b border-white/[0.065] bg-[#090d13]/90 backdrop-blur-2xl">
        <div className="flex h-[76px] items-center justify-between gap-4 px-5 sm:px-8 xl:px-10">
          <div><p className="font-mono text-[9px] uppercase tracking-[.22em] text-[#7f8995]">CYBER WEALTH <span className="px-1 text-[#b7a16a]">/</span> PRIVATE OFFICE</p><h1 className="mt-1 text-[15px] font-semibold tracking-wide">Executive overview</h1></div>
          <div className="flex items-center gap-3">
            <Link href="/toko" target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-[#b7a16a]/30 bg-[#b7a16a]/[0.08] px-3.5 py-2.5 text-[11px] font-semibold text-[#d8c18b] transition hover:bg-[#b7a16a]/[0.15]"><ExternalLink size={13}/> View public website</Link>
            <div className="hidden h-8 w-px bg-white/10 sm:block"/>
            <div className="flex size-9 items-center justify-center rounded-full border border-[#b7a16a]/30 bg-[#171a20] text-xs font-semibold text-[#d8c18b]">{owner.name.slice(0,1).toUpperCase()}</div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1700px] space-y-5 px-5 py-6 sm:px-8 xl:px-10 lg:grid lg:h-[calc(100vh-76px)] lg:grid-rows-[auto_auto_minmax(0,1fr)] lg:gap-5 lg:space-y-0 lg:overflow-hidden lg:py-6">
        <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div><p className="font-mono text-[9px] uppercase tracking-[.23em] text-[#b7a16a]">Leadership dashboard</p><h2 className="mt-2 text-[26px] font-semibold tracking-[-.04em] sm:text-[32px]">Good to see you, {owner.name}.</h2><p className="mt-1.5 text-[12px] text-[#828d9a]">Your company at a glance. Clear numbers, current records, informed decisions.</p></div>
          <div className="flex items-center gap-2 text-[10px] text-[#77818d]"><span className="size-1.5 rounded-full bg-[#65c6a5] shadow-[0_0_10px_rgba(101,198,165,.65)]"/> PRIVATE SESSION <span className="text-white/20">·</span> OWNER</div>
        </section>
        <section className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
          <div className="relative overflow-hidden rounded-[22px] border border-[#b7a16a]/25 bg-[radial-gradient(ellipse_at_85%_10%,rgba(183,161,106,.17),transparent_42%),linear-gradient(125deg,#171b20,#0d131a_68%)] p-6 sm:p-7">
            <div className="absolute -right-16 -top-24 size-72 rounded-full border border-[#b7a16a]/[0.08]"/><div className="absolute -right-6 -top-14 size-52 rounded-full border border-[#b7a16a]/[0.08]"/>
            <div className="relative flex h-full flex-col justify-between gap-7">
              <div><div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[.18em] text-[#c4ad79]"><CircleDollarSign size={14}/> Total recorded wealth</div><p className="mt-4 break-all text-[clamp(1.8rem,3vw,2.8rem)] font-semibold tracking-[-.045em] tabular-nums">{money(netWorth)}</p><p className="mt-2 max-w-md text-[11px] leading-5 text-[#8e98a3]">Combined recorded assets and net cash from live bookkeeping entries.</p></div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/[0.09] pt-4"><div><p className="text-[9px] uppercase tracking-[.14em] text-[#7e8995]">Recorded assets</p><p className="mt-1 text-[14px] font-semibold tabular-nums text-[#e6e9ec]">{money(assets)}</p></div><div className="h-8 w-px bg-white/10"/><div><p className="text-[9px] uppercase tracking-[.14em] text-[#7e8995]">Net cash movement</p><p className="mt-1 text-[14px] font-semibold tabular-nums text-[#e6e9ec]">{money(netCash)}</p></div><div className="ml-auto"><Link href="/finance" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[10px] font-semibold text-[#c8d0d9] transition hover:border-[#b7a16a]/40 hover:text-[#e3cd9c]">Open ledger <ArrowUpRight size={13}/></Link></div></div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="flex items-center justify-between gap-4 rounded-[20px] border border-white/[0.075] bg-[#10161e] p-5"><div><p className="text-[10px] uppercase tracking-[.16em] text-[#8a95a2]">Cumulative revenue</p><p className="mt-3 text-[clamp(1.25rem,2vw,1.8rem)] font-semibold tracking-tight tabular-nums">{money(revenue)}</p><p className="mt-1 text-[10px] text-[#66717e]">Live transactions recorded</p></div><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[#65c6a5]/15 bg-[#65c6a5]/[0.08] text-[#75c9aa]"><ArrowUpRight size={19}/></span></div>
            <div className="flex items-center justify-between gap-4 rounded-[20px] border border-white/[0.075] bg-[#10161e] p-5"><div><p className="text-[10px] uppercase tracking-[.16em] text-[#8a95a2]">Cumulative expenses</p><p className="mt-3 text-[clamp(1.25rem,2vw,1.8rem)] font-semibold tracking-tight tabular-nums">{money(expenses)}</p><p className="mt-1 text-[10px] text-[#66717e]">Live transactions recorded</p></div><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-rose-300/15 bg-rose-300/[0.07] text-rose-200"><ArrowDownLeft size={19}/></span></div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Kunjungan hari ini" value={analytics.todayViews.toLocaleString('id-ID')} note="Page views publik tercatat" />
          <Metric label="Pengunjung unik hari ini" value={analytics.todayVisitors.toLocaleString('id-ID')} note="Browser unik (perkiraan)" />
          <Metric label="Kunjungan 7 hari" value={analytics.weekViews.toLocaleString('id-ID')} note="Total tampilan halaman publik" />
          <Metric label="Permintaan klien" value={analytics.clientRequests.toLocaleString('id-ID')} note="Total brief yang masuk" />
        </section>
        <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
          <Panel title="Traffic website" subtitle="Kunjungan harian · 7 hari terakhir">
            {analytics.daily.length ? <div className="space-y-3">{analytics.daily.map((d) => <div key={d.day} className="grid grid-cols-[76px_1fr_44px] items-center gap-3"><span className="text-[10px] text-[#8a95a2]">{new Date(d.day + 'T00:00:00').toLocaleDateString('id-ID',{day:'2-digit',month:'short'})}</span><div className="h-2 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-[#b7a16a]" style={{width: (Math.max(0,d.views) / Math.max(1,...analytics.daily.map(x=>x.views))*100)+'%'}} /></div><span className="text-right text-[10px] tabular-nums text-[#cbd2da]">{d.views}</span></div>)}</div> : <Empty text="Belum ada kunjungan tercatat. Data mulai muncul setelah pelacakan aktif." />}
          </Panel>
          <Panel title="Kinerja agen · 7 hari" subtitle="Berdasarkan catatan eksekusi yang tersimpan">
            <div className="grid grid-cols-2 gap-2"><MiniMetric label="Eksekusi tercatat" value={analytics.agentRuns} /><MiniMetric label="Berhasil" value={analytics.agentSuccess} /><MiniMetric label="Gagal" value={analytics.agentFailed} /><MiniMetric label="Item dibuat" value={analytics.agentItems} /></div>
            <p className="mt-3 text-[9px] leading-4 text-[#778391]">Hanya eksekusi yang benar-benar tercatat di sistem; status aktif bukan bukti pekerjaan selesai.</p>
          </Panel>
        </section>
        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <Panel title="Halaman paling banyak dikunjungi" subtitle="7 hari terakhir">
            {analytics.topPages.length ? <div className="divide-y divide-white/[0.055]">{analytics.topPages.map((p) => <div key={p.path} className="flex items-center justify-between gap-3 py-2.5"><span className="truncate text-[11px] text-[#d8dfe6]">{p.path}</span><span className="text-[11px] font-semibold tabular-nums text-[#c8b27e]">{p.views.toLocaleString('id-ID')}</span></div>)}</div> : <Empty text="Belum ada data halaman." />}
          </Panel>
          <Panel title="Ringkasan jangkauan" subtitle="Pengukuran internal website">
            <p className="text-[10px] leading-5 text-[#8c98a5]">Angka ini mengukur kunjungan ke halaman publik Cyber Wealth, bukan jumlah penonton konten di TikTok, Instagram, atau YouTube. Data platform sosial memerlukan koneksi insight resmi masing-masing platform.</p>
            <p className="mt-3 text-[10px] leading-5 text-[#8c98a5]">Pengunjung unik memakai cookie acak first-party; alamat IP mentah tidak disimpan.</p>
          </Panel>
        </section>
        <section className="grid gap-4 xl:grid-cols-[1fr_1.25fr_1fr] lg:min-h-0">
          <Panel title="Asset portfolio" subtitle="Recorded company assets">
            <div className="mb-3 flex items-end justify-between border-b border-white/[0.07] pb-3"><span className="text-[10px] text-[#7e8995]">Total asset value</span><span className="text-[13px] font-semibold tabular-nums">{money(assets)}</span></div>
            {assetRows.length ? <div className="divide-y divide-white/[0.055]">{assetRows.map(a=><div key={a.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-[12px] font-medium text-[#e1e6eb]">{a.name}</p><p className="mt-1 text-[10px] text-[#778391]">{a.kind}</p></div><p className="shrink-0 text-[11px] font-semibold tabular-nums text-[#c7d0d9]">{money(a.value)}</p></div>)}</div>:<Empty text="No live assets recorded yet."/>}
          </Panel>
          <Panel title="Financial activity" subtitle="Latest live ledger entries">
            {transactions.length?<div className="divide-y divide-white/[0.055]">{transactions.map(tx=><div key={tx.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-[12px] font-medium text-[#e1e6eb]">{tx.description}</p><p className="mt-1 text-[10px] text-[#778391]">{tx.category} <span className="px-1 text-white/20">·</span> {new Date(tx.date).toLocaleDateString('id-ID')}</p></div><p className={`shrink-0 text-[11px] font-semibold tabular-nums ${tx.kind==='revenue'?'text-[#75c9aa]':'text-rose-200'}`}>{tx.kind==='revenue'?'+':'−'}{money(tx.amount)}</p></div>)}</div>:<Empty text="No live transactions recorded yet."/>}
          </Panel>
          <Panel title="AI workforce" subtitle="System status from registered agents">
            <div className="mb-3 grid grid-cols-2 gap-2"><div className="rounded-xl border border-white/[0.06] bg-[#0b1118] p-3"><p className="text-[9px] uppercase tracking-wider text-[#788492]">Registered</p><p className="mt-1 text-xl font-semibold tabular-nums">{agents.length}</p></div><div className="rounded-xl border border-[#65c6a5]/10 bg-[#65c6a5]/[0.045] p-3"><p className="text-[9px] uppercase tracking-wider text-[#788492]">Active status</p><p className="mt-1 text-xl font-semibold tabular-nums text-[#75c9aa]">{activeAgents}</p></div></div>
            {agents.length?<div className="divide-y divide-white/[0.055]">{agents.map(a=><div key={a.id} className="flex items-center justify-between gap-2 py-3"><div className="min-w-0"><p className="truncate text-[11px] font-medium text-[#e1e6eb]">{a.name}</p><p className="mt-1 truncate text-[9px] text-[#778391]">{a.role}</p></div><span className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.035] px-2 py-1 text-[9px] text-[#b7c0ca]">{a.status}</span></div>)}</div>:<Empty text="No agents registered yet."/>}
          </Panel>
        </section>
        <section className="grid gap-4 lg:hidden"><Panel title="Products" subtitle="Latest catalogue records">{products.length?<div className="divide-y divide-white/[0.055]">{products.map(p=><div key={p.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{p.name}</p><p className="text-[10px] text-[#778391]">{p.status}</p></div><span className="text-xs font-semibold">{money(p.price)}</span></div>)}</div>:<Empty text="No products recorded yet."/>}</Panel><Panel title="Recent system activity" subtitle="Recorded operational logs">{activity.length?<div className="divide-y divide-white/[0.055]">{activity.map(item=><div key={item.id} className="py-3"><p className="text-xs font-medium">{item.agentName||item.actor}: {item.action}</p><p className="mt-1 text-[10px] leading-5 text-[#778391]">{item.detail}</p></div>)}</div>:<Empty text="No activity recorded yet."/>}</Panel></section>
        <footer className="flex flex-wrap justify-between gap-2 border-t border-white/[0.07] py-4 text-[9px] text-[#626d79]"><span>PRIVATE ACCOUNT · {owner.email}</span><span>CYBER WEALTH © EXECUTIVE OFFICE</span></footer>
      </main>
    </div>
  </div>
}
function Panel({title,subtitle,children}:{title:string;subtitle?:string;children:React.ReactNode}){return <section className="rounded-[20px] border border-white/[0.075] bg-[#10161e] p-5 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden"><div className="mb-4 shrink-0 border-b border-white/[0.065] pb-3"><h3 className="text-[12px] font-semibold tracking-wide text-[#e8edf2]">{title}</h3>{subtitle&&<p className="mt-1 text-[10px] text-[#778391]">{subtitle}</p>}</div><div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pr-1">{children}</div></section>}
function Empty({text}:{text:string}){return <p className="rounded-xl border border-dashed border-white/10 bg-[#0b1018] px-4 py-7 text-center text-xs text-slate-500">{text}</p>}
const Page = OwnerDashboard as PageWithFrame<Props>
Page.getLayout = (page) => page
export default Page

function Metric({label,value,note}:{label:string;value:string;note:string}){return <div className="rounded-[18px] border border-[#b7a16a]/15 bg-[#10161e] p-4"><p className="text-[9px] uppercase tracking-[.15em] text-[#8a95a2]">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums text-[#f1f3f5]">{value}</p><p className="mt-1 text-[9px] text-[#6f7a87]">{note}</p></div>}
function MiniMetric({label,value}:{label:string;value:number}){return <div className="rounded-xl border border-white/[0.06] bg-[#0b1118] p-3"><p className="text-[9px] uppercase tracking-wider text-[#788492]">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value.toLocaleString('id-ID')}</p></div>}
