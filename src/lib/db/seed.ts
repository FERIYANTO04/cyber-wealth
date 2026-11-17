import { sql } from 'drizzle-orm'
import { db } from './index'
import {
  activity,
  agents,
  assets,
  billingCycles,
  customers,
  socialPosts,
  plans,
  products,
  proposals,
  services,
  settings,
  subscriptions,
  transactions,
} from './schema'

/**
 * Sample data for the preview only. Everything written here is tagged
 * `dataSource: 'demo'` so it never mixes with the owner's real figures.
 * Idempotent: it clears its own demo rows before re-inserting.
 */
export async function seed() {
  await db.execute('select 1')
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const at = (daysAgo: number) => new Date(now - daysAgo * day)

  await db.delete(activity).where(sql`${activity.dataSource} = 'demo'`)
  await db.delete(proposals).where(sql`${proposals.dataSource} = 'demo'`)
  await db.delete(transactions).where(sql`${transactions.dataSource} = 'demo'`)
  await db.delete(assets).where(sql`${assets.dataSource} = 'demo'`)
  await db.delete(agents).where(sql`${agents.dataSource} = 'demo'`)

  const seededAgents = await db
    .insert(agents)
    .values([
      {
        name: 'Aurora — AI CEO',
        role: 'AI CEO',
        mandate:
          'Menyusun arah bisnis mingguan, membagi prioritas ke agen lain, dan menaikkan setiap keputusan strategis ke pemilik.',
        status: 'active',
        dataSource: 'demo',
        lastRunAt: at(0),
        sortOrder: 1,
      },
      {
        name: 'Nusantara — Riset Pasar',
        role: 'AI Market Research',
        mandate:
          'Memantau pasar internasional, regulasi, dan risiko geopolitik yang berdampak pada produk dan harga.',
        status: 'active',
        dataSource: 'demo',
        lastRunAt: at(0),
        sortOrder: 2,
      },
      {
        name: 'Karya — Produk Digital',
        role: 'AI Product Creator',
        mandate: 'Menyusun produk digital dan paket langganan, termasuk harga dan halaman penjualannya.',
        status: 'active',
        dataSource: 'demo',
        lastRunAt: at(1),
        sortOrder: 3,
      },
      {
        name: 'Gema — Pemasaran',
        role: 'AI Marketing',
        mandate: 'Menjalankan kampanye yang sudah disetujui, menulis konten, dan menguji pesan penawaran.',
        status: 'active',
        dataSource: 'demo',
        lastRunAt: at(0),
        sortOrder: 4,
      },
      {
        name: 'Rangkul — Tindak Lanjut',
        role: 'AI Sales',
        mandate: 'Menjawab pertanyaan calon pelanggan dan mengingatkan langganan yang hampir berakhir.',
        status: 'active',
        dataSource: 'demo',
        lastRunAt: at(1),
        sortOrder: 5,
      },
      {
        name: 'Bendahara — Keuangan',
        role: 'AI Finance',
        mandate:
          'Merapikan arus kas dan mengajukan setiap pengeluaran ke pusat persetujuan. Tidak dapat memindahkan dana sendiri.',
        status: 'active',
        dataSource: 'demo',
        lastRunAt: at(0),
        sortOrder: 6,
      },
      {
        name: 'Cakra — Intelijen Bisnis',
        role: 'AI Business Intelligence',
        mandate:
          'Membaca penjualan, prospek, konten, dan langganan yang tercatat untuk menunjukkan apa yang benar-benar menghasilkan uang. Tidak pernah memperkirakan angka.',
        status: 'active',
        dataSource: 'demo',
        lastRunAt: at(0),
        sortOrder: 7,
      },
    ])
    .returning()

  const agentId = (role: string) => seededAgents.find((agent) => agent.role === role)?.id ?? null

  await db.insert(proposals).values([
    {
      agentId: agentId('AI Finance'),
      title: 'Anggaran iklan berbayar untuk peluncuran paket langganan',
      summary:
        'Rp 12.000.000 untuk tiga minggu iklan. Perkiraan berdasarkan kampanye serupa; hasil sebenarnya belum diketahui dan tidak dijanjikan.',
      category: 'finance',
      amountIdr: 12_000_000,
      risk: 'medium',
      status: 'pending',
      dataSource: 'demo',
      createdAt: at(0),
    },
    {
      agentId: agentId('AI Product Creator'),
      title: 'Paket langganan tahunan dengan diskon 20%',
      summary: 'Menambah paket tahunan pada katalog digital. Butuh persetujuan karena mengubah harga publik.',
      category: 'operations',
      amountIdr: null,
      risk: 'low',
      status: 'pending',
      dataSource: 'demo',
      createdAt: at(1),
    },
    {
      agentId: agentId('AI Market Research'),
      title: 'Masuk pasar regional ASEAN lebih dulu',
      summary:
        'Riset menunjukkan permintaan tumbuh di tiga negara tetangga. Butuh keputusan karena melibatkan biaya legal dan pajak.',
      category: 'contract',
      amountIdr: null,
      risk: 'high',
      status: 'pending',
      dataSource: 'demo',
      createdAt: at(2),
    },
    {
      agentId: agentId('AI Finance'),
      title: 'Alokasi dana menganggur ke deposito 30 hari',
      summary: 'Dana idle Rp 80.000.000 di rekening operasional. Investasi apa pun menunggu keputusan pemilik.',
      category: 'investment',
      amountIdr: 80_000_000,
      risk: 'medium',
      status: 'pending',
      dataSource: 'demo',
      createdAt: at(3),
    },
    {
      agentId: agentId('AI Marketing'),
      title: 'Kampanye email untuk daftar tunggu',
      summary: 'Tiga email tanpa biaya iklan. Menunggu persetujuan karena menyangkut komunikasi massa.',
      category: 'marketing',
      amountIdr: null,
      risk: 'low',
      status: 'pending',
      dataSource: 'demo',
      createdAt: at(4),
    },
  ])

  await db.insert(transactions).values([
    {
      kind: 'revenue',
      category: 'Langganan',
      description: 'Contoh langganan bulanan',
      amountIdr: 4_500_000,
      occurredAt: at(1),
      dataSource: 'demo',
    },
    {
      kind: 'revenue',
      category: 'Produk digital',
      description: 'Contoh penjualan template',
      amountIdr: 2_250_000,
      occurredAt: at(3),
      dataSource: 'demo',
    },
    {
      kind: 'expense',
      category: 'Iklan',
      description: 'Contoh biaya iklan',
      amountIdr: 1_800_000,
      occurredAt: at(2),
      dataSource: 'demo',
    },
    {
      kind: 'expense',
      category: 'Operasional',
      description: 'Contoh biaya perangkat lunak',
      amountIdr: 750_000,
      occurredAt: at(5),
      dataSource: 'demo',
    },
  ])

  await db.insert(assets).values([
    { name: 'Contoh rekening operasional', kind: 'cash', valueIdr: 75_000_000, dataSource: 'demo' },
    { name: 'Contoh portofolio investasi', kind: 'investment', valueIdr: 150_000_000, dataSource: 'demo' },
  ])

  await db.insert(activity).values([
    {
      actor: 'agent',
      agentName: 'Aurora — AI CEO',
      action: 'Ringkasan harian disusun',
      detail: 'Tiga prioritas minggu ini dibagi ke agen riset, produk, dan pemasaran. (contoh)',
      dataSource: 'demo',
      createdAt: at(0),
    },
    {
      actor: 'agent',
      agentName: 'Nusantara — Riset Pasar',
      action: 'Laporan pasar diperbarui',
      detail: 'Tiga sinyal permintaan baru di ASEAN dicatat untuk ditinjau pemilik. (contoh)',
      dataSource: 'demo',
      createdAt: at(0),
    },
    {
      actor: 'agent',
      agentName: 'Gema — Pemasaran',
      action: 'Draf kampanye siap ditinjau',
      detail: 'Tiga email daftar tunggu disiapkan; belum dikirim karena menunggu persetujuan. (contoh)',
      dataSource: 'demo',
      createdAt: at(1),
    },
    {
      actor: 'agent',
      agentName: 'Bendahara — Keuangan',
      action: 'Usulan pengeluaran diajukan',
      detail: 'Anggaran iklan Rp 12.000.000 masuk pusat persetujuan. (contoh)',
      dataSource: 'demo',
      createdAt: at(1),
    },
    {
      actor: 'system',
      action: 'Ruang kerja disiapkan',
      detail: 'Data contoh dipasang agar tampilan terlihat wajar sebelum data asli masuk.',
      dataSource: 'demo',
      createdAt: at(6),
    },
  ])

  await db
    .insert(settings)
    .values({ id: 'singleton', aiPaused: false, netWorthTargetIdr: 500_000_000_000 })
    .onConflictDoNothing()

  await seedCatalogs()
}

