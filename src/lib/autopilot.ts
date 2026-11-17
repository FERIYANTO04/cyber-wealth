import { and, desc, eq, gte, inArray, isNull, sql } from 'drizzle-orm'
import { db } from './db'
import {
  activity,
  agentRuns,
  agents,
  campaignDrafts,
  marketSignals,
  orders,
  products,
  proposals,
  revenueLeads,
  socialPosts,
  serviceRequests,
  services,
  settings,
  subscriptions,
} from './db/schema'
import { SETTINGS_ID, getSettings } from './data'
import { askAi, aiConfigured } from './ai'
import { TASKS, type AutopilotTask } from './labels'
import { generatePosts } from './social'

/**
 * The autopilot runs as request-driven work, never as a background timer: a
 * published app is scaled to zero between visitors, so anything left running after
 * a response would be frozen mid-flight. Every run is therefore short, does its work
 * before answering, and records what it did.
 */

const DAY_MS = 24 * 60 * 60 * 1000

async function agentNameFor(role: string): Promise<string> {
  const [row] = await db.select().from(agents).where(eq(agents.role, role)).limit(1)
  return row?.name ?? role
}

async function startRun(agentRole: string, task: string, trigger: string) {
  const name = await agentNameFor(agentRole)
  const [row] = await db
    .insert(agentRuns)
    .values({ agentName: name, task, trigger, status: 'running' })
    .returning()
  return row
}

async function finishRun(
  id: string,
  status: 'ok' | 'skipped' | 'failed',
  summary: string,
  detail: string,
  itemsCreated: number
) {
  await db
    .update(agentRuns)
    .set({ status, summary, detail, itemsCreated, finishedAt: new Date() })
    .where(eq(agentRuns.id, id))
}

async function noteAgent(agentRole: string, action: string, detail: string) {
  const name = await agentNameFor(agentRole)
  await db.insert(activity).values({ actor: 'agent', agentName: name, action, detail, dataSource: 'live' })
  await db.update(agents).set({ lastRunAt: new Date() }).where(eq(agents.role, agentRole))
}

// ── Individual tasks ──────────────────────────────────────────────────────

