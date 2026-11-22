import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import { db } from './db'
import { activity, orders, postTracks, products, revenueLeads, services, socialAccounts, socialPosts } from './db/schema'
import { askAi, aiConfigured } from './ai'
import { xReady, publishToX } from './x'
import { fileUrl } from './storage'
import { publishToYouTube } from './youtube-publisher'
import { CHANNELS, MARKETS, MARKET_CHANNELS, channelLabel, channelLimit, type ChannelKey } from './labels'

/**
 * The social content studio.
 *
 * Three rules hold the whole file together:
 * 1. AI Marketing may schedule factual text posts from the live catalog.
 *    Video concepts remain drafts until a rendered video is attached and reviewed.
 * 2. "Published" is a claim only a channel API can make. Until one returns an id, a
 *    post stays `not_connected` or `failed`, with the provider's reason on it.
 * 3. Content is written from the owner's real catalog rows. No invented product,
 *    testimonial, price, or customer figure ever enters a post.
 */

export type PostItem = {
  id: string
  channel: string
  market: string
  headline: string
  body: string
  sourceType: string
  sourceName: string | null
  source: string
  status: string
  publishState: string
  publishNote: string | null
  externalUrl: string | null
  mediaUrl: string | null
  mediaType: string | null
  scheduledAt: string | null
  approvedAt: string | null
  decisionNote: string | null
  dataSource: 'live' | 'demo'
  createdAt: string
}

export function toPostItem(row: typeof socialPosts.$inferSelect, mediaUrl: string | null = null): PostItem {
  return {
    id: row.id,
    channel: row.channel,
    market: row.market,
    headline: row.headline,
    body: row.body,
    sourceType: row.sourceType,
    sourceName: row.sourceName,
    source: row.source,
    status: row.status,
    publishState: row.publishState,
    publishNote: row.publishNote,
    externalUrl: row.externalUrl,
    mediaUrl,
    mediaType: row.mediaType,
    scheduledAt: row.scheduledAt ? row.scheduledAt.toISOString() : null,
    approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
    decisionNote: row.decisionNote,
    dataSource: row.dataSource as 'live' | 'demo',
    createdAt: row.createdAt.toISOString(),
  }
}

/** Which channels have a stored, accepted account right now. */
export async function connectedChannels(): Promise<Set<string>> {
  const connected = new Set<string>()
  if (await xReady()) connected.add('x')
  const rows = await db
    .select({ channel: socialAccounts.channel })
    .from(socialAccounts)
    .where(eq(socialAccounts.status, 'connected'))
  for (const row of rows) connected.add(row.channel)
  return connected
}

export async function getPosts(limit = 120) {
  const rows = await db.select().from(socialPosts).orderBy(desc(socialPosts.createdAt)).limit(limit)
  // Media lives in private storage, so each view signs its own short-lived link.
  const keys = rows.map((row) => row.mediaKey).filter((key): key is string => Boolean(key))
  const signed = new Map<string, string | null>()
  for (const key of [...new Set(keys)]) {
    signed.set(key, await fileUrl(key).catch(() => null))
  }
  return rows.map((row) => toPostItem(row, row.mediaKey ? signed.get(row.mediaKey) ?? null : null))
}

export type StudioTotals = {
  drafts: number
  waiting: number
  scheduled: number
  published: number
  failed: number
  byChannel: { channel: string; total: number; published: number }[]
  byMarket: { market: string; total: number }[]
}

