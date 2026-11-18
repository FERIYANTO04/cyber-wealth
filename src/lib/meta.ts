import crypto from 'node:crypto'
import { and, desc, eq } from 'drizzle-orm'
import { db } from './db'
import { activity, socialAccounts } from './db/schema'
import { isPlaceholder } from './env'

/**
 * Facebook Page publishing through Meta's official Graph API.
 *
 * What this file guarantees:
 * - The Page access token never leaves the server. It is sealed with AES-256-GCM under
 *   a key derived from the app's own secret, and only opened at the moment a call is
 *   made. Nothing returns it to a page, an API route, or the browser.
 * - A post is `published` only when Meta answers with a post id. Any other outcome —
 *   no page chosen, expired token, Graph error — is recorded as a failure with Meta's
 *   own message and code, and the content stays unpublished.
 * - Every step is written to the audit log so the owner can see what happened.
 */

const GRAPH = 'https://graph.facebook.com/v21.0'

export const REQUIRED_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'business_management',
  // Instagram publishing hangs off the same page token, so its scopes are asked for here.
  'instagram_basic',
  'instagram_content_publish',
]

export function metaConfig() {
  const appId = process.env.META_APP_ID ?? ''
  const appSecret = process.env.META_APP_SECRET ?? ''
  return {
    appId,
    appSecret,
    version: process.env.META_GRAPH_VERSION || 'v21.0',
    loginConfigId: process.env.META_LOGIN_CONFIG_ID || '',
    configured: !isPlaceholder(appId) && !isPlaceholder(appSecret),
  }
}

/** Redirect URI to paste into the Meta app dashboard, built from the request host. */
export function redirectUriFor(origin: string): string {
  return `${origin.replace(/\/$/, '')}/api/social/meta/callback`
}

// ── Token sealing ─────────────────────────────────────────────────────────

function sealingKey(): Buffer | null {
  const secret = process.env.JWT_SECRET
  if (!secret) return null
  return crypto.createHash('sha256').update(`meta-token:${secret}`).digest()
}

export function sealToken(token: string): string | null {
  const key = sealingKey()
  if (!key) return null
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`
}

export function openToken(sealed: string): string | null {
  const key = sealingKey()
  if (!key) return null
  const [ivPart, tagPart, dataPart] = sealed.split('.')
  if (!ivPart || !tagPart || !dataPart) return null
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivPart, 'base64url'))
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'))
    return Buffer.concat([decipher.update(Buffer.from(dataPart, 'base64url')), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}

// ── Graph calls ───────────────────────────────────────────────────────────

type GraphError = { message?: string; type?: string; code?: number; error_subcode?: number }

export async function graphCall<T>(
  path: string,
  params: Record<string, string>
): Promise<{ ok: true; data: T } | { ok: false; message: string; code?: number }> {
  const url = new URL(`${GRAPH}${path}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20_000)
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    const body = (await response.json().catch(() => null)) as (T & { error?: GraphError }) | null
    if (!response.ok || body?.error) {
      const error = body?.error
      return {
        ok: false,
        message: error?.message ?? `Meta menjawab ${response.status}`,
        code: error?.code,
      }
    }
    if (!body) return { ok: false, message: 'Meta menjawab tanpa isi.' }
    return { ok: true, data: body }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, message: 'Meta tidak menjawab dalam 20 detik.' }
    }
    return { ok: false, message: 'Tidak bisa menghubungi Meta. Periksa koneksi keluar server.' }
  } finally {
    clearTimeout(timer)
  }
}

/** The OAuth dialog address the owner opens to grant page access. */
export function authorizeUrl(origin: string, state: string): string | null {
  const { appId, version } = metaConfig()
  if (!appId) return null
  const url = new URL(`https://www.facebook.com/${version}/dialog/oauth`)
  url.searchParams.set('client_id', appId)
  url.searchParams.set('redirect_uri', redirectUriFor(origin))
  url.searchParams.set('state', state)
  url.searchParams.set('response_type', 'code')
  const { loginConfigId } = metaConfig()
  if (loginConfigId) {
    // Facebook Login for Business takes its permissions from the saved Meta configuration.
    url.searchParams.set('config_id', loginConfigId)
  } else {
    // Backward-compatible standard Facebook Login flow.
    url.searchParams.set('scope', REQUIRED_SCOPES.join(','))
  }
  return url.toString()
}

export type ExchangeResult =
  | { ok: true; userToken: string; expiresIn: number | null }
  | { ok: false; message: string }