async function runCeo(trigger: string) {
  const run = await startRun('AI CEO', 'ceo', trigger)

  const [paidOrders] = await db
    .select({ n: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${orders.amountIdr}),0)::bigint` })
    .from(orders)
    .where(and(eq(orders.status, 'paid'), eq(orders.dataSource, 'live')))
  const [pendingOrders] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(eq(orders.status, 'pending'), eq(orders.dataSource, 'live')))
  const [newJobs] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(serviceRequests)
    .where(eq(serviceRequests.status, 'new'))
  const [liveProducts] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(and(eq(products.status, 'published'), eq(products.dataSource, 'live')))
  const [activeSubs] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(subscriptions)
    .where(and(eq(subscriptions.status, 'active'), eq(subscriptions.dataSource, 'live')))
  const [newLeads] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(revenueLeads)
    .where(inArray(revenueLeads.status, ['new', 'qualified', 'proposal']))

  const blockers: string[] = []
  if ((pendingOrders?.n ?? 0) > 0) blockers.push(`${pendingOrders.n} pesanan belum dibayar`)
  if ((newJobs?.n ?? 0) > 0) blockers.push(`${newJobs.n} permintaan jasa belum ditinjau`)
  if ((liveProducts?.n ?? 0) === 0) blockers.push('belum ada produk yang terbit di katalog')

  const facts = [
    `Pesanan lunas: ${paidOrders?.n ?? 0}`,
    `Pendapatan terkonfirmasi: Rp ${Number(paidOrders?.total ?? 0).toLocaleString('id-ID')}`,
    `Pesanan belum dibayar: ${pendingOrders?.n ?? 0}`,
    `Permintaan jasa baru: ${newJobs?.n ?? 0}`,
    `Produk terbit: ${liveProducts?.n ?? 0}`,
    `Langganan aktif: ${activeSubs?.n ?? 0}`,
    `Prospek yang perlu ditindaklanjuti: ${newLeads?.n ?? 0}`,
  ].join('\n')

  const factualSummary =
    `${paidOrders?.n ?? 0} pesanan lunas (Rp ${Number(paidOrders?.total ?? 0).toLocaleString('id-ID')}), ` +
    `${activeSubs?.n ?? 0} langganan aktif, ${liveProducts?.n ?? 0} produk terbit. ` +
    (blockers.length > 0 ? `Perlu perhatian: ${blockers.join(', ')}.` : 'Tidak ada penghambat dasar yang terdeteksi.')

  if (!aiConfigured()) {
    const summary = 'AI CEO belum dapat membuat keputusan strategis karena GROQ_API_KEY belum dipasang. ' + factualSummary
    await finishRun(run.id, 'skipped', summary, 'Data operasional dibaca dari database, tetapi analisis model AI tidak dijalankan. Hubungkan kunci Groq pada variabel server untuk mengaktifkan analisis CEO.', 0)
    await noteAgent('AI CEO', 'Analisis CEO menunggu koneksi model AI', summary)
    return { summary }
  }

  const outcome = await askAi({
    system: [
      'Anda adalah AI CEO dan kepala strategi operasional Cyber Wealth, bisnis digital kecil yang beroperasi dari Indonesia.',
      'Analisis hanya fakta database yang diberikan. Jangan mengarang omzet, saldo, pelanggan, ukuran pasar, atau pekerjaan yang sudah dilakukan.',
      'Tugas Anda: diagnosis kondisi, pilih maksimal 3 prioritas paling berdampak, dan pecah tiap prioritas menjadi langkah kerja konkret untuk agen yang sudah ada.',
      'Jangan menyetujui pengeluaran, investasi, transfer, kontrak, publikasi, atau tindakan eksternal. Tindakan berisiko harus menjadi rekomendasi untuk persetujuan pemilik.',
      'Jawab dalam Bahasa Indonesia dengan format: KONDISI, KEPUTUSAN CEO, TUGAS AGEN, MENUNGGU PEMILIK. Sebutkan bila data belum cukup.',
    ].join(' '),
    prompt: [
      `Waktu analisis: ${new Date().toISOString()}`,
      `Pemicu putaran: ${trigger}`,
      'Fakta operasional terkini:',
      facts,
      'Kendala dasar yang terdeteksi:',
      blockers.length ? blockers.join('; ') : 'Tidak ada kendala dasar yang terdeteksi.',
      'Buat keputusan operasional yang bisa dilaksanakan oleh agen AI Market Research, AI Sales, AI Product Creator, AI Marketing, AI Finance, dan AI Business Intelligence. Tulis siapa melakukan apa, urutan, dan hasil yang harus dicatat. Jangan mengklaim tugas tersebut sudah selesai.',
    ].join('\n'),
    maxTokens: 1100,
  })

  if (!outcome.ok) {
    const summary = `Data bisnis terbaca, tetapi AI CEO gagal menganalisis: ${outcome.reason}`
    await finishRun(run.id, 'failed', summary, facts, 0)
    await noteAgent('AI CEO', 'Analisis CEO gagal', summary)
    return { summary }
  }

  const firstLine = outcome.text.split('\n').find((line) => line.trim().length > 0) ?? 'Strategi CEO diperbarui.'
  const summary = `${factualSummary} Keputusan AI CEO: ${firstLine.replace(/^#+\s*/, '').slice(0, 420)}`
  await finishRun(run.id, 'ok', summary, `${facts}\n\nAnalisis model ${outcome.model}:\n${outcome.text}`, 0)
  await noteAgent('AI CEO', 'Analisis dan arahan kerja CEO diperbarui', summary)
  return { summary }
}

async function runResearch(trigger: string) {
  const run = await startRun('AI Market Research', 'research', trigger)

  const demand = await db
    .select({
      name: products.name,
      category: products.category,
      orders: sql<number>`count(${orders.id})::int`,
    })
    .from(products)
    .leftJoin(orders, and(eq(orders.productId, products.id), eq(orders.status, 'paid')))
    .where(and(eq(products.status, 'published'), eq(products.dataSource, 'live')))
    .groupBy(products.id, products.name, products.category)
    .orderBy(desc(sql`count(${orders.id})`))
    .limit(5)

  const jobCategories = await db
    .select({ category: serviceRequests.market, n: sql<number>`count(*)::int` })
    .from(serviceRequests)
    .groupBy(serviceRequests.market)

  let created = 0
  for (const row of demand) {
    if (row.orders === 0) continue
    await db.insert(marketSignals).values({
      title: `${row.name}: ${row.orders} pesanan tercatat`,
      market: 'Indonesia',
      evidence: `Dihitung dari ${row.orders} pesanan yang pembayarannya sudah dikonfirmasi pada produk ini.`,
      metric: `${row.orders} pesanan`,
      confidence: 'measured',
      dataSource: 'live',
    })
    created += 1
  }

  const markets = jobCategories.map((row) => `${row.category}: ${row.n} permintaan jasa`).join('; ')

  // Beyond what has already sold, the model reads the catalog and the recorded demand
  // and proposes opportunities. These are labelled as suggestions, never as measured
  // facts, so the owner always knows which is which.
  let suggested = 0
  let aiNote = 'Model AI belum terhubung, jadi tidak ada usulan peluang baru.'
  if (aiConfigured()) {
    const catalog = await db
      .select({ name: products.name, category: products.category, priceIdr: products.priceIdr, status: products.status })
      .from(products)
      .limit(12)
    const jobMarkets = await db
      .select({ market: serviceRequests.market, n: sql<number>`count(*)::int` })
      .from(serviceRequests)
      .groupBy(serviceRequests.market)
      .limit(8)

    const outcome = await askAi({
      system:
        'Anda analis pasar untuk usaha digital kecil di Indonesia. Usulkan peluang yang bisa diuji minggu ini. ' +
        'Jangan mengarang angka pasar, ukuran industri, atau klaim riset. Tulis setiap peluang dalam tiga baris tetap.',
      prompt: [
        catalog.length > 0
          ? `Katalog saat ini: ${catalog.map((p) => `${p.name} (${p.category}, Rp ${Number(p.priceIdr).toLocaleString('id-ID')}, ${p.status})`).join('; ')}.`
          : 'Katalog masih kosong.',
        `Permintaan jasa tercatat: ${jobMarkets.length > 0 ? jobMarkets.map((r) => `${r.market}: ${r.n}`).join('; ') : 'belum ada'}.`,
        `Penjualan terkonfirmasi per produk: ${demand.length > 0 ? demand.map((r) => `${r.name}: ${r.orders}`).join('; ') : 'belum ada'}.`,
        'Berikan maksimal 3 peluang. Untuk setiap peluang tulis tepat tiga baris:',
        'PELUANG: <satu baris>',
        'ALASAN: <satu kalimat, hanya berdasarkan data di atas>',
        'UJI: <satu langkah kecil yang bisa dikerjakan minggu ini>',
      ].join('\n'),
      maxTokens: 800,
    })

    if (!outcome.ok) {
      aiNote = `Model AI tidak menjawab: ${outcome.reason}`
    } else {
      const blocks = outcome.text.split(/\n(?=PELUANG\s*:)/i)
      const known = new Set(
        (await db.select({ title: marketSignals.title }).from(marketSignals).limit(60)).map((row) => row.title)
      )
      for (const block of blocks) {
        const title = block.match(/PELUANG\s*:\s*(.+)/i)?.[1]?.trim()
        const reason = block.match(/ALASAN\s*:\s*(.+)/i)?.[1]?.trim()
        const test = block.match(/UJI\s*:\s*(.+)/i)?.[1]?.trim()
        if (!title || !reason || known.has(title)) continue
        if (suggested >= 3) break
        await db.insert(marketSignals).values({
          title: title.slice(0, 160),
          market: 'Indonesia',
          evidence: `${reason}${test ? ` Langkah uji: ${test}` : ''} Usulan model ${outcome.model}, bukan angka pasar terukur.`,
          metric: 'Perlu diuji',
          confidence: 'proposal',
          dataSource: 'live',
        })
        known.add(title)
        suggested += 1
      }
      aiNote = suggested > 0 ? `${suggested} usulan peluang baru dari ${outcome.model} menunggu Anda nilai.` : 'Usulan hari ini sudah ada di daftar.'
    }
  }

  const summary =
    demand.length === 0 && suggested === 0
      ? 'Belum ada produk terbit, jadi belum ada data permintaan untuk dianalisis.'
      : `${created} sinyal permintaan dicatat dari penjualan nyata, ${suggested} usulan peluang dari model AI.${markets ? ` Permintaan jasa — ${markets}.` : ''}`

  await finishRun(
    run.id,
    created + suggested > 0 ? 'ok' : 'skipped',
    summary,
    `Sinyal terukur hanya dihitung dari pesanan dan permintaan yang benar-benar tercatat, bukan proyeksi pasar. ${aiNote}`,
    created + suggested
  )
  await noteAgent('AI Market Research', 'Sinyal pasar diperbarui', summary)
  return { summary, created: created + suggested }
}

async function runProduct(trigger: string) {
  const run = await startRun('AI Product Creator', 'product', trigger)

  if (!aiConfigured()) {
    const summary = 'Model AI belum terhubung, jadi draf produk tidak dibuat.'
    await finishRun(run.id, 'skipped', summary, 'Tambahkan kunci API model AI di halaman Integrasi untuk mengaktifkan tugas ini.', 0)
    await noteAgent('AI Product Creator', 'Tugas produk dilewati', summary)
    return { summary, created: 0, skipped: true }
  }

  const existing = await db.select({ name: products.name }).from(products).limit(20)
  const outcome = await askAi({
    system:
      'Anda perancang produk digital untuk pasar Indonesia dan internasional. Usulkan SATU produk digital yang realistis dan bisa dibuat hari ini oleh satu orang. Jangan mengarang angka penjualan atau klaim hasil.',
    prompt: [
      existing.length > 0 ? `Produk yang sudah ada: ${existing.map((p) => p.name).join(', ')}.` : 'Belum ada produk.',
      'Jawab dalam format tepat seperti ini:',
      'JUDUL: <judul produk>',
      'RINGKASAN: <satu kalimat>',
      'DESKRIPSI: <3-5 kalimat berisi isi produk dan untuk siapa>',
      'HARGA: <angka rupiah tanpa titik>',
    ].join('\n'),
    maxTokens: 700,
  })

  if (!outcome.ok) {
    await finishRun(run.id, 'failed', 'Model AI tidak menjawab.', outcome.reason, 0)
    await noteAgent('AI Product Creator', 'Draf produk gagal dibuat', outcome.reason)
    return { summary: outcome.reason, created: 0, failed: true }
  }

  const read = (label: string) => {
    const match = outcome.text.match(new RegExp(`${label}\\s*:\\s*(.+)`, 'i'))
    return match ? match[1].trim() : ''
  }
  const title = read('JUDUL').slice(0, 120) || 'Draf produk baru'
  const summaryLine = read('RINGKASAN').slice(0, 300) || 'Draf produk dari AI, perlu ditinjau.'
  const description = read('DESKRIPSI').slice(0, 4000) || outcome.text.slice(0, 2000)
  const priceRaw = Number(read('HARGA').replace(/[^\d]/g, '')) || 0

  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60) || `draf-${Date.now()}`

  let slug = base
  for (let n = 2; n < 40; n += 1) {
    const [taken] = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1)
    if (!taken) break
    slug = `${base}-${n}`
  }

  await db.insert(products).values({
    slug,
    name: title,
    summary: summaryLine,
    description,
    category: 'template',
    priceIdr: priceRaw,
    status: 'draft',
    deliverableNote: 'Draf dari AI. Lengkapi berkas produk dan tinjau sebelum menerbitkan.',
    dataSource: 'live',
  })

  await db.insert(proposals).values({
    title: `Terbitkan produk: ${title}`,
    summary: `${summaryLine} Harga usulan Rp ${priceRaw.toLocaleString('id-ID')}. Tinjau isinya, lampirkan berkas, lalu terbitkan.`,
    category: 'operations',
    amountIdr: null,
    risk: 'low',
    status: 'pending',
    dataSource: 'live',
  })

  const summary = `Draf produk "${title}" dibuat oleh ${outcome.model} dan menunggu tinjauan Anda.`
  await finishRun(run.id, 'ok', summary, 'Draf ini belum terbit dan belum dijual. Lampirkan berkasnya, lalu terbitkan sendiri.', 2)
  await noteAgent('AI Product Creator', 'Draf produk dibuat', summary)
  return { summary, created: 2 }
}