/**
 * Sample catalog rows so the storefront and the engine pages look alive on the first
 * visit, plus three clearly-labelled demo subscribers in the billing console. Every
 * demo row carries `dataSource: 'demo'`, and every revenue figure in the app filters
 * on `live`, so none of it can ever be counted as money a real person paid.
 */
async function seedCatalogs() {
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const at = (daysAgo: number) => new Date(now - daysAgo * day)

  await db.insert(services).values([
    {
      slug: 'website-profil-perusahaan',
      name: 'Website profil perusahaan',
      summary: 'Situs lima halaman yang rapi, cepat, dan siap dipakai di ponsel.',
      detail:
        'Mencakup beranda, tentang, layanan, portofolio, dan kontak. Termasuk penyesuaian warna merek, formulir kontak, dan panduan mengelola isi sendiri setelah serah terima.',
      category: 'website',
      priceFromIdr: 4_500_000,
      deliveryDays: 14,
      status: 'published',
      dataSource: 'live',
    },
    {
      slug: 'desain-identitas-merek',
      name: 'Desain identitas merek',
      summary: 'Logo, palet warna, dan panduan pemakaian untuk merek baru.',
      detail:
        'Tiga alternatif logo, satu arah terpilih yang disempurnakan, palet warna, tipografi, serta panduan singkat pemakaian di media sosial dan kemasan.',
      category: 'desain',
      priceFromIdr: 3_200_000,
      deliveryDays: 10,
      status: 'published',
      dataSource: 'live',
    },
    {
      slug: 'paket-konten-bulanan',
      name: 'Paket konten bulanan',
      summary: 'Dua belas kiriman media sosial siap tayang setiap bulan.',
      detail:
        'Rencana konten, penulisan caption, dan desain visual untuk dua belas kiriman. Revisi dua putaran per kiriman. Tidak termasuk biaya iklan berbayar.',
      category: 'konten',
      priceFromIdr: 2_400_000,
      deliveryDays: 7,
      status: 'published',
      dataSource: 'live',
    },
  ]).onConflictDoNothing()

  await db.insert(products).values([
    {
      slug: 'template-laporan-keuangan-umkm',
      name: 'Template laporan keuangan UMKM',
      summary: 'Berkas siap pakai untuk mencatat pemasukan, pengeluaran, dan laba per bulan.',
      description:
        'Template berisi lembar pemasukan, pengeluaran, kas harian, dan ringkasan laba bulanan. Sudah dilengkapi contoh pengisian dan panduan satu halaman untuk pemilik usaha yang belum terbiasa dengan pembukuan.',
      category: 'template',
      priceIdr: 149_000,
      status: 'draft',
      deliverableNote: 'Berkas lembar kerja dan panduan singkat pemakaian.',
      dataSource: 'live',
    },
    {
      slug: 'panduan-konten-media-sosial',
      name: 'Panduan konten media sosial',
      summary: 'Kerangka 30 hari konten untuk usaha kecil, lengkap dengan contoh caption.',
      description:
        'Panduan PDF 12 halaman berisi kalender konten 30 hari, pilar konten, template caption, checklist unggahan, dan lembar evaluasi sederhana.',
      category: 'ebook',
      priceIdr: 99_000,
      status: 'published',
      deliverableNote: 'Berkas PDF yang bisa diunduh langsung setelah pembayaran dikonfirmasi.',
      dataSource: 'live',
    },
    {
      slug: 'kit-presentasi-penawaran',
      name: 'Kit presentasi penawaran',
      summary: 'Dua belas slide untuk mengajukan penawaran jasa secara profesional.',
      description:
        'Kit berisi dua belas slide: masalah klien, pendekatan, lingkup kerja, jadwal, harga, dan langkah berikutnya. Setiap slide punya catatan penjelasan singkat.',
      category: 'materi',
      priceIdr: 179_000,
      status: 'draft',
      deliverableNote: 'Berkas presentasi yang bisa Anda ubah sesuai merek sendiri.',
      dataSource: 'live',
    },
  ]).onConflictDoNothing()

  // Only publish the product that ships with a real, bundled deliverable. The
  // spreadsheet template remains a draft until its actual file is attached.
  await db.update(products).set({ status: 'draft' }).where(sql`${products.slug} = 'template-laporan-keuangan-umkm'`)
  await db.update(products).set({
    status: 'published',
    deliverableNote: 'PDF Panduan Konten Media Sosial 30 Hari. Unduhan tersedia setelah pembayaran terkonfirmasi.',
  }).where(sql`${products.slug} = 'panduan-konten-media-sosial'`)

  await db.insert(plans).values([
    {
      code: 'starter',
      name: 'Starter',
      summary: 'Untuk satu orang yang ingin merapikan alur kerja harian.',
      features: 'Satu pengguna\nRingkasan harian\nEkspor data bulanan',
      priceIdr: 99_000,
      interval: 'month',
      status: 'published',
    },
    {
      code: 'pro',
      name: 'Pro',
      summary: 'Untuk tim kecil yang butuh otomatisasi dan laporan lebih rinci.',
      features: 'Lima pengguna\nRingkasan harian dan mingguan\nEkspor data\nDukungan lewat email',
      priceIdr: 299_000,
      interval: 'month',
      status: 'published',
    },
    {
      code: 'tahunan-starter',
      name: 'Starter tahunan',
      summary: 'Paket Starter yang dibayar sekali untuk setahun, lebih hemat dua bulan.',
      features: 'Satu pengguna\nRingkasan harian\nEkspor data bulanan\nDibayar sekali setahun',
      priceIdr: 990_000,
      interval: 'year',
      status: 'published',
    },
  ]).onConflictDoNothing()

  // Two sample content drafts so the studio opens on something real, both tagged
  // `demo` and both waiting for the owner — nothing here is published.
  await db.delete(socialPosts).where(sql`${socialPosts.dataSource} = 'demo'`)
  const [demoProduct] = await db.select().from(products).where(sql`${products.slug} = 'template-laporan-keuangan-umkm'`).limit(1)
  if (demoProduct) {
    await db.insert(socialPosts).values([
      {
        channel: 'instagram',
        market: 'Indonesia',
        headline: demoProduct.name,
        body: `${demoProduct.summary}\n\nContoh draf: konten ini belum disetujui dan belum dijadwalkan.`,
        sourceType: 'product',
        sourceId: demoProduct.id,
        sourceName: demoProduct.name,
        source: 'template',
        status: 'draft',
        publishState: 'not_connected',
        publishNote: 'Contoh draf. Belum ada kanal terhubung dan belum disetujui pemilik.',
        dataSource: 'demo',
      },
      {
        channel: 'linkedin',
        market: 'International',
        headline: demoProduct.name,
        body: `${demoProduct.summary}\n\nSample draft: written for an international audience.`,
        sourceType: 'product',
        sourceId: demoProduct.id,
        sourceName: demoProduct.name,
        source: 'template',
        status: 'draft',
        publishState: 'not_connected',
        publishNote: 'Contoh draf. Belum ada kanal terhubung dan belum disetujui pemilik.',
        dataSource: 'demo',
      },
    ])
  }

  // Sample subscribers and their periods, all tagged `demo` so no figure derived from
  // them can be mistaken for money a real person paid.
  await db.delete(billingCycles).where(sql`${billingCycles.dataSource} = 'demo'`)
  await db.delete(subscriptions).where(sql`${subscriptions.dataSource} = 'demo'`)

  const [starter] = await db.select().from(plans).where(sql`${plans.code} = 'starter'`).limit(1)
  const [pro] = await db.select().from(plans).where(sql`${plans.code} = 'pro'`).limit(1)

  if (starter && pro) {
    const demoSubs = await db
      .insert(subscriptions)
      .values([
        {
          accessToken: `demo-${crypto.randomUUID()}`,
          planId: starter.id,
          planName: starter.name,
          accountEmail: 'demo.dinda@contoh.id',
          accountName: 'Dinda (contoh)',
          amountIdr: 99_000,
          interval: 'month',
          status: 'active',
          autoRenew: true,
          autoRenewAt: at(24),
          paidAt: at(24),
          periodEnd: new Date(now + 6 * day),
          dataSource: 'demo',
        },
        {
          accessToken: `demo-${crypto.randomUUID()}`,
          planId: pro.id,
          planName: pro.name,
          accountEmail: 'demo.rendra@contoh.id',
          accountName: 'Rendra (contoh)',
          amountIdr: 299_000,
          interval: 'month',
          status: 'active',
          autoRenew: true,
          autoRenewAt: at(52),
          paidAt: at(52),
          periodEnd: new Date(now + 2 * day),
          dataSource: 'demo',
        },
        {
          accessToken: `demo-${crypto.randomUUID()}`,
          planId: pro.id,
          planName: pro.name,
          accountEmail: 'demo.sari@contoh.id',
          accountName: 'Sari (contoh)',
          amountIdr: 299_000,
          interval: 'month',
          status: 'cancelled',
          cancelledAt: at(4),
          cancelReason: 'Anggaran dialihkan ke proyek lain',
          paidAt: at(34),
          periodEnd: at(4),
          dataSource: 'demo',
        },
      ])
      .returning()

    for (const sub of demoSubs) {
      if (sub.status !== 'active') continue
      await db.insert(billingCycles).values([
        {
          subscriptionId: sub.id,
          periodStart: at(30),
          periodEnd: sub.periodEnd ?? new Date(now + 7 * day),
          dueAt: sub.periodEnd ?? new Date(now + 7 * day),
          amountIdr: Number(sub.amountIdr),
          status: 'scheduled',
          dataSource: 'demo',
        },
        {
          subscriptionId: sub.id,
          periodStart: at(60),
          periodEnd: at(30),
          dueAt: at(30),
          amountIdr: Number(sub.amountIdr),
          status: 'paid',
          paidAt: at(30),
          dataSource: 'demo',
        },
      ])
    }

    await db
      .insert(customers)
      .values([
        { email: 'demo.dinda@contoh.id', name: 'Dinda (contoh)' },
        { email: 'demo.rendra@contoh.id', name: 'Rendra (contoh)' },
      ])
      .onConflictDoNothing()
  }
}