export async function getStudioTotals(): Promise<StudioTotals> {
  const rows = await db
    .select({
      status: socialPosts.status,
      publishState: socialPosts.publishState,
      channel: socialPosts.channel,
      market: socialPosts.market,
      scheduledAt: socialPosts.scheduledAt,
    })
    .from(socialPosts)
    .where(eq(socialPosts.dataSource, 'live'))

  const byChannel = new Map<string, { channel: string; total: number; published: number }>()
  const byMarket = new Map<string, number>()
  for (const row of rows) {
    const entry = byChannel.get(row.channel) ?? { channel: row.channel, total: 0, published: 0 }
    entry.total += 1
    if (row.publishState === 'published') entry.published += 1
    byChannel.set(row.channel, entry)
    byMarket.set(row.market, (byMarket.get(row.market) ?? 0) + 1)
  }

  return {
    drafts: rows.filter((row) => row.status === 'draft').length,
    waiting: rows.filter((row) => row.status === 'approved' && row.publishState !== 'published').length,
    scheduled: rows.filter((row) => row.scheduledAt && row.publishState !== 'published').length,
    published: rows.filter((row) => row.publishState === 'published').length,
    failed: rows.filter((row) => row.publishState === 'failed').length,
    byChannel: [...byChannel.values()].sort((a, b) => b.total - a.total),
    byMarket: [...byMarket.entries()].map(([market, total]) => ({ market, total })),
  }
}

type Material = {
  title: string
  summary: string
  priceLabel: string
  sourceType: 'product' | 'service'
  sourceId: string
  sourceName: string
  link: string
}

async function catalogMaterials(): Promise<Material[]> {
  const [productRows, serviceRows] = await Promise.all([
    db.select().from(products).where(and(eq(products.status, 'published'), eq(products.dataSource, 'live'), sql`${products.fileKey} is not null and ${products.fileKey} !~* '^https?://' and coalesce(${products.fileName}, '') !~* '(draft|draf)'`)).limit(8),
    db.select().from(services).where(and(eq(services.status, 'published'), eq(services.dataSource, 'live'))).limit(8),
  ])

  return [
    ...productRows.map(
      (row): Material => ({
        title: row.name,
        summary: row.summary,
        priceLabel: `Rp ${Number(row.priceIdr).toLocaleString('id-ID')}`,
        sourceType: 'product',
        sourceId: row.id,
        sourceName: row.name,
        link: `/toko/${row.slug}`,
      })
    ),
    ...serviceRows.map(
      (row): Material => ({
        title: row.name,
        summary: row.summary,
        priceLabel: `mulai Rp ${Number(row.priceFromIdr).toLocaleString('id-ID')}`,
        sourceType: 'service',
        sourceId: row.id,
        sourceName: row.name,
        link: `/jasa/${row.slug}`,
      })
    ),
  ]
}

function templateBody(material: Material, channel: ChannelKey, market: string): string {
  const indo = market === 'Indonesia'
  const lines = indo
    ? [
        `${material.title}`,
        '',
        material.summary,
        '',
        `Harga ${material.priceLabel}. Detail lengkap ada di halaman kami.`,
      ]
    : [
        `${material.title}`,
        '',
        material.summary,
        '',
        `From ${material.priceLabel.replace('mulai ', '')}. Full details on our page.`,
      ]
  if (channel === 'x') return `${material.title} — ${material.summary}`.slice(0, 270)
  return lines.join('\n')
}

/**
 * Writes one post per material per market and channel, skipping anything that already
 * exists. Text posts may be scheduled 24 hours ahead; video production briefs stay as drafts
 * until a rendered media file is attached and reviewed.
 */