async function runMarketing(trigger: string) {
  const run = await startRun('AI Marketing', 'marketing', trigger)

  const publishedProducts = await db
    .select()
    .from(products)
    .where(and(eq(products.status, 'published'), eq(products.dataSource, 'live')))
    .limit(4)
  const publishedServices = await db
    .select()
    .from(services)
    .where(and(eq(services.status, 'published'), eq(services.dataSource, 'live')))
    .limit(3)

  if (publishedProducts.length === 0 && publishedServices.length === 0) {
    const summary = 'Belum ada produk atau layanan terbit, jadi belum ada yang bisa dipromosikan.'
    await finishRun(run.id, 'skipped', summary, 'Terbitkan minimal satu produk atau layanan agar tugas pemasaran punya bahan nyata.', 0)
    await noteAgent('AI Marketing', 'Tugas pemasaran dilewati', summary)
    return { summary, created: 0, skipped: true }
  }

  // A draft per item, not per run: what the owner already has is not duplicated.
  const existing = await db.select({ title: campaignDrafts.title }).from(campaignDrafts)
  const taken = new Set(existing.map((row) => row.title))

  type Material = { title: string; channel: string; audience: string; prompt: string; fallback: string }
  const materials: Material[] = [
    ...publishedProducts.map((product) => ({
      title: `Promosi ${product.name}`,
      channel: 'media sosial',
      audience: 'pembeli produk digital',
      prompt: `Tulis satu kiriman media sosial (maksimal 120 kata) untuk produk digital "${product.name}". Ringkasan: ${product.summary}. Harga: Rp ${Number(product.priceIdr).toLocaleString('id-ID')}. Sertakan satu ajakan bertindak.`,
      fallback: `Draf promosi untuk ${product.name}.\n\n${product.summary}\n\nTersedia sekarang dengan harga Rp ${Number(product.priceIdr).toLocaleString('id-ID')}. Buka katalog untuk detail dan pembelian.`,
    })),
    ...publishedServices.map((service) => ({
      title: `Promosi jasa ${service.name}`,
      channel: 'media sosial',
      audience: 'calon klien jasa',
      prompt: `Tulis pengumuman media sosial (maksimal 120 kata) untuk layanan "${service.name}". Ringkasan: ${service.summary}. Harga mulai Rp ${Number(service.priceFromIdr).toLocaleString('id-ID')}, pengerjaan sekitar ${service.deliveryDays} hari kerja. Ajak pembaca mengirim brief singkat.`,
      fallback: `Butuh ${service.name.toLowerCase()}?\n\n${service.summary}\n\nMulai Rp ${Number(service.priceFromIdr).toLocaleString('id-ID')}, sekitar ${service.deliveryDays} hari kerja. Kirim brief singkat lewat halaman layanan dan kami tinjau lebih dulu.`,
    })),
  ]

  let created = 0
  const failures: string[] = []
  for (const material of materials) {
    if (taken.has(material.title)) continue

    let body = material.fallback
    let source = 'template'
    if (aiConfigured()) {
      const outcome = await askAi({
        system:
          'Anda penulis konten pemasaran yang jujur, dalam bahasa yang sama dengan materinya. Jangan menjanjikan hasil, jangan mengarang testimoni, angka penjualan, atau klien.',
        prompt: material.prompt,
        maxTokens: 400,
      })
      if (outcome.ok) {
        body = outcome.text
        source = `ai:${outcome.model}`
      } else {
        failures.push(outcome.reason)
        body = `${material.fallback}\n\n(Draf disusun dari data Anda; AI belum menjawab: ${outcome.reason})`
      }
    }

    await db.insert(campaignDrafts).values({
      title: material.title,
      channel: material.channel,
      audience: material.audience,
      body,
      status: 'draft',
      source,
    })
    created += 1
  }

  // The same run also fills the social studio, so content the owner approves there is
  // written from the catalog rather than from scratch.
  const social = await generatePosts({ limit: 6 }).catch(() => null)

  const summary =
    created === 0
      ? social && social.created > 0
        ? `${social.created} draf konten sosial disiapkan untuk ditinjau.`
        : 'Semua produk dan layanan terbit sudah punya draf promosi.'
      : `${created} draf materi promosi dan ${social?.created ?? 0} draf konten sosial disiapkan untuk ditinjau.`

  await finishRun(
    run.id,
    created > 0 ? 'ok' : 'skipped',
    summary,
    failures.length > 0
      ? `Sebagian draf disusun tanpa AI karena: ${failures[0]}`
      : 'Draf disimpan sebagai draf. Tidak ada yang dikirim otomatis ke platform mana pun.',
    created
  )
  await noteAgent('AI Marketing', 'Materi promosi disiapkan', summary)
  return { summary, created }
}

