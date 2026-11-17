import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  LogOut,
  RefreshCw,
  Share2 as FacebookIcon,
} from 'lucide-react'
import { Badge, Button, CopyValue, CountNote, EmptyState, InlineNote, Notice, Panel, PanelBody, PanelHead, Stat } from '@/components/ui'
import { cn } from '@/lib/utils'
import { dateTime } from '@/lib/format'

export type LinkedPage = {
  id: string
  name: string
  status: string
  connectedAt: string
  lastCheckedAt: string | null
  lastError: string | null
  tokenExpiresAt: string | null
}

export type PageCandidate = { id: string; name: string; category: string | null }

export type PublishRow = {
  id: string
  headline: string
  publishState: string
  publishNote: string | null
  externalId: string | null
  externalUrl: string | null
  publishedAt: string | null
  scheduledAt: string | null
}

export function FacebookConnect({
  configured,
  appId,
  redirectUri,
  page,
  pages,
  chooseMode,
  posts,
  configError,
  connected,
  performance,
}: {
  configured: boolean
  appId: string
  redirectUri: string
  page: LinkedPage | null
  pages: PageCandidate[]
  chooseMode: boolean
  posts: PublishRow[]
  configError: string | null
  connected: boolean
  performance: { clicks: number; leads: number; sales: number; salesIdr: number }
}) {
  const [checking, setChecking] = useState(false)
  const [test, setTest] = useState<{ state: string; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guideOpen, setGuideOpen] = useState(!configured)
  const [choice, setChoice] = useState<string>(pages[0]?.id ?? '')
  const [saving, setSaving] = useState(false)

  async function checkConnection() {
    setChecking(true)
    setError(null)
    try {
      const response = await fetch('/api/social/meta/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check' }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Pemeriksaan gagal.')
        return
      }
      setTest(data.result)
    } catch {
      setError('Koneksi terputus. Coba lagi.')
    } finally {
      setChecking(false)
    }
  }

  async function disconnect() {
    setChecking(true)
    setError(null)
    try {
      await fetch('/api/social/meta/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' }),
      })
      window.location.href = '/facebook'
    } catch {
      setError('Koneksi terputus. Coba lagi.')
      setChecking(false)
    }
  }

  async function pickPage() {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/social/meta/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: choice }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Halaman tidak bisa disimpan.')
        return
      }
      window.location.href = '/facebook?connected=1'
    } catch {
      setError('Koneksi terputus. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  const state = test ?? (page ? { state: page.status === 'connected' ? 'ready' : 'invalid', message: page.lastError ?? 'Halaman tersimpan. Tekan Uji koneksi untuk memastikan tokennya masih berlaku.' } : { state: 'missing', message: 'Belum ada halaman Facebook yang terhubung.' })
  const tone = state.state === 'ready' ? 'signal' : state.state === 'missing' ? 'hold' : 'danger'

  return (
    <div className="flex flex-col gap-stack">
      {connected && (
        <InlineNote tone="signal">
          <span className="flex items-start gap-1.5">
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Halaman Facebook berhasil dihubungkan.
          </span>
        </InlineNote>
      )}
      {configError && (
        <InlineNote tone="danger">
          <span role="alert">{configError}</span>
        </InlineNote>
      )}
      {error && (
        <InlineNote tone="danger">
          <span role="alert">{error}</span>
        </InlineNote>
      )}

      <Panel>
        <PanelHead label="Status koneksi" aside={<Badge tone={tone}>{state.state === 'ready' ? 'Terhubung' : state.state === 'missing' ? 'Belum terhubung' : 'Perlu diperbaiki'}</Badge>} />
        <PanelBody>
          <div className="flex items-start gap-2">
            <FacebookIcon className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[0.9375rem] font-medium text-ink">{page ? page.name : 'Belum ada halaman terhubung'}</p>
              <p className="list-lead mt-0.5">{state.message}</p>
            </div>
          </div>

          {page && (
            <dl className="flex flex-wrap gap-x-4 gap-y-1">
              <div className="flex items-baseline gap-1.5">
                <dt className="eyebrow">ID halaman</dt>
                <dd className="font-mono text-[0.6875rem] text-ink-quiet">{page.id}</dd>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dt className="eyebrow">Dihubungkan</dt>
                <dd className="text-[0.6875rem] text-ink-quiet">{dateTime(page.connectedAt)}</dd>
              </div>
              {page.lastCheckedAt && (
                <div className="flex items-baseline gap-1.5">
                  <dt className="eyebrow">Diperiksa</dt>
                  <dd className="text-[0.6875rem] text-ink-quiet">{dateTime(page.lastCheckedAt)}</dd>
                </div>
              )}
            </dl>
          )}

          <div className="action-row">
            {!configured ? (
              <span className="list-lead">Isi App ID dan App Secret lebih dulu — panduannya ada di bawah.</span>
            ) : page ? (
              <>
                <Button size="sm" variant="secondary" onClick={checkConnection} disabled={checking}>
                  {checking ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-3.5" aria-hidden="true" />}
                  Uji koneksi
                </Button>
                <a href="/api/social/meta/start" className="link-signal">
                  Ganti halaman
                </a>
                <Button size="sm" variant="danger" onClick={disconnect} disabled={checking}>
                  <LogOut className="size-3.5" aria-hidden="true" />
                  Lepas
                </Button>
              </>
            ) : (
              <a href="/api/social/meta/start">
                <Button>
                  <FacebookIcon className="size-4" aria-hidden="true" />
                  Hubungkan Facebook
                </Button>
              </a>
            )}
          </div>

          <p className="list-lead">
            Token halaman disimpan terenkripsi di server dan tidak pernah dikirim ke browser. Konten hanya terbit setelah
            Meta mengembalikan nomor kiriman.
          </p>
        </PanelBody>
      </Panel>

      {chooseMode && (
        <Panel>
          <PanelHead label="Pilih halaman" aside={<CountNote>{`${pages.length} halaman`}</CountNote>} />
          {pages.length === 0 ? (
            <EmptyState
              title="Tidak ada halaman dalam izin ini"
              body="Pastikan akun yang Anda masukkan mengelola Halaman Facebook, lalu ulangi penghubungan."
            />
          ) : (
            <PanelBody>
              <ul className="flex flex-col gap-1.5">
                {pages.map((option) => (
                  <li key={option.id}>
                    <label className="inset-block flex items-start gap-2">
                      <input
                        type="radio"
                        name="page"
                        value={option.id}
                        checked={choice === option.id}
                        onChange={() => setChoice(option.id)}
                        className="mt-0.5 size-4 shrink-0 accent-signal"
                      />
                      <span className="min-w-0">
                        <span className="block text-[0.8125rem] font-medium text-ink">{option.name}</span>
                        <span className="block font-mono text-[0.625rem] text-ink-quiet">
                          {option.id}
                          {option.category ? ` · ${option.category}` : ''}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="action-row">
                <Button onClick={pickPage} disabled={saving || !choice}>
                  {saving ? 'Menyimpan…' : 'Pakai halaman ini'}
                </Button>
              </div>
            </PanelBody>
          )}
        </Panel>
      )}

      {!configured && (
        <Notice tone="hold" icon={<AlertTriangle className="warn-icon" aria-hidden="true" />}>
          <p className="note-text">
            Meta App ID dan App Secret belum diisi, jadi tombol Hubungkan belum bisa dipakai. Panduan lengkapnya ada di
            bawah.
          </p>
        </Notice>
      )}

      <Panel>
        <PanelHead
          label="Panduan konfigurasi Meta"
          aside={
            <Button size="sm" variant="ghost" onClick={() => setGuideOpen((value) => !value)}>
              <ChevronDown className={cn('size-3.5 transition-transform', guideOpen && 'rotate-180')} aria-hidden="true" />
              {guideOpen ? 'Sembunyikan' : 'Cara mengisi'}
            </Button>
          }
        />
        {guideOpen && (
          <PanelBody>
            <div>
              <p className="eyebrow mb-1">Yang perlu Anda isi</p>
              <ul className="flex flex-col gap-1">
                <li className="value-line">META_APP_ID (wajib)</li>
                <li className="value-line">META_APP_SECRET (wajib)</li>
                <li className="value-line">META_GRAPH_VERSION (opsional)</li>
              </ul>
            </div>

            <div>
              <p className="eyebrow mb-1">Langkahnya</p>
              <ol className="flex flex-col gap-1.5">
                {[
                  'Buka developers.facebook.com, buat aplikasi bertipe Business.',
                  'Di menu Pengaturan → Dasar, salin App ID dan App Secret aplikasi itu.',
                  'Tambahkan produk Facebook Login, lalu isi Valid OAuth Redirect URI dengan alamat di bawah.',
                  'Minta izin ini: pages_show_list, pages_read_engagement, pages_manage_posts, business_management.',
                  'Isi META_APP_ID dan META_APP_SECRET di layar publikasi aplikasi ini, lalu publikasikan ulang.',
                  'Kembali ke halaman ini dan tekan Hubungkan Facebook. Selama aplikasi Meta Anda masih mode Development, hanya akun yang Anda daftarkan sebagai penguji yang bisa menghubungkan halaman.',
                ].map((step, index) => (
                  <li key={step} className="flex gap-2 text-xs leading-relaxed text-ink-quiet">
                    <span className="mt-px flex size-4 shrink-0 items-center justify-center rounded-full bg-canvas font-mono text-[0.5625rem]">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <CopyValue label="OAuth Redirect URI untuk dasbor Meta" value={redirectUri} copyLabel="Salin alamat callback" />
              <p className="list-lead mt-1">
                Tempel persis seperti itu di menu Facebook Login → Settings. Bila alamat aplikasi Anda berubah, perbarui
                juga di dasbor Meta. Setelah aplikasi dipublikasikan, alamat ini memakai domain aplikasi Anda — salin
                ulang dari halaman ini saat itu.
              </p>
            </div>

            {appId && (
              <div>
                <p className="eyebrow mb-1">App ID yang sedang dipakai</p>
                <p className="font-mono text-[0.6875rem] text-ink">{appId}</p>
              </div>
            )}

            <p className="list-lead">
              App Secret hanya dipakai server dan tidak pernah ditampilkan di aplikasi ini. Jangan pernah menempelkan
              token contoh — halaman baru disebut terhubung setelah Meta benar-benar menerima izin Anda.
            </p>
          </PanelBody>
        )}
      </Panel>

      <Panel>
        <PanelHead label="Konten yang sudah dikirim ke Facebook" aside={<CountNote>{`${posts.filter((post) => post.publishState === 'published').length} terbit`}</CountNote>} />
        {posts.length === 0 ? (
          <EmptyState
            title="Belum ada konten untuk Facebook"
            body="Buat draf di Studio konten sosial dengan kanal Facebook, setujui, lalu jadwalkan waktunya."
          />
        ) : (
          <ul className="divide-y divide-line">
            {posts.map((post) => (
              <li key={post.id} className="row-line">
                <div className="min-w-0">
                  <p className="item-title">{post.headline}</p>
                  <p className="list-lead mt-0.5">
                    {post.publishedAt ? `Terbit ${dateTime(post.publishedAt)}` : post.scheduledAt ? `Jadwal ${dateTime(post.scheduledAt)}` : 'Belum dijadwalkan'}
                  </p>
                  {post.publishNote && <p className="mt-0.5 text-[0.6875rem] leading-relaxed text-ink-quiet">{post.publishNote}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Badge tone={post.publishState === 'published' ? 'signal' : post.publishState === 'failed' ? 'danger' : 'hold'}>
                    {post.publishState === 'published' ? 'Terbit' : post.publishState === 'failed' ? 'Gagal' : 'Belum terbit'}
                  </Badge>
                  {post.externalUrl && (
                    <a href={post.externalUrl} className="link-signal" target="_blank" rel="noreferrer noopener">
                      Lihat kiriman
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <PanelHead label="Hasil yang tercatat dari konten" />
        <PanelBody>
          <div className="grid grid-cols-3 gap-stack">
            <Stat label="Klik" value={String(performance.clicks)} context="saat tautan dibuka" />
            <Stat label="Leads" value={String(performance.leads)} context="dari kanal sosial" />
            <Stat label="Penjualan" value={String(performance.sales)} context="pesanan lunas lewat tautan" tone="signal" />
          </div>
          <p className="list-lead">
            Angka ini hanya dari catatan aplikasi sendiri: klik dihitung saat tautan dibuka, dan penjualan dihitung
            hanya untuk pesanan yang pemilik sudah memverifikasi transfer. Jangkauan dan tayangan tidak ditampilkan
            karena Meta belum melaporkannya ke aplikasi ini.
          </p>
        </PanelBody>
      </Panel>
    </div>
  )
}