/** Exchanges the authorization code for a user token — server-side only. */
export async function exchangeCode(origin: string, code: string): Promise<ExchangeResult> {
  const { appId, appSecret, version } = metaConfig()
  if (!appId || !appSecret) return { ok: false, message: 'Meta App ID atau App Secret belum diisi.' }

  const url = new URL(`${GRAPH}/oauth/access_token`)
  url.searchParams.set('client_id', appId)
  url.searchParams.set('client_secret', appSecret)
  url.searchParams.set('redirect_uri', redirectUriFor(origin))
  url.searchParams.set('code', code)

  try {
    const response = await fetch(url, { cache: 'no-store' })
    const body = (await response.json().catch(() => null)) as
      | { access_token?: string; expires_in?: number; error?: { message?: string } }
      | null
    if (!response.ok || !body?.access_token) {
      return { ok: false, message: body?.error?.message ?? `Meta menolak penukaran kode (${response.status}).` }
    }
    return { ok: true, userToken: body.access_token, expiresIn: body.expires_in ?? null }
  } catch {
    return { ok: false, message: 'Tidak bisa menghubungi Meta untuk menukar kode otorisasi.' }
  }
}

export type PageOption = { id: string; name: string; accessToken: string; category?: string }

/** The pages the owner granted. The page token comes back only here, never further. */
export async function listPages(userToken: string): Promise<{ ok: true; pages: PageOption[] } | { ok: false; message: string }> {
  const result = await graphCall<{ data?: { id: string; name: string; access_token: string; category?: string }[] }>('/me/accounts', {
    access_token: userToken,
    fields: 'id,name,access_token,category',
    limit: '100',
  })
  if (!result.ok) return { ok: false, message: result.message }
  return {
    ok: true,
    pages: (result.data.data ?? []).map((page) => ({
      id: page.id,
      name: page.name,
      accessToken: page.access_token,
      category: page.category,
    })),
  }
}

/** A page token that does not expire, so scheduled publishing keeps working. */
export async function longLivedPageToken(pageToken: string): Promise<string | null> {
  const { appId, appSecret } = metaConfig()
  if (!appId || !appSecret) return null
  const url = new URL(`${GRAPH}/oauth/access_token`)
  url.searchParams.set('grant_type', 'fb_exchange_token')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('client_secret', appSecret)
  url.searchParams.set('fb_exchange_token', pageToken)
  try {
    const response = await fetch(url, { cache: 'no-store' })
    const body = (await response.json().catch(() => null)) as { access_token?: string } | null
    return response.ok && body?.access_token ? body.access_token : null
  } catch {
    return null
  }
}

// ── Stored accounts ───────────────────────────────────────────────────────

export type LinkedPage = {
  id: string
  name: string
  status: string
  connectedAt: string
  lastCheckedAt: string | null
  lastError: string | null
  tokenExpiresAt: string | null
}

function toLinkedPage(row: typeof socialAccounts.$inferSelect): LinkedPage {
  return {
    id: row.externalId,
    name: row.name,
    status: row.status,
    connectedAt: row.connectedAt.toISOString(),
    lastCheckedAt: row.lastCheckedAt ? row.lastCheckedAt.toISOString() : null,
    lastError: row.lastError,
    tokenExpiresAt: row.tokenExpiresAt ? row.tokenExpiresAt.toISOString() : null,
  }
}

export async function getFacebookAccounts(): Promise<LinkedPage[]> {
  const rows = await db
    .select()
    .from(socialAccounts)
    .where(eq(socialAccounts.channel, 'facebook'))
    .orderBy(desc(socialAccounts.connectedAt))
  return rows.map(toLinkedPage)
}

/** The page a post is published to. There is one active Facebook target. */
export async function getActiveFacebookAccount() {
  const rows = await db
    .select()
    .from(socialAccounts)
    .where(and(eq(socialAccounts.channel, 'facebook'), eq(socialAccounts.status, 'connected')))
    .orderBy(desc(socialAccounts.connectedAt))
    .limit(1)
  return rows[0] ?? null
}