async function runSales(trigger: string) {
  const run = await startRun('AI Sales', 'sales', trigger)

  // Only leads that are still open and have no draft yet get one, so a repeated run
  // never piles up duplicates or rewrites what the owner already reviewed.
  const openLeads = await db
    .select()
    .from(revenueLeads)
    .where(and(inArray(revenueLeads.status, ['new', 'contacted', 'qualified']), isNull(revenueLeads.outreachBody)))
    .orderBy(desc(revenueLeads.createdAt))
    .limit(5)

  const newJobs = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(serviceRequests)
    .where(eq(serviceRequests.status, 'new'))
  const waitingOrders = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(eq(orders.status, 'pending'), gte(orders.createdAt, new Date(Date.now() - 7 * DAY_MS))))

  let drafted = 0
  for (const lead of openLeads) {
    const outcome = aiConfigured()
      ? await askAi({
          system:
            'Anda penulis pesan pendekatan penjualan B2B yang sopan dan jujur. Tulis dalam bahasa yang sama dengan minat calon pelanggan. Jangan mengarang portofolio, klien, harga, atau janji hasil. Maksimal 110 kata, mudah dibaca di ponsel.',
          prompt: [
            `Calon pelanggan: ${lead.name} (${lead.email})`,
            `Pasar: ${lead.market}`,
            `Kebutuhan yang dicatat: ${lead.interest}`,
            'Tulis satu pesan pembuka yang menyebut kebutuhannya, menawarkan satu langkah kecil yang jelas, dan menutup dengan pertanyaan sederhana. Jangan menyertakan tautan yang tidak diketahui.',
          ].join('\n'),
          maxTokens: 400,
        })
      : null

    const body = outcome?.ok
      ? outcome.text
      : [
          `Halo ${lead.name},`,
          '',
          `Saya mencatat kebutuhan Anda soal: ${lead.interest}. Saya bisa bantu menyiapkan langkah awalnya dan mengirim rincian singkat bila Anda berminat.`,
          '',
          'Apakah minggu ini waktu yang baik untuk membahasnya sebentar?',
          '',
          outcome && !outcome.ok ? `(Draf ini disusun dari data prospek; model AI belum menjawab: ${outcome.reason})` : '(Draf ini disusun dari data prospek. Model AI belum terhubung, jadi silakan rapikan gayanya.)',
        ].join('\n')

    await db
      .update(revenueLeads)
      .set({ outreachBody: body, outreachSource: outcome?.ok ? `ai:${outcome.model}` : 'template' })
      .where(eq(revenueLeads.id, lead.id))
    drafted += 1
  }

  const leadCount = newJobs[0]?.n ?? 0
  const orderCount = waitingOrders[0]?.n ?? 0

  const summary =
    drafted + leadCount + orderCount === 0
      ? 'Tidak ada prospek atau pesanan yang menunggu tindak lanjut.'
      : `${drafted} draf pendekatan disiapkan, ${leadCount} permintaan jasa baru, ${orderCount} pesanan menunggu pembayaran.`

  await finishRun(
    run.id,
    drafted + leadCount + orderCount > 0 ? 'ok' : 'skipped',
    summary,
    'Draf pendekatan disimpan di CRM dan dikirim oleh Anda sendiri. Aplikasi tidak mengirim email otomatis, dan tidak ada angka penjualan yang diperkirakan.',
    drafted
  )
  await noteAgent('AI Sales', 'CRM dan prospek ditinjau', summary)
  return { summary, created: drafted }
}

