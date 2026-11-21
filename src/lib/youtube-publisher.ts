import { eq, and } from 'drizzle-orm'
import { db } from './db'
import { socialAccounts, socialPosts } from './db/schema'
import { getFile } from './storage'
import { openSocialToken, sealSocialToken } from './social-token-vault'

type StoredToken = {
  accessToken: string
  refreshToken?: string | null
  tokenType?: string
}

type PublishResult = { ok: true; videoId: string; url: string } | { ok: false; reason: string }

async function refreshYouTubeToken(account: typeof socialAccounts.$inferSelect, stored: StoredToken): Promise<StoredToken | null> {
  if (!stored.refreshToken) return null
  const body = new URLSearchParams({
    client_id: process.env.YOUTUBE_CLIENT_ID || '',
    client_secret: process.env.YOUTUBE_CLIENT_SECRET || '',
    refresh_token: stored.refreshToken,
    grant_type: 'refresh_token',
  })
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data.access_token) {
    await db.update(socialAccounts).set({
      status: 'reauthorization_required',
      lastError: 'Google tidak dapat memperbarui izin YouTube. Hubungkan ulang akun.',
      lastCheckedAt: new Date(),
    }).where(eq(socialAccounts.id, account.id))
    return null
  }
  const updated = { ...stored, accessToken: String(data.access_token) }
  await db.update(socialAccounts).set({
    tokenSealed: sealSocialToken(updated),
    tokenExpiresAt: data.expires_in ? new Date(Date.now() + Number(data.expires_in) * 1000) : null,
    lastCheckedAt: new Date(),
    lastError: null,
  }).where(eq(socialAccounts.id, account.id))
  return updated
}

export async function publishToYouTube(post: typeof socialPosts.$inferSelect): Promise<PublishResult> {
  if (!post.mediaKey || !post.mediaType?.startsWith('video/')) {
    return { ok: false, reason: 'YouTube membutuhkan berkas video yang dilampirkan ke draf.' }
  }
  const [account] = await db.select().from(socialAccounts).where(and(
    eq(socialAccounts.channel, 'youtube'),
    eq(socialAccounts.status, 'connected'),
  )).limit(1)
  if (!account) return { ok: false, reason: 'Akun YouTube belum terhubung.' }

  try {
    let stored = openSocialToken<StoredToken>(account.tokenSealed)
    if (account.tokenExpiresAt && account.tokenExpiresAt.getTime() < Date.now() + 60_000) {
      const refreshed = await refreshYouTubeToken(account, stored)
      if (!refreshed) return { ok: false, reason: 'Izin YouTube perlu dihubungkan ulang.' }
      stored = refreshed
    }

    const media = await getFile(post.mediaKey)
    if (!media) return { ok: false, reason: 'Berkas video tidak ditemukan di penyimpanan.' }
    if (!media.contentType.startsWith('video/')) return { ok: false, reason: 'Berkas yang dilampirkan bukan video.' }

    const origin = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.RAILWAY_PUBLIC_DOMAIN ? 'https://' + process.env.RAILWAY_PUBLIC_DOMAIN.replace(/^https?:\/\//, '').split('/')[0] : '')
    const productPath = post.sourceType === 'product' ? '/toko' : post.sourceType === 'service' ? '/jasa' : '/'
    const productLink = origin ? new URL(productPath, origin).toString() : ''
    const description = [post.body.trim(), productLink ? 'Lihat katalog dan layanan perusahaan: ' + productLink : ''].filter(Boolean).join('\n\n').slice(0, 5000)
    const privacyStatus = process.env.YOUTUBE_DEFAULT_PRIVACY_STATUS === 'public' || process.env.YOUTUBE_DEFAULT_PRIVACY_STATUS === 'private'
      ? process.env.YOUTUBE_DEFAULT_PRIVACY_STATUS
      : 'unlisted'

    const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + stored.accessToken,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': media.contentType,
        'X-Upload-Content-Length': String(media.data.byteLength),
      },
      body: JSON.stringify({
        snippet: {
          title: post.headline.trim().slice(0, 100),
          description,
          categoryId: '22',
        },
        status: { privacyStatus, selfDeclaredMadeForKids: false },
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(30000),
    })
    if (!init.ok) {
      const error = await init.text().catch(() => '')
      return { ok: false, reason: 'YouTube gagal memulai upload (' + init.status + '): ' + error.slice(0, 400) }
    }
    const uploadUrl = init.headers.get('location')
    if (!uploadUrl) return { ok: false, reason: 'YouTube tidak mengembalikan alamat upload resumable.' }

    const uploaded = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': media.contentType, 'Content-Length': String(media.data.byteLength) },
      body: media.data,
      cache: 'no-store',
      signal: AbortSignal.timeout(120000),
    })
    const result = await uploaded.json().catch(() => ({}))
    if (!uploaded.ok || !result.id) {
      return { ok: false, reason: 'Upload video YouTube belum berhasil dikonfirmasi (' + uploaded.status + ').' }
    }
    return { ok: true, videoId: String(result.id), url: 'https://www.youtube.com/watch?v=' + encodeURIComponent(String(result.id)) }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'Publikasi YouTube gagal.' }
  }
}