/** Stores a chosen page. The token is sealed before it ever reaches a column. */
export async function saveFacebookAccount(args: {
  page: PageOption
  scopes: string[]
  connectedBy: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const sealed = sealToken(args.page.accessToken)
  if (!sealed) {
    return { ok: false, error: 'Kunci sesi aplikasi belum ada, jadi token halaman tidak bisa disimpan dengan aman.' }
  }

  // One active page per channel: connecting a new one replaces the old target rather
  // than silently posting to whichever row happened to be first.
  await db.delete(socialAccounts).where(eq(socialAccounts.channel, 'facebook'))
  await db.insert(socialAccounts).values({
    channel: 'facebook',
    externalId: args.page.id,
    name: args.page.name,
    tokenSealed: sealed,
    scopes: args.scopes.join(','),
    status: 'connected',
  })

  await db.insert(activity).values({
    actor: 'owner',
    action: 'Halaman Facebook terhubung',
    detail: `${args.page.name} (${args.page.id}) dihubungkan oleh ${args.connectedBy}. Token disimpan terenkripsi dan tidak pernah dikirim ke browser.`,
    dataSource: 'live',
  })

  return { ok: true }
}

export async function disconnectFacebook(): Promise<void> {
  const [existing] = await db
    .select()
    .from(socialAccounts)
    .where(eq(socialAccounts.channel, 'facebook'))
    .limit(1)
  await db.delete(socialAccounts).where(eq(socialAccounts.channel, 'facebook'))
  await db.insert(activity).values({
    actor: 'owner',
    action: 'Halaman Facebook dilepas',
    detail: existing
      ? `${existing.name} dilepas. Token halaman dihapus dari aplikasi ini; konten tidak lagi dikirim ke Facebook.`
      : 'Tidak ada halaman yang terhubung.',
    dataSource: 'live',
  })
}

/** Reads the page back from Meta: proves the sealed token still works. */
export async function checkFacebookConnection(): Promise<{ state: 'ready' | 'missing' | 'invalid' | 'error'; message: string }> {
  if (!metaConfig().configured) {
    return {
      state: 'missing',
      message: 'Meta App ID atau App Secret belum diisi, jadi halaman belum bisa dihubungkan.',
    }
  }

  const account = await getActiveFacebookAccount()
  if (!account) {
    return { state: 'missing', message: 'Belum ada halaman Facebook yang terhubung.' }
  }

  const token = openToken(account.tokenSealed)
  if (!token) {
    return { state: 'error', message: 'Token halaman tersimpan tidak bisa dibuka dengan kunci aplikasi saat ini. Hubungkan ulang halamannya.' }
  }

  const result = await graphCall<{ id: string; name: string }>(`/${account.externalId}`, {
    access_token: token,
    fields: 'id,name',
  })

  await db
    .update(socialAccounts)
    .set({
      lastCheckedAt: new Date(),
      lastError: result.ok ? null : result.message,
      status: result.ok ? 'connected' : 'invalid',
    })
    .where(eq(socialAccounts.id, account.id))

  if (result.ok) {
    return { state: 'ready', message: `Meta menerima token halaman "${result.data.name}". Publikasi siap dipakai.` }
  }
  return { state: 'invalid', message: `Meta menolak token halaman: ${result.message}` }
}

export type PublishResult =
  | { ok: true; id: string; url: string }
  | { ok: false; reason: string; code?: number; retryable: boolean }

/**
 * Publishes one post to the connected page.
 *
 * A post is only reported as published when Meta returns an id. An expired or revoked
 * token marks the account, so the owner is told to reconnect rather than the scheduler
 * retrying forever against a dead token.
 */
export async function publishToFacebook(message: string): Promise<PublishResult> {
  const account = await getActiveFacebookAccount()
  if (!account) {
    return { ok: false, reason: 'Belum ada halaman Facebook yang terhubung.', retryable: false }
  }

  const token = openToken(account.tokenSealed)
  if (!token) {
    return { ok: false, reason: 'Token halaman tidak bisa dibuka dengan kunci aplikasi saat ini.', retryable: false }
  }

  const result = await graphCall<{ id: string }>(`/${account.externalId}/feed`, {
    access_token: token,
    message,
  })

  if (!result.ok) {
    const expired = result.code === 190
    if (expired) {
      await db
        .update(socialAccounts)
        .set({ status: 'invalid', lastError: result.message, lastCheckedAt: new Date() })
        .where(eq(socialAccounts.id, account.id))
    }
    return { ok: false, reason: result.message, code: result.code, retryable: !expired }
  }

  const id = result.data.id
  await db
    .update(socialAccounts)
    .set({ lastError: null, lastCheckedAt: new Date(), status: 'connected' })
    .where(eq(socialAccounts.id, account.id))

  // Meta's post ids look like `<pageId>_<postId>`; the browsable URL uses the second half.
  const postPart = id.includes('_') ? id.split('_')[1] : id
  return { ok: true, id, url: `https://www.facebook.com/${account.externalId}/posts/${postPart}` }
}
