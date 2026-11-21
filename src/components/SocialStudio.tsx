import { useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, Check, Loader2, Sparkles, X } from 'lucide-react'
import {
  Badge,
  Button,
  ChoiceChips,
  CountNote,
  EmptyState,
  Field,
  InlineNote,
  Input,
  Notice,
  Panel,
  PanelBody,
  PanelHead,
  Segmented,
  SourceTag,
  Stat,
  Textarea,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import { dateTime } from '@/lib/format'
import { channelShort } from '@/lib/labels'
import type { PostItem, StudioTotals } from '@/lib/social'

export type ChannelOption = { key: string; label: string; short: string; limit: number; note: string }
export type MarketOption = { key: string; label: string }

const PUBLISH_TONE: Record<string, 'signal' | 'hold' | 'danger' | 'neutral'> = {
  published: 'signal',
  not_connected: 'hold',
  failed: 'danger',
}

const PUBLISH_LABEL: Record<string, string> = {
  published: 'Terbit (dikonfirmasi kanal)',
  not_connected: 'Belum terbit — kanal belum terhubung',
  failed: 'Gagal dikirim',
}

const STATUS_TONE: Record<string, 'signal' | 'hold' | 'danger' | 'neutral'> = {
  draft: 'neutral',
  approved: 'signal',
  rejected: 'danger',
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draf',
  approved: 'Disetujui',
  rejected: 'Ditolak',
}

export function SocialStudio({
  initialPosts,
  totals,
  channels,
  markets,
  aiReady,
  telegramReady,
}: {
  initialPosts: PostItem[]
  totals: StudioTotals
  channels: ChannelOption[]
  markets: MarketOption[]
  aiReady: boolean
  telegramReady: boolean
}) {
  const [posts, setPosts] = useState(initialPosts)
  // Counts come from the list on screen, so a freshly generated draft moves them at
  // once instead of waiting for a reload.
  const live = useMemo(
    () => ({
      drafts: posts.filter((post) => post.status === 'draft').length,
      approved: posts.filter((post) => post.status === 'approved').length,
      scheduled: posts.filter((post) => post.scheduledAt && post.publishState !== 'published').length,
      published: posts.filter((post) => post.publishState === 'published').length,
    }),
    [posts]
  )
  const [tab, setTab] = useState<'studio' | 'calendar'>('studio')
  const [status, setStatus] = useState('all')
  const [market, setMarket] = useState('all')
  const [channel, setChannel] = useState('all')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const [genMarkets, setGenMarkets] = useState<string[]>(markets.map((m) => m.key))
  const [genChannels, setGenChannels] = useState<string[]>(['telegram', 'tiktok', 'youtube'])

  const filtered = useMemo(() => {
    return posts.filter((post) => {
      if (status !== 'all' && post.status !== status) return false
      if (market !== 'all' && post.market !== market) return false
      if (channel !== 'all' && post.channel !== channel) return false
      return true
    })
  }, [posts, status, market, channel])

  const calendar = useMemo(() => {
    const start = new Date()
    start.setUTCHours(0, 0, 0, 0)
    const days: { date: string; items: PostItem[] }[] = []
    for (let index = 0; index < 28; index += 1) {
      const date = new Date(start.getTime() + index * 86_400_000).toISOString().slice(0, 10)
      days.push({ date, items: posts.filter((post) => post.scheduledAt?.slice(0, 10) === date) })
    }
    return days.filter((day) => day.items.length > 0)
  }, [posts])

  function toggle(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
  }

  async function refresh() {
    const refreshed = await fetch('/api/social/posts').then((r) => r.json()).catch(() => null)
    if (refreshed?.posts) setPosts(refreshed.posts)
  }

  async function generate() {
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      const response = await fetch('/api/social/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markets: genMarkets, channels: genChannels, limit: 12 }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Draf konten tidak bisa dibuat.')
        return
      }
      if (data.skipped) {
        setNote(data.reason ?? 'Belum ada yang bisa dipromosikan.')
        return
      }
      const refreshed = await fetch('/api/social/posts').then((r) => r.json()).catch(() => null)
      if (refreshed?.posts) setPosts(refreshed.posts)
      setNote(
        data.created === 0
          ? 'Semua kombinasi kanal dan pasar sudah punya konten. Ubah kanal atau pasar untuk membuat variasi baru.'
          : `${data.created} konten baru dibuat. Konten untuk kanal yang diotorisasi dijadwalkan untuk diterbitkan otomatis.`
      )
      if (data.reason) setNote((old) => `${old} Sebagian draf disusun tanpa AI: ${data.reason}`)
    } catch {
      setError('Koneksi terputus. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  async function act(kind: 'decide' | 'edit' | 'schedule', postId: string, payload: Record<string, unknown>) {
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      const response = await fetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: kind, postId, ...payload }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Perubahan tidak tersimpan.')
        return
      }
      const refreshed = await fetch('/api/social/posts').then((r) => r.json()).catch(() => null)
      if (refreshed?.posts) setPosts(refreshed.posts)
      setNote(
        kind === 'decide' && payload.decision === 'approved'
          ? 'Konten disetujui. Kanal yang terhubung akan menerbitkannya saat jadwal tiba.'
          : kind === 'decide'
            ? 'Konten ditolak dan tidak akan dijadwalkan.'
            : 'Perubahan tersimpan.'
      )
      if (kind === 'decide') setOpenId(null)
    } catch {
      setError('Koneksi terputus. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  const scheduled = posts.filter((post) => post.scheduledAt && post.publishState !== 'published').length

  return (
    <div className="flex flex-col gap-stack">
      {!aiReady && (
        <Notice tone="hold" icon={<AlertTriangle className="warn-icon" aria-hidden="true" />}>
          <p className="note-text">
            Model AI belum terhubung. Draf tetap bisa dibuat dari data produk Anda, tetapi ditulis dengan pola dasar dan
            diberi tanda bahwa AI belum menjawab.
          </p>
        </Notice>
      )}

      <Notice tone={telegramReady ? 'signal' : 'hold'} icon={<AlertTriangle className="warn-icon" aria-hidden="true" />}>
        <p className="note-text">
          {telegramReady
            ? 'Telegram terhubung. Agen pemasaran dapat menerbitkan konten yang sudah disetujui sesuai jadwal dan menyimpan tautan serta ID pesan sebagai bukti.'
            : 'Telegram belum terhubung. Sistem penerbitan sudah disiapkan, tetapi bot dan kanal Telegram perlu diotorisasi melalui TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID pada pengaturan layanan. Agen tidak akan mengaku konten terbit sebelum Telegram mengonfirmasi.'}
        </p>
      </Notice>

      <Panel>
        <PanelBody>
          <div className="grid grid-cols-2 gap-stack sm:grid-cols-4">
            <Stat label="Menunggu Anda" value={String(live.drafts)} context="draf belum disetujui" />
            <Stat label="Disetujui" value={String(live.approved)} context="siap dijadwalkan" />
            <Stat label="Terjadwal" value={String(live.scheduled)} context="punya tanggal" />
            <Stat label="Terbit" value={String(live.published)} context="dikonfirmasi kanal" tone={live.published > 0 ? 'signal' : 'default'} />
          </div>
          <p className="list-lead">
            Angka “Terbit” hanya bertambah bila sebuah kanal mengonfirmasi kirimannya. Selama belum ada akun terhubung,
            angkanya nol — dan itu memang keadaan sebenarnya, bukan kegagalan tampilan.
          </p>
        </PanelBody>
      </Panel>

      {note && <InlineNote tone="signal">{note}</InlineNote>}
      {error && (
        <InlineNote tone="danger">
          <span role="alert">{error}</span>
        </InlineNote>
      )}

      <Panel>
        <PanelHead label="Buat draf konten" aside={<Sparkles className="size-3.5 text-signal" aria-hidden="true" />} />
        <PanelBody>
          <div className="flex flex-col gap-2">
            <p className="eyebrow">Pasar</p>
            <ChoiceChips
              value={genMarkets.length === markets.length ? 'all' : (genMarkets[0] ?? 'all')}
              options={[{ value: 'all', label: 'Keduanya' }, ...markets.map((m) => ({ value: m.key, label: m.label }))]}
              onChange={(next) => setGenMarkets(next === 'all' ? markets.map((m) => m.key) : [next])}
              label="Pilih pasar"
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="eyebrow">Kanal</p>
            <div className="action-row">
              {channels.map((channel) => (
                <button
                  key={channel.key}
                  type="button"
                  onClick={() => setGenChannels((old) => toggle(old, channel.key))}
                  aria-pressed={genChannels.includes(channel.key)}
                  className={cn(
                    'chip',
                    genChannels.includes(channel.key)
                      ? 'border-signal bg-signal-soft text-signal'
                      : 'border-line bg-surface text-ink-quiet hover:text-ink'
                  )}
                >
                  {channel.label}
                </button>
              ))}
            </div>
          </div>
          <div className="action-row">
            <Button onClick={generate} disabled={busy || genChannels.length === 0 || genMarkets.length === 0}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
              {busy ? 'Menulis…' : 'Buat draf baru'}
            </Button>
            <CountNote>{`${genMarkets.length} pasar · ${genChannels.length} kanal`}</CountNote>
          </div>
          <p className="list-lead">
            Setiap draf dibuat dari produk dan layanan yang benar-benar terbit di katalog Anda. Tidak ada produk, harga,
            atau testimoni yang dikarang.
          </p>
        </PanelBody>
      </Panel>

      <Segmented
        value={tab}
        onChange={setTab}
        label="Tampilan studio"
        options={[
          { value: 'studio', label: `Konten (${posts.length})` },
          { value: 'calendar', label: `Kalender (${scheduled})` },
        ]}
      />

      {tab === 'studio' ? (
        <>
          <div className="flex flex-col gap-2">
            <ChoiceChips
              value={status}
              options={[
                { value: 'all', label: 'Semua status' },
                { value: 'draft', label: 'Draf' },
                { value: 'approved', label: 'Disetujui' },
                { value: 'rejected', label: 'Ditolak' },
              ]}
              onChange={setStatus}
              label="Saring status"
            />
            <div className="action-row">
              <ChoiceChips
                value={market}
                options={[{ value: 'all', label: 'Semua pasar' }, ...markets.map((m) => ({ value: m.key, label: m.label }))]}
                onChange={setMarket}
                label="Saring pasar"
              />
              <ChoiceChips
                value={channel}
                options={[{ value: 'all', label: 'Semua kanal' }, ...channels.map((c) => ({ value: c.key, label: c.short }))]}
                onChange={setChannel}
                label="Saring kanal"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <Panel>
              <EmptyState
                title={posts.length === 0 ? 'Belum ada konten' : 'Tidak ada konten di saringan ini'}
                body={
                  posts.length === 0
                    ? 'Buat draf pertama dari produk dan layanan Anda. Semuanya menunggu persetujuan Anda sebelum dijadwalkan.'
                    : 'Ubah pasar, kanal, atau status untuk melihat konten lain.'
                }
              />
            </Panel>
          ) : (
            <div className="flex flex-col gap-block">
              {filtered.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  open={openId === post.id}
                  busy={busy}
                  onToggle={() => setOpenId((old) => (old === post.id ? null : post.id))}
                  onAct={act}
                  limit={channels.find((c) => c.key === post.channel)?.limit ?? 500}
                  channelName={channelShort(post.channel)}
                  onRefresh={refresh}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <Panel>
          <PanelHead
            label="Kalender 28 hari"
            aside={<CountNote>{`${scheduled} konten terjadwal`}</CountNote>}
          />
          {calendar.length === 0 ? (
            <EmptyState
              title="Belum ada konten terjadwal"
              body="Setujui sebuah draf lalu isi tanggalnya, dan kalender ini akan menampilkan hari-hari yang benar-benar punya jadwal."
            />
          ) : (
          <ul className="divide-y divide-line">
            {calendar.map((day) => (
              <li key={day.date} className="px-page py-block">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[0.8125rem] font-medium text-ink">{day.date}</p>
                  <CountNote>{`${day.items.length} konten`}</CountNote>
                </div>
                {day.items.length > 0 && (
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {day.items.map((post) => (
                      <li key={post.id} className="flex flex-wrap items-center gap-2">
                        <Badge tone="neutral">{channelShort(post.channel)}</Badge>
                        <span className="item-title">{post.headline}</span>
                        <SourceTag source={post.dataSource} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          )}
        </Panel>
      )}

      <Panel>
        <PanelHead label="Cakupan per kanal" />
        <PanelBody>
          {totals.byChannel.length === 0 ? (
            <p className="list-lead">Belum ada konten, jadi belum ada cakupan per kanal.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {totals.byChannel.map((row) => (
                <li key={row.channel} className="flex items-center justify-between gap-2">
                  <span className="text-[0.8125rem] text-ink">{channelShort(row.channel)}</span>
                  <span className="flex items-center gap-3">
                    <CountNote>{`${row.total} konten`}</CountNote>
                    <Badge tone={row.published > 0 ? 'signal' : 'neutral'}>{`${row.published} terbit`}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="list-lead">
            Analitik performa dan pelacakan klik belum ada di tahap ini: angka hanya akan muncul kalau sebuah kanal
            resmi benar-benar melaporkannya atau tautan pelacak kami sendiri mencatat klik.
          </p>
        </PanelBody>
      </Panel>
    </div>
  )
}

function PostCard({
  post,
  open,
  busy,
  onToggle,
  onAct,
  limit,
  channelName,
  onRefresh,
}: {
  post: PostItem
  open: boolean
  busy: boolean
  onToggle: () => void
  onAct: (kind: 'decide' | 'edit' | 'schedule', postId: string, payload: Record<string, unknown>) => void
  limit: number
  channelName: string
  onRefresh: () => Promise<void>
}) {
  const [body, setBody] = useState(post.body)
  const [headline, setHeadline] = useState(post.headline)
  const [schedule, setSchedule] = useState(post.scheduledAt ? post.scheduledAt.slice(0, 16) : '')
  const [reason, setReason] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function upload(file: File) {
    setUploading(true)
    setUploadError(null)
    try {
      const signed = await fetch('/api/social/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sign',
          postId: post.id,
          contentType: file.type,
          size: file.size,
          fileName: file.name,
        }),
      })
      const signedData = await signed.json().catch(() => ({}))
      if (!signed.ok) {
        setUploadError(signedData.error ?? 'Berkas tidak bisa diunggah.')
        return
      }

      const put = await fetch(signedData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!put.ok) {
        setUploadError('Berkas gagal dikirim ke penyimpanan. Coba lagi.')
        return
      }

      const attached = await fetch('/api/social/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'attach', postId: post.id, key: signedData.key, mediaType: signedData.mediaType }),
      })
      const attachedData = await attached.json().catch(() => ({}))
      if (!attached.ok) {
        setUploadError(attachedData.error ?? 'Berkas tidak bisa dilampirkan ke konten ini.')
        return
      }
      await onRefresh()
    } catch {
      setUploadError('Koneksi terputus saat mengunggah berkas. Coba lagi.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Panel>
      <PanelHead
        label={
          <span className="flex flex-wrap items-center gap-2">
            <span>{channelName}</span>
            <span className="text-ink-quiet">·</span>
            <span>{post.market}</span>
          </span>
        }
        aside={
          <span className="flex flex-wrap items-center gap-1.5">
            <SourceTag source={post.dataSource} />
            <Badge tone={STATUS_TONE[post.status] ?? 'neutral'}>{STATUS_LABEL[post.status] ?? post.status}</Badge>
          </span>
        }
      />
      <PanelBody>
        <div className="flex flex-col gap-1">
          <p className="item-title">{post.headline}</p>
          <p className="list-lead whitespace-pre-wrap">{post.body}</p>
          <p className="text-[0.6875rem] text-ink-quiet">
            {post.sourceName ? `Dari: ${post.sourceName} · ` : ''}
            {post.source.startsWith('ai:') ? `Ditulis ${post.source.slice(3)}` : 'Ditulis dari pola dasar'}
            {post.scheduledAt ? ` · jadwal ${dateTime(post.scheduledAt)}` : ''}
          </p>
        </div>

        <div className="action-row">
          <Badge tone={PUBLISH_TONE[post.publishState] ?? 'neutral'}>
            {PUBLISH_LABEL[post.publishState] ?? post.publishState}
          </Badge>
          {post.externalUrl && (
            <a href={post.externalUrl} className="link-signal" rel="noreferrer noopener" target="_blank">
              Lihat kiriman
            </a>
          )}
        </div>

        {post.publishNote && <p className="list-lead">{post.publishNote}</p>}
        {post.decisionNote && <p className="list-lead">Catatan Anda: {post.decisionNote}</p>}

        {post.mediaUrl ? (
          post.mediaType === 'video' ? (
            <video src={post.mediaUrl} controls className="inset-box max-h-64 w-full" />
          ) : (
            <img src={post.mediaUrl} alt={post.headline} className="max-h-64 w-full rounded-md border border-line object-cover" />
          )
        ) : post.channel === 'instagram' ? (
          <p className="list-lead">Belum ada foto atau video. Instagram resmi tidak menerima kiriman tanpa berkas.</p>
        ) : null}

        {post.publishState !== 'published' && (
          <label className="flex flex-col gap-1">
            <span className="eyebrow">{post.mediaUrl ? 'Ganti lampiran' : 'Lampirkan foto atau video'}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
              disabled={busy || uploading}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void upload(file)
                event.target.value = ''
              }}
              className="text-[0.75rem] text-ink-quiet file:mr-2 file:min-h-8 file:rounded-md file:border file:border-line file:bg-surface file:px-2 file:text-xs file:font-medium file:text-ink"
            />
            <span className="list-lead">JPG, PNG, WebP, MP4, atau MOV. Maksimal 40 MB.</span>
          </label>
        )}
        {uploadError && (
          <InlineNote tone="danger">
            <span role="alert">{uploadError}</span>
          </InlineNote>
        )}

        <div className="action-row">
          <Button size="sm" variant="secondary" onClick={onToggle}>
            {open ? 'Tutup' : post.status === 'draft' ? 'Tinjau & setujui' : 'Atur jadwal'}
          </Button>
        </div>

        {open && (
          <div className="inset-block flex flex-col gap-stack">
            {post.status !== 'approved' && (
              <>
                <Field label="Judul singkat">
                  <Input value={headline} onChange={(e) => setHeadline(e.target.value)} />
                </Field>
                <Field label="Isi konten" hint={`${body.length} dari ${limit} karakter untuk ${channelName}.`} error={body.length > limit ? 'Terlalu panjang untuk kanal ini.' : undefined}>
                  <Textarea rows={7} value={body} onChange={(e) => setBody(e.target.value)} />
                </Field>
                <div className="action-row">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy || body.length > limit || body.trim().length < 10}
                    onClick={() => onAct('edit', post.id, { headline, body })}
                  >
                    Simpan perubahan
                  </Button>
                </div>
              </>
            )}

            {post.status === 'draft' && (
              <>
                <Field label="Jadwalkan (opsional)" hint="Kosongkan bila belum yakin. Kalender mengikuti tanggal ini.">
                  <Input type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
                </Field>
                <Field label="Catatan persetujuan (opsional)">
                  <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Misalnya: ganti harga dulu" />
                </Field>
                <div className="action-row">
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      onAct('decide', post.id, {
                        decision: 'approved',
                        note: reason || undefined,
                        scheduledAt: schedule ? new Date(schedule).toISOString() : null,
                      })
                    }
                  >
                    <Check className="size-3.5" aria-hidden="true" />
                    Setujui
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busy}
                    onClick={() => onAct('decide', post.id, { decision: 'rejected', note: reason || undefined })}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                    Tolak
                  </Button>
                </div>
                <p className="list-lead">
                  Menyetujui tidak mengunggah apa pun. Konten hanya terbit setelah akun kanal resmi terhubung dan
                  mengonfirmasi kirimannya.
                </p>
              </>
            )}

            {post.status === 'approved' && (
              <>
                <Field label="Jadwal publikasi" hint="Tanggal dan jam yang Anda pilih muncul di kalender.">
                  <Input type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
                </Field>
                <div className="action-row">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => onAct('schedule', post.id, { scheduledAt: schedule ? new Date(schedule).toISOString() : null })}
                  >
                    <CalendarClock className="size-3.5" aria-hidden="true" />
                    Simpan jadwal
                  </Button>
                  {post.scheduledAt && (
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAct('schedule', post.id, { scheduledAt: null })}>
                      Lepas jadwal
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </PanelBody>
    </Panel>
  )
}