async function runFinance(trigger: string) {
  const run = await startRun('AI Finance', 'finance', trigger)

  const since = new Date(Date.now() - 30 * DAY_MS)
  const [orderRevenue] = await db
    .select({ total: sql<number>`coalesce(sum(${orders.amountIdr}),0)::bigint` })
    .from(orders)
    .where(and(eq(orders.status, 'paid'), eq(orders.dataSource, 'live'), gte(orders.paidAt, since)))
  const [subRevenue] = await db
    .select({ total: sql<number>`coalesce(sum(${subscriptions.amountIdr}),0)::bigint` })
    .from(subscriptions)
    .where(
      and(eq(subscriptions.status, 'active'), eq(subscriptions.dataSource, 'live'), gte(subscriptions.paidAt, since))
    )
  const [pendingProposal] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(proposals)
    .where(
      and(
        eq(proposals.status, 'pending'),
        eq(proposals.category, 'finance'),
        eq(proposals.dataSource, 'live')
      )
    )

  const total = Number(orderRevenue?.total ?? 0) + Number(subRevenue?.total ?? 0)

  // The one place the autopilot touches money: it may *propose* a spend, and the row
  // waits at the owner's desk. No transaction exists until that decision is approved.
  let proposed = 0
  if (total > 0 && (pendingProposal?.n ?? 0) === 0) {
    const [openOutreach] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(revenueLeads)
      .where(inArray(revenueLeads.status, ['new', 'contacted', 'qualified']))

    const idea =
      (openOutreach?.n ?? 0) > 0
        ? {
            title: 'Anggaran promosi untuk menindaklanjuti prospek',
            summary: `${openOutreach?.n} prospek masih terbuka. Usulan anggaran promosi kecil untuk menjangkau ulang mereka; dana hanya dicatat sebagai pengeluaran setelah Anda setujui.`,
          }
        : {
            title: 'Anggaran uji promosi produk terbit',
            summary:
              'Usulan anggaran kecil untuk menguji satu kanal promosi pada produk yang sudah terbit. Tidak ada dana berpindah sebelum Anda menyetujui usulan ini.',
          }

    await db.insert(proposals).values({
      title: idea.title,
      summary: idea.summary,
      category: 'finance',
      amountIdr: Math.max(50_000, Math.round((total * 0.1) / 1000) * 1000),
      risk: 'medium',
      status: 'pending',
      dataSource: 'live',
    })
    proposed = 1
  }

  const summary =
    `Pendapatan terkonfirmasi 30 hari terakhir: Rp ${total.toLocaleString('id-ID')}. ` +
    `${(pendingProposal?.n ?? 0) + proposed} usulan pengeluaran menunggu keputusan Anda.`

  await finishRun(
    run.id,
    'ok',
    summary,
    'Hanya pembayaran yang diverifikasi pemilik setelah dana masuk yang dihitung. Usulan pengeluaran hanya menjadi catatan setelah Anda menyetujuinya — tidak ada transfer otomatis.',
    proposed
  )
  await noteAgent('AI Finance', 'Rekap keuangan disusun', summary)
  return { summary }
}