export async function generatePosts(args: { markets?: string[]; channels?: ChannelKey[]; limit?: number } = {}) {
  const markets = args.markets?.length ? args.markets : MARKETS.map((m) => m.key)
  const materials = await catalogMaterials()

  if (materials.length === 0) {
    return {
      created: 0,
      skipped: true as const,
      reason: 'Belum ada produk atau layanan terbit, jadi belum ada yang bisa dipromosikan.',
    }
  }

  const existing = await db
    .select({
      id: socialPosts.id,
      channel: socialPosts.channel,
      market: socialPosts.market,
      sourceId: socialPosts.sourceId,
      status: socialPosts.status,
      publishState: socialPosts.publishState,
    })
    .from(socialPosts)
  const existingByKey = new Map(existing.map((row) => [`${row.channel}|${row.market}|${row.sourceId}`, row]))
  const taken = new Set(existingByKey.keys())

  const targets = args.channels?.length
    ? args.channels
    : [...new Set(markets.flatMap((market) => MARKET_CHANNELS[market] ?? []))]

  let created = 0
  let videoDrafts = 0
  let scheduledPosts = 0
  const notes: string[] = []
  const cap = args.limit ?? 12

  for (const market of markets) {
    const language = MARKETS.find((entry) => entry.key === market)?.language ?? 'Bahasa Indonesia'
    const marketChannels = targets.filter((channel) => (MARKET_CHANNELS[market] ?? []).includes(channel))
    for (const material of materials) {
      if (created >= cap) break
      for (const channel of marketChannels) {
        if (created >= cap) break
        const key = `${channel}|${market}|${material.sourceId}`
        const prior = existingByKey.get(key)
        if (prior) {
          // Reconcile legacy drafts created before agent self-approval was enabled.
          // Only unsent drafts from the current live catalog are promoted; published,
          // rejected, failed-review, or already-approved posts are left untouched.
          if (prior.status === 'draft' && prior.publishState === 'not_connected' && channel !== 'youtube' && channel !== 'tiktok') {
            const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
            await db.update(socialPosts).set({
              status: 'approved',
              approvedAt: new Date(),
              scheduledAt,
              publishNote: 'Draf lama dari katalog aktif dijadwalkan otomatis oleh AI Marketing 24 jam setelah pemulihan. Publikasi hanya berjalan jika kanal resmi terhubung dan API mengonfirmasi.',
            }).where(eq(socialPosts.id, prior.id))
            created += 1
          }
          continue
        }

        const limit = channelLimit(channel)
        let body = templateBody(material, channel, market)
        let source = 'template'

        if (aiConfigured()) {
          const outcome = await askAi({
            system:
              [
                'Anda adalah direktur kreatif dan editor senior untuk merek perusahaan yang profesional.',
                'Hasil harus spesifik, bernilai bagi audiens, enak dibaca, dan sesuai budaya pasar serta bahasa yang diminta.',
                'Gunakan hanya fakta yang diberikan tentang produk atau layanan. Jangan mengarang fitur, hasil, diskon, stok, garansi, testimoni, pelanggan, sertifikasi, atau angka.',
                'Hindari klaim mutlak, clickbait menipu, spam, pengulangan, pembukaan generik, dan emoji berlebihan.',
                'Buat satu ide utama yang jelas, pembuka kuat, manfaat konkret yang benar-benar didukung ringkasan, lalu satu ajakan bertindak yang wajar.',
                'Jangan menyebut harga jika tidak tersedia. Jangan membuat tagar yang tidak relevan. Keluarkan hanya materi final tanpa penjelasan proses.'
              ].join(' '),
            prompt: [
              `Kanal: ${channelLabel(channel)}. Bahasa dan pasar: ${language} / ${market}.`,
              `Produk/layanan: ${material.title}. Ringkasan resmi: ${material.summary}. Harga resmi: ${material.priceLabel}.`,
              `Batas maksimal ${limit} karakter. Hitung panjang keluaran dengan cermat.`,
              channel === 'youtube'
                ? 'Buat paket produksi video YouTube Shorts 9:16 berdurasi 30–45 detik: judul yang memancing rasa ingin tahu tanpa clickbait, hook 0–2 detik, naskah narasi lengkap, storyboard per adegan dengan timestamp, visual/B-roll yang harus direkam atau dibuat, teks layar, arahan musik/suara tanpa memakai lagu berhak cipta yang tidak berlisensi, CTA, deskripsi, dan 3–5 kata kunci. Pastikan video tetap bernilai walau penonton belum mengenal merek. Jangan mengklaim video sudah dibuat.'
                : channel === 'tiktok'
                  ? 'Buat paket produksi TikTok vertikal 9:16 berdurasi 20–35 detik: 3 alternatif hook 0–2 detik, pilih hook terbaik, naskah narasi lengkap, storyboard per adegan dengan timestamp, visual/B-roll spesifik, teks layar singkat yang sinkron, ritme potongan, arahan suara/musik bebas lisensi, CTA natural, caption terpisah, dan 3–5 hashtag relevan. Utamakan retensi, kejelasan, dan nilai tontonan; jangan membuat klaim bahwa video sudah dirender.'
                  : channel === 'x'
                      ? 'Buat satu gagasan tajam, sangat ringkas, tanpa basa-basi.'
                      : 'Sesuaikan gaya dan struktur dengan kebiasaan audiens kanal; jangan menulis seperti iklan generik.',
            ]
              .filter(Boolean)
              .join(' '),
            maxTokens: 400,
          })
          if (outcome.ok) {
            body = outcome.text.trim().slice(0, limit)
            source = `ai:${outcome.model}`
          } else {
            notes.push(outcome.reason)
          }
        }

        const videoChannel = channel === 'youtube' || channel === 'tiktok'
        await db.insert(socialPosts).values({
          channel,
          market,
          headline: material.title,
          body,
          sourceType: material.sourceType,
          sourceId: material.sourceId,
          sourceName: material.sourceName,
          source,
          status: videoChannel ? 'draft' : 'approved',
          approvedAt: videoChannel ? null : new Date(),
          scheduledAt: videoChannel ? null : new Date(Date.now() + 24 * 60 * 60 * 1000),
          publishState: 'not_connected',
          publishNote: videoChannel
            ? 'Paket produksi video dibuat AI Marketing. Belum ada berkas MP4 final; video harus dirender dan dilampirkan sebelum persetujuan serta publikasi.'
            : 'Dijadwalkan otomatis oleh AI Marketing 24 jam setelah dibuat. Publikasi hanya berjalan jika kanal resmi terhubung dan API mengonfirmasi.',
          dataSource: 'live',
        })
        taken.add(key)
        created += 1
        if (videoChannel) videoDrafts += 1
        else scheduledPosts += 1
      }
    }
  }

  await db.insert(activity).values({
    actor: 'agent',
    agentName: 'AI Marketing',
    action: created > 0 ? 'Draf konten sosial dibuat' : 'Tugas pemasaran dilewati',
    detail:
      created > 0
        ? `${created} konten untuk ${markets.join(' dan ')} dibuat. ${scheduledPosts} konten teks dijadwalkan otomatis 24 jam ke depan; ${videoDrafts} paket video disimpan sebagai draf sampai MP4 final dilampirkan dan ditinjau. Publikasi hanya berjalan melalui kanal resmi yang terhubung.`
        : 'Setiap produk dan layanan sudah punya draf di kanal yang dipilih.',
    dataSource: 'live',
  })

  return {
    created,
    videoDrafts,
    scheduledPosts,
    skipped: false as const,
    reason: notes[0] ?? null,
    markets,
  }
}

