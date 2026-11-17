import { useState } from 'react'
import { AlertTriangle, Camera, CheckCircle2, ChevronDown, Loader2, LogOut, RefreshCw } from 'lucide-react'
import { Badge, Button, CopyValue, CountNote, EmptyState, InlineNote, Notice, Panel, PanelBody, PanelHead, Stat } from '@/components/ui'
import { cn } from '@/lib/utils'
import { dateTime } from '@/lib/format'
import type { PublishRow } from '@/components/FacebookConnect'

export type LinkedInstagram = {
  id: string
  username: string
  pageId: string | null
  status: string
  connectedAt: string
  lastCheckedAt: string | null
  lastError: string | null
}

/**
 * The Instagram connection surface. Two layers, the same shape as the Facebook page:
 * status and the one action that matters first, then the numbered setup guide.
 * It never shows a token, and only reads "connected" when an account is stored and
 * Meta has accepted it.
 */
export function InstagramConnect({
  configured,
  redirectUri,
  account,
  pageName,
  pageConnected,
  posts,
  configError,
  performance,
}: {
  configured: boolean
  redirectUri: string
  account: LinkedInstagram | null
  pageName: string | null
  pageConnected: boolean
  posts: PublishRow[]
  configError: string | null
  performance: { clicks: number; leads: number; sales: number; salesIdr: number }
}) {
  const [busy, setBusy] = useState(false)
  const [test, setTest] = useState<{ state: string; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guideOpen, setGuideOpen] = useState(!configured || !account)

  async function connect() {
    setBusy(true)
    setError(null)
    setTest(null)
    try {
      const response = await fetch('/api/social/instagram/connect', { method: 'POST' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Akun Instagram belum bisa dihubungkan.')
        return
      }
      window.location.reload()
    } catch {
      setError('Koneksi terputus. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  async function check() {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/social/instagram/account', {
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
      setBusy(false)
    }
  }

  async function disconnect() {
    setBusy(true)
    setError(null)
    try {
      await fetch('/api/social/instagram/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' }),
      })
      window.location.reload()
    } catch {
      setError('Koneksi terputus. Coba lagi.')
      setBusy(false)
    }
  }

  const state =
    test ??
    (account
      ? {
          state: account.status === 'connected' ? 'ready' : 'invalid',
          message:
            account.lastError ??
            'Akun tersimpan. Tekan Uji koneksi untuk memastikan Meta masih menerima tokennya.',
        }
      : { state: 'missing', message: 'Belum ada akun Instagram Bisnis yang terhubung.' })
  const tone = state.state === 'ready' ? 'signal' : state.state === 'missing' ? 'hold' : 'danger'

  const published = posts.filter((post) => post.publishState === 'published').length

  return (
    <div className="flex flex-col gap-stack">
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
        <PanelHead
          label="Status koneksi"
          aside={
            <Badge tone={tone}>
              {state.state === 'ready' ? 'Terhubung' : state.state === 'missing' ? 'Belum terhubung' : 'Perlu diperbaiki'}
            </Badge>
          }
        />
        <PanelBody>
          <div className="flex items-start gap-2">
            <Camera className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[0.9375rem] font-medium text-ink">
                {account ? account.username : 'Belum ada akun Instagram terhubung'}
              </p>
              <p className="list-lead mt-0.5">{state.message}</p>
            </div>
          </div>

          {account && (
            <dl className="flex flex-wrap gap-x-4 gap-y-1">
              <div className="flex items-baseline gap-1.5">
                <dt className="eyebrow">ID akun</dt>
                <dd className="font-mono text-[0.6875rem] text-ink-quiet">{account.id}</dd>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dt className="eyebrow">Halaman induk</dt>
                <dd className="text-[0.6875rem] text-ink-quiet">{pageName ?? account.pageId ?? '—'}</dd>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dt className="eyebrow">Dihubungkan</dt>
                <dd className="text-[0.6875rem] text-ink-quiet">{dateTime(account.connectedAt)}</dd>
              </div>
              {account.lastCheckedAt && (
                <div className="flex items-baseline gap-1.5">
                  <dt className="eyebrow">Diperiksa</dt>
                  <dd className="text-[0.6875rem] text-ink-quiet">{dateTime(account.lastCheckedAt)}</dd>
                </div>
              )}
            </dl>
          )}

          <div className="action-row">
            {!configured ? (
              <span className="list-lead">Isi App ID dan App Secret lebih dulu — panduannya ada di bawah.</span>
            ) : account ? (
              <>
                <Button size="sm" variant="secondary" onClick={check} disabled={busy}>
                  {busy ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw className="size-3.5" aria-hidden="true" />
                  )}
                  Uji koneksi
                </Button>
                <Button size="sm" variant="danger" onClick={disconnect} disabled={busy}>
                  <LogOut className="size-3.5" aria-hidden="true" />
                  Lepas
                </Button>
              </>
            ) : (
              <Button onClick={connect} disabled={busy || !pageConnected}>
                {busy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                )}
                {busy ? 'Menghubungkan…' : 'Hubungkan Instagram'}
              </Button>
            )}
          </div>

          {!account && !pageConnected && (
            <p className="list-lead">
              Akun Instagram Bisnis selalu tertaut ke satu Halaman Facebook. Hubungkan Halaman Facebook Anda lebih dulu
              di menu Facebook Page, lalu kembali ke sini.
            </p>
          )}

          <p className="list-lead">
            Instagram memakai token Halaman Facebook yang sudah Anda izinkan, disimpan terenkripsi di server dan tidak
            pernah dikirim ke browser. Konten baru disebut terbit setelah Meta mengembalikan nomor kiriman.
          </p>
        </PanelBody>
      </Panel>

      {!configured && (
        <Notice tone="hold" icon={<AlertTriangle className="warn-icon" aria-hidden="true" />}>
          <p className="note-text">
            Meta App ID dan App Secret belum diisi, jadi Instagram belum bisa dihubungkan. Panduan lengkapnya ada di
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
                  'Ubah akun Instagram Anda menjadi akun Bisnis atau Creator, lalu tautkan ke Halaman Facebook Anda melalui aplikasi Instagram (Pengaturan → Akun → Bagikan ke halaman).',
                  'Di developers.facebook.com, buka aplikasi Business yang sama dengan yang dipakai halaman Facebook.',
                  'Tambahkan produk Instagram Graph API, lalu isi Valid OAuth Redirect URI dengan alamat di bawah.',
                  'Minta izin ini: instagram_basic, instagram_content_publish, pages_show_list, pages_manage_posts.',
                  'Isi META_APP_ID dan META_APP_SECRET di layar publikasi, publikasikan ulang, lalu hubungkan Halaman Facebook Anda lebih dulu.',
                  'Kembali ke halaman ini dan tekan Hubungkan Instagram. Selama aplikasi Meta masih mode Development, hanya akun penguji yang bisa memakai izin ini.',
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
                Alamat ini sama dengan yang dipakai Halaman Facebook — satu aplikasi Meta melayani keduanya. Bila domain
                aplikasi Anda berubah, perbarui juga di dasbor Meta.
              </p>
            </div>

            <p className="list-lead">
              Instagram resmi hanya menerima kiriman yang berisi foto atau video, jadi lampirkan berkasnya pada konten
              sebelum dijadwalkan. Meta mengambil berkas itu sendiri dari tautan sementara yang dibuat aplikasi ini.
            </p>
          </PanelBody>
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
            Klik dihitung hanya saat tautan pelacak dibuka, dan penjualan hanya untuk pesanan yang pemilik sudah verifikasi transfernya
            sudah konfirmasi. Jangkauan dan tayangan tidak ditampilkan karena Meta belum melaporkannya ke aplikasi ini.
          </p>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHead label="Konten Instagram" aside={<CountNote>{`${published} terbit`}</CountNote>} />
        {posts.length === 0 ? (
          <EmptyState
            title="Belum ada konten untuk Instagram"
            body="Buat draf di Studio konten sosial dengan kanal Instagram Bisnis, lampirkan foto atau video, setujui, lalu jadwalkan waktunya."
          />
        ) : (
          <ul className="divide-y divide-line">
            {posts.map((post) => (
              <li key={post.id} className="row-line">
                <div className="min-w-0">
                  <p className="item-title">{post.headline}</p>
                  <p className="list-lead mt-0.5">
                    {post.publishedAt
                      ? `Terbit ${dateTime(post.publishedAt)}`
                      : post.scheduledAt
                        ? `Jadwal ${dateTime(post.scheduledAt)}`
                        : 'Belum dijadwalkan'}
                  </p>
                  {post.publishNote && (
                    <p className="mt-0.5 text-[0.6875rem] leading-relaxed text-ink-quiet">{post.publishNote}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Badge
                    tone={post.publishState === 'published' ? 'signal' : post.publishState === 'failed' ? 'danger' : 'hold'}
                  >
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
    </div>
  )
}