/**
 * Reads what the business actually recorded — paid orders, open leads, published
 * content, active subscriptions — and says what those numbers mean. Every figure is a
 * row in the database; nothing is estimated, projected, or invented.
 */
async function runIntelligence(trigger: string) {
  const run = await startRun('AI Business Intelligence', 'intelligence', trigger)

  const [paid] = await db
    .select({
      n: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${orders.amountIdr}),0)::bigint`,
    })
    .from(orders)
    .where(and(eq(orders.status, 'paid'), eq(orders.dataSource, 'live')))
  const [leads] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(revenueLeads)
    .where(eq(revenueLeads.status, 'new'))
  const [wonLeads] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(revenueLeads)
    .where(eq(revenueLeads.status, 'won'))
  const [posts] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(socialPosts)
    .where(eq(socialPosts.publishState, 'published'))
  const [subs] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(subscriptions)
    .where(and(eq(subscriptions.status, 'active'), eq(subscriptions.dataSource, 'live')))

  const facts = [
    `${paid?.n ?? 0} pesanan lunas senilai Rp ${Number(paid?.total ?? 0).toLocaleString('id-ID')}`,
    `${leads?.n ?? 0} prospek baru, ${wonLeads?.n ?? 0} berhasil menjadi pelanggan`,
    `${posts?.n ?? 0} konten terbit dikonfirmasi kanal`,
    `${subs?.n ?? 0} langganan aktif`,
  ]

  const reading: string[] = []
  if ((paid?.n ?? 0) === 0) reading.push('Belum ada penjualan terkonfirmasi, jadi belum ada bukti produk mana yang paling laku.')
  if ((leads?.n ?? 0) > 0) reading.push('Ada prospek yang belum ditindaklanjuti; draf pendekatan bisa disiapkan AI Sales.')
  if ((posts?.n ?? 0) === 0) reading.push('Belum ada konten yang benar-benar terbit, jadi belum ada data kanal mana yang bekerja.')
  if ((subs?.n ?? 0) > 0) reading.push('Langganan aktif memberi pemasukan berulang; jaga pengingat perpanjangan tetap berjalan.')

  const summary = facts.join(' · ')
  const detail = reading.length > 0 ? reading.join(' ') : 'Semua alur punya data; pertahankan dan uji satu perubahan kecil pada satu waktu.'

  let created = 0
  if (aiConfigured()) {
    const outcome = await askAi({
      system:
        'Anda analis bisnis. Hanya gunakan angka yang diberikan. Jangan mengarang angka, tren, atau perkiraan. Tulis 2-3 kalimat dalam Bahasa Indonesia: apa yang tampak bekerja dan satu langkah berikutnya.',
      prompt: `Data tercatat hari ini: ${facts.join('; ')}.`,
      maxTokens: 260,
    })
    if (outcome.ok) {
      await finishRun(run.id, 'ok', summary, `${outcome.text.trim()} (disusun ${outcome.model} dari angka di atas.)`, 0)
      await noteAgent('AI Business Intelligence', 'Intelijen bisnis disusun', `${summary}. ${outcome.text.trim().slice(0, 240)}`)
      return { summary }
    }
    await finishRun(run.id, 'ok', summary, `${detail} Model AI belum menjawab: ${outcome.reason}`, 0)
    await noteAgent('AI Business Intelligence', 'Intelijen bisnis disusun', `${summary}. ${detail}`)
    return { summary }
  }

  await finishRun(run.id, 'ok', summary, `${detail} Model AI belum terhubung, jadi hanya angka tercatat yang ditampilkan.`, created)
  await noteAgent('AI Business Intelligence', 'Intelijen bisnis disusun', `${summary}. ${detail}`)
  return { summary }
}

// ── Entry point ───────────────────────────────────────────────────────────

const TASK_RUNNERS: Record<AutopilotTask, () => Promise<{ summary: string }>> = {
  research: () => runResearch('owner'),
  sales: () => runSales('owner'),
  product: () => runProduct('owner'),
  marketing: () => runMarketing('owner'),
  finance: () => runFinance('owner'),
  ceo: () => runCeo('owner'),
  intelligence: () => runIntelligence('owner'),
}

export type AgentTaskResult = { ok: boolean; summary: string; blocked?: string }

/**
 * Runs one agent's task on its own. Same implementations as the full pass, so what
 * an agent does from its own button is exactly what it does on autopilot.
 */
export async function runAgentTask(task: AutopilotTask): Promise<AgentTaskResult> {
  const current = await getSettings()
  if (current.aiPaused) {
    return { ok: false, summary: 'Operasi dijeda oleh pemilik.', blocked: 'paused' }
  }

  const role = roleForTask(task)
  const [agent] = await db.select().from(agents).where(eq(agents.role, role)).limit(1)
  if (agent && agent.status === 'paused') {
    return { ok: false, summary: `${agent.name} sedang dijeda.`, blocked: 'agent-paused' }
  }

  const result = await TASK_RUNNERS[task]()
  return { ok: true, summary: result.summary }
}

export type AutopilotResult = {
  ranAt: string
  paused: boolean
  results: { task: AutopilotTask; label: string; summary: string }[]
}

/**
 * Runs the whole loop once. Called by the owner from the autopilot page or by the
 * daily check when the console is opened after a day without a run.
 */
export async function runAutopilot(trigger: 'owner' | 'schedule'): Promise<AutopilotResult> {
  const current = await getSettings()
  if (current.aiPaused) {
    return { ranAt: new Date().toISOString(), paused: true, results: [] }
  }

  const outcomes: AutopilotResult['results'] = []
  const sequence: [AutopilotTask, string, () => Promise<{ summary: string }>][] = [
    ['research', 'Riset pasar', () => runResearch(trigger)],
    ['sales', 'Penjualan', () => runSales(trigger)],
    ['product', 'Produk digital', () => runProduct(trigger)],
    ['marketing', 'Pemasaran', () => runMarketing(trigger)],
    ['finance', 'Keuangan', () => runFinance(trigger)],
    ['intelligence', 'Intelijen bisnis', () => runIntelligence(trigger)],
    ['ceo', 'Strategi harian', () => runCeo(trigger)],
  ]

  for (const [task, label, fn] of sequence) {
    const [row] = await db.select().from(agents).where(eq(agents.role, roleForTask(task))).limit(1)
    if (row && row.status === 'paused') {
      outcomes.push({ task, label, summary: 'Agen dijeda oleh pemilik — tugas dilewati.' })
      continue
    }
    try {
      const result = await fn()
      outcomes.push({ task, label, summary: result.summary })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kesalahan tidak diketahui'
      outcomes.push({ task, label, summary: `Tugas gagal: ${message}` })
    }
  }

  await db
    .update(settings)
    .set({ updatedAt: new Date() })
    .where(eq(settings.id, SETTINGS_ID))

  return { ranAt: new Date().toISOString(), paused: false, results: outcomes }
}

function roleForTask(task: AutopilotTask): string {
  return TASKS.find((t) => t.task === task)?.agentRole ?? task
}

export async function getLastRun() {
  const [row] = await db.select().from(agentRuns).orderBy(desc(agentRuns.startedAt)).limit(1)
  return row ?? null
}

/** True when a scheduled run is due — at most one per day, and only while unpaused. */
export async function autopilotDue(): Promise<boolean> {
  const current = await getSettings()
  if (current.aiPaused) return false
  const last = await getLastRun()
  if (!last) return true
  return Date.now() - last.startedAt.getTime() > DAY_MS
}

export async function getAgentRuns(limit = 40) {
  return db.select().from(agentRuns).orderBy(desc(agentRuns.startedAt)).limit(limit)
}