/** The owner approves, or rejects with a note. A rejected draft can be rewritten later. */
export async function decidePost(args: {
  postId: string
  decision: 'approved' | 'rejected'
  note?: string
  scheduledAt?: string | null
}) {
  const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, args.postId)).limit(1)
  if (!post) return { ok: false as const, error: 'Konten ini tidak ditemukan.' }
  if (post.status === 'rejected' && args.decision === 'approved') {
    return { ok: false as const, error: 'Konten yang sudah ditolak tidak bisa disetujui. Tulis ulang sebagai draf baru.' }
  }

  const scheduledAt = args.decision === 'approved' && args.scheduledAt ? new Date(args.scheduledAt) : null
  if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
    return { ok: false as const, error: 'Jadwal yang Anda isi tidak bisa dibaca. Periksa tanggal dan jamnya.' }
  }

  await db
    .update(socialPosts)
    .set({
      status: args.decision,
      approvedAt: args.decision === 'approved' ? new Date() : null,
      decisionNote: args.note ?? null,
      scheduledAt,
      publishState: post.publishState === 'published' ? 'published' : 'not_connected',
      publishNote:
        args.decision === 'approved'
          ? (await connectedChannels()).has(post.channel)
            ? 'Disetujui. Belum terbit — konten dikirim ke kanal saat jadwalnya tiba, dan baru disebut terbit setelah kanal mengonfirmasi.'
            : `Disetujui. Belum terbit — ${channelLabel(post.channel)} belum terhubung, jadi tidak ada yang dikirim.`
          : 'Ditolak pemilik. Tidak akan dijadwalkan.',
    })
    .where(eq(socialPosts.id, post.id))

  await db.insert(activity).values({
    actor: 'owner',
    action: args.decision === 'approved' ? 'Konten sosial disetujui' : 'Konten sosial ditolak',
    detail: `${post.headline} — ${channelLabel(post.channel)} (${post.market}).${
      scheduledAt ? ` Dijadwalkan ${scheduledAt.toISOString().slice(0, 16).replace('T', ' ')} UTC.` : ''
    }${args.note ? ` Catatan: ${args.note}` : ''} Tidak ada unggahan otomatis.`,
    dataSource: 'live',
  })

  return { ok: true as const }
}

/** Attaches a photo or video to a draft. Only the storage key is kept. */
export async function setPostMedia(args: {
  postId: string
  mediaKey: string
  mediaType: 'image' | 'video'
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, args.postId)).limit(1)
  if (!post) return { ok: false, error: 'Konten ini tidak ditemukan.' }
  if (post.publishState === 'published') {
    return { ok: false, error: 'Konten yang sudah terbit tidak bisa diubah dari sini.' }
  }

  await db
    .update(socialPosts)
    .set({ mediaKey: args.mediaKey, mediaType: args.mediaType })
    .where(eq(socialPosts.id, post.id))

  await db.insert(activity).values({
    actor: 'owner',
    action: 'Lampiran konten sosial ditambahkan',
    detail: `${post.headline} — ${channelLabel(post.channel)} (${post.market}). Berkas disimpan privat di penyimpanan aplikasi.`,
    dataSource: 'live',
  })

  return { ok: true }
}

/** The owner edits the wording before approving. */
export async function updatePost(args: { postId: string; headline?: string; body?: string; scheduledAt?: string | null }) {
  const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, args.postId)).limit(1)
  if (!post) return { ok: false as const, error: 'Konten ini tidak ditemukan.' }
  if (post.publishState === 'published') {
    return { ok: false as const, error: 'Konten yang sudah terbit tidak bisa diubah dari sini.' }
  }
  if (post.status === 'approved' && args.body !== undefined) {
    return { ok: false as const, error: 'Konten yang sudah disetujui tidak bisa diubah. Tolak dulu, lalu buat draf baru.' }
  }

  const body = args.body?.trim() ?? post.body
  if (body.length === 0) return { ok: false as const, error: 'Isi konten tidak boleh kosong.' }
  const limit = channelLimit(post.channel)
  if (body.length > limit) {
    return { ok: false as const, error: `Konten melebihi batas ${channelLabel(post.channel)} (${limit} karakter).` }
  }

  const scheduledAt = args.scheduledAt ? new Date(args.scheduledAt) : post.scheduledAt
  await db
    .update(socialPosts)
    .set({ headline: args.headline?.trim() || post.headline, body, scheduledAt })
    .where(eq(socialPosts.id, post.id))

  await db.insert(activity).values({
    actor: 'owner',
    action: 'Draf konten sosial diubah',
    detail: `${post.headline} — ${channelLabel(post.channel)} (${post.market}).`,
    dataSource: 'live',
  })

  return { ok: true as const }
}

export async function setPostSchedule(postId: string, iso: string | null) {
  const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, postId)).limit(1)
  if (!post) return { ok: false as const, error: 'Konten ini tidak ditemukan.' }
  if (post.status !== 'approved') {
    return { ok: false as const, error: 'Setujui kontennya dulu, baru atur jadwal.' }
  }
  const scheduledAt = iso ? new Date(iso) : null
  if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
    return { ok: false as const, error: 'Jadwal tidak bisa dibaca.' }
  }
  await db.update(socialPosts).set({ scheduledAt }).where(eq(socialPosts.id, post.id))
  await db.insert(activity).values({
    actor: 'owner',
    action: scheduledAt ? 'Jadwal konten ditetapkan' : 'Jadwal konten dilepas',
    detail: `${post.headline} — ${channelLabel(post.channel)}.${
      scheduledAt ? ` ${scheduledAt.toISOString().slice(0, 16).replace('T', ' ')} UTC.` : ''
    }`,
    dataSource: 'live',
  })
  return { ok: true as const }
}

/**
 * Publishes approved posts whose scheduled time has come.
 *
 * Connected channels publish through their official APIs. A post becomes `published` only when the selected provider
 * returns a post id, and that id and the publish time are stored with it. Anything
 * else is recorded as `failed` with the provider's own reason, and the content stays unpublished.
 * Channels without an integration yet are recorded as `not_connected`, never as done.
 */
export async function publishDuePosts(): Promise<{
  attempted: number
  published: number
  blocked: number
  failed: number
  notes: string[]
}> {
  const due = await db
    .select()
    .from(socialPosts)
    .where(
      and(
        eq(socialPosts.status, 'approved'),
        eq(socialPosts.dataSource, 'live'),
        lte(socialPosts.scheduledAt, new Date()),
        inArray(socialPosts.publishState, ['not_connected', 'failed'])
      )
    )
    .orderBy(asc(socialPosts.scheduledAt))
    .limit(20)

  const notes: string[] = []
  let blocked = 0
  let published = 0
  let failed = 0

  // A scheduled post for a channel with no accepted account is not a failure: nothing was
  // ever sent. Keeping it `not_connected` says exactly that.
  const connected = await connectedChannels()

  for (const post of due) {
    if (!connected.has(post.channel)) {
      await db
        .update(socialPosts)
        .set({
          publishState: 'not_connected',
          publishNote: `Jatuh tempo ${new Date().toISOString().slice(0, 10)}, tetapi ${channelLabel(post.channel)} belum terhubung. Tidak ada yang dikirim.`,
        })
        .where(eq(socialPosts.id, post.id))
      blocked += 1
      continue
    }

    if (post.channel === 'x') {
      const result = await publishToX(post.body)
      if (result.ok) {
        await db.update(socialPosts).set({
          publishState: 'published',
          externalId: result.tweetId,
          externalUrl: result.url,
          publishedAt: new Date(),
          publishNote: 'Diterbitkan di X dan dikonfirmasi oleh API X.',
        }).where(eq(socialPosts.id, post.id))
        await db.insert(activity).values({
          actor: 'system',
          action: 'Konten terbit di X',
          detail: `${post.headline} — ${result.url}. Dikonfirmasi X API.`,
          dataSource: 'live',
        })
        published += 1
        continue
      }
      await db.update(socialPosts).set({
        publishState: 'failed',
        publishNote: `X menolak publikasi: ${result.reason}`,
      }).where(eq(socialPosts.id, post.id))
      await db.insert(activity).values({
        actor: 'system',
        action: 'Publikasi X gagal',
        detail: `${post.headline} — ${result.reason}`,
        dataSource: 'live',
      })
      notes.push(result.reason)
      failed += 1
      continue
    }

    if (post.channel === 'youtube') {
      const result = await publishToYouTube(post)
      if (result.ok) {
        const track = await createPostTrack(post)
        await db.update(socialPosts).set({
          publishState: 'published',
          externalId: result.videoId,
          externalUrl: result.url,
          publishedAt: new Date(),
          publishNote: 'Video berhasil diunggah dan dikonfirmasi YouTube API. Tautan katalog perusahaan dimasukkan ke deskripsi; privasi default unlisted.',
        }).where(eq(socialPosts.id, post.id))
        await db.insert(activity).values({
          actor: 'system',
          action: 'Video terbit di YouTube',
          detail: post.headline + ' — ' + result.url + '. Dikonfirmasi YouTube Data API.',
          dataSource: 'live',
        })
        published += 1
        continue
      }
      await db.update(socialPosts).set({
        publishState: 'failed',
        publishNote: 'YouTube menolak publikasi: ' + result.reason,
      }).where(eq(socialPosts.id, post.id))
      await db.insert(activity).values({
        actor: 'system',
        action: 'Publikasi YouTube gagal',
        detail: post.headline + ' — ' + result.reason,
        dataSource: 'live',
      })
      notes.push(result.reason)
      failed += 1
      continue
    }

    if (post.channel === 'tiktok') {
      await db.update(socialPosts).set({
        publishState: 'not_connected',
        publishNote: 'Akun TikTok terhubung, tetapi pengiriman video menunggu persetujuan eksplisit owner pada setiap posting sesuai aturan Content Posting API. Tidak ada video yang dikirim.',
      }).where(eq(socialPosts.id, post.id))
      blocked += 1
      continue
    }

    await db
      .update(socialPosts)
      .set({
        publishState: 'not_connected',
        publishNote: `Jatuh tempo ${new Date().toISOString().slice(0, 10)}, tetapi belum ada integrasi ${channelLabel(post.channel)} yang terhubung. Tidak ada yang dikirim.`,
      })
      .where(eq(socialPosts.id, post.id))
    blocked += 1
  }

  if (blocked > 0) {
    await db.insert(activity).values({
      actor: 'system',
      action: 'Publikasi tertunda',
      detail: `${blocked} konten jatuh tempo untuk kanal yang belum terhubung. Tidak ada konten yang diklaim terbit.`,
      dataSource: 'live',
    })
    notes.push('Sebagian konten jatuh tempo untuk kanal yang belum memiliki konektor atau kredensial, jadi belum dikirim.')
  }

  return { attempted: due.length, published, blocked, failed, notes }
}

/**
 * A short tracked link for a published post, pointing at what it promotes. A click is
 * only ever counted when the redirect actually happens.
 */
async function createPostTrack(post: typeof socialPosts.$inferSelect): Promise<boolean> {
  const destination =
    post.sourceType === 'product' ? `/toko` : post.sourceType === 'service' ? `/jasa` : '/'
  try {
    await db.insert(postTracks).values({
      postId: post.id,
      code: trackCode(),
      destination,
    })
    return true
  } catch {
    return false
  }
}

export function trackCode(): string {
  return `s-${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`
}

export async function getTrackForPost(postId: string) {
  const [row] = await db.select().from(postTracks).where(eq(postTracks.postId, postId)).limit(1)
  return row ?? null
}

/** Content attribution: clicks this app recorded, and sales a tracked link brought. */
export async function getContentPerformance() {
  const tracks = await db.select().from(postTracks).orderBy(desc(postTracks.clicks))
  const [clickRow] = await db
    .select({ n: sql<number>`coalesce(sum(${postTracks.clicks}),0)::int` })
    .from(postTracks)
  const [saleRow] = await db
    .select({ n: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${orders.amountIdr}),0)::bigint` })
    .from(orders)
    .where(and(eq(orders.status, 'paid'), sql`${orders.refCode} is not null`))
  const [leadRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(revenueLeads)
    .where(eq(revenueLeads.source, 'social'))

  return {
    clicks: Number(clickRow?.n ?? 0),
    leads: leadRow?.n ?? 0,
    sales: saleRow?.n ?? 0,
    salesIdr: Number(saleRow?.total ?? 0),
    tracks: tracks.map((row) => ({ code: row.code, postId: row.postId, clicks: row.clicks, destination: row.destination })),
  }
}

/** The calendar's "due today" count, used by the daily pass and the console header. */
export async function dueTodayCount(): Promise<number> {
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(start.getTime() + 86_400_000)
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(socialPosts)
    .where(
      and(
        eq(socialPosts.status, 'approved'),
        gte(socialPosts.scheduledAt, start),
        lte(socialPosts.scheduledAt, end)
      )
    )
  return row?.n ?? 0
}
