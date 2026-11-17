import { and, desc, eq } from 'drizzle-orm'
import { db } from './db'
import { activity, socialAccounts } from './db/schema'
import { graphCall, metaConfig, openToken, sealToken, getActiveFacebookAccount } from './meta'

/**
 * Instagram Business publishing through Meta's official Graph API.
 *
 * An Instagram business account always belongs to a Facebook Page, and its publishing
 * calls use that Page's token. So connecting Instagram here never asks for a second
 * login: it reads the Instagram account linked to the Page the owner already connected,
 * and stores it as its own channel — enabled only once Meta names the account.
 *
 * Two limits of the official API shape this file:
 * - Instagram publishes a *media container* first, then publishes it. A post is only
 *   reported as published when `media_publish` returns an id.
 * - The photo or video must be reachable from the public internet by Meta. A file in
 *   this app's private storage is signed into a short-lived link and handed to Meta;
 *   when Meta cannot fetch it, the failure is recorded with Meta's own reason.
 */

export type InstagramAccountRow = typeof socialAccounts.$inferSelect

export type InstagramAccount = {
  id: string
  username: string
  pageId: string | null
  status: string
  connectedAt: string
  lastCheckedAt: string | null
  lastError: string | null
}

function toAccount(row: InstagramAccountRow): InstagramAccount {
  return {
    id: row.externalId,
    username: row.name,
    pageId: row.parentId,
    status: row.status,
    connectedAt: row.connectedAt.toISOString(),
    lastCheckedAt: row.lastCheckedAt ? row.lastCheckedAt.toISOString() : null,
    lastError: row.lastError,
  }
}

export async function getInstagramAccounts(): Promise<InstagramAccount[]> {
  const rows = await db
    .select()
    .from(socialAccounts)
    .where(eq(socialAccounts.channel, 'instagram'))
    .orderBy(desc(socialAccounts.connectedAt))
  return rows.map(toAccount)
}

export async function getActiveInstagramAccount() {
  const rows = await db
    .select()
    .from(socialAccounts)
    .where(and(eq(socialAccounts.channel, 'instagram'), eq(socialAccounts.status, 'connected')))
    .orderBy(desc(socialAccounts.connectedAt))
    .limit(1)
  return rows[0] ?? null
}

/** The Instagram account Meta says is linked to a Page, or a reason it is not. */
export async function findInstagramForPage(pageId: string, pageToken: string) {
  const result = await graphCall<{
    instagram_business_account?: { id: string; username?: string; name?: string }
  }>(`/${pageId}`, {
    access_token: pageToken,
    fields: 'instagram_business_account{id,username,name}',
  })

  if (!result.ok) return { ok: false as const, message: result.message, code: result.code }

  const account = result.data.instagram_business_account
  if (!account?.id) {
    return {
      ok: false as const,
      message:
        'Halaman Facebook ini belum punya akun Instagram Bisnis yang tertaut. Ubah akun Instagram Anda menjadi akun Bisnis dan tautkan ke Halaman itu di aplikasi Instagram, lalu coba lagi.',
    }
  }

  return {
    ok: true as const,
    account: {
      id: account.id,
      username: account.username ? `@${account.username}` : account.name ?? account.id,
    },
  }
}

/**
 * Stores the Instagram account linked to the connected Page. The page token is sealed
 * again under this channel's own row, so disconnecting one does not break the other.
 */
export async function connectInstagram(args: {
  connectedBy: string
}): Promise<{ ok: true; account: { id: string; username: string } } | { ok: false; error: string }> {
  if (!metaConfig().configured) {
    return { ok: false, error: 'Meta App ID atau App Secret belum diisi, jadi Instagram belum bisa dihubungkan.' }
  }

  const page = await getActiveFacebookAccount()
  if (!page) {
    return {
      ok: false,
      error: 'Hubungkan Halaman Facebook lebih dulu. Akun Instagram Bisnis selalu tertaut pada satu Halaman.',
    }
  }

  const pageToken = openToken(page.tokenSealed)
  if (!pageToken) {
    return { ok: false, error: 'Token halaman tersimpan tidak bisa dibuka. Hubungkan ulang Halaman Facebook-nya.' }
  }

  const found = await findInstagramForPage(page.externalId, pageToken)
  if (!found.ok) return { ok: false, error: found.message }

  const sealed = sealToken(pageToken)
  if (!sealed) return { ok: false, error: 'Kunci sesi aplikasi belum ada, jadi token tidak bisa disimpan dengan aman.' }

  await db.delete(socialAccounts).where(eq(socialAccounts.channel, 'instagram'))
  await db.insert(socialAccounts).values({
    channel: 'instagram',
    externalId: found.account.id,
    parentId: page.externalId,
    name: found.account.username,
    tokenSealed: sealed,
    scopes: 'instagram_basic,instagram_content_publish',
    status: 'connected',
  })

  await db.insert(activity).values({
    actor: 'owner',
    action: 'Akun Instagram Bisnis terhubung',
    detail: `${found.account.username} (${found.account.id}) tertaut pada Halaman ${page.name}. Token halaman disimpan terenkripsi dan tidak pernah dikirim ke browser.`,
    dataSource: 'live',
  })

  return { ok: true, account: found.account }
}

export async function disconnectInstagram(): Promise<void> {
  const [existing] = await db
    .select()
    .from(socialAccounts)
    .where(eq(socialAccounts.channel, 'instagram'))
    .limit(1)
  await db.delete(socialAccounts).where(eq(socialAccounts.channel, 'instagram'))
  await db.insert(activity).values({
    actor: 'owner',
    action: 'Akun Instagram dilepas',
    detail: existing
      ? `${existing.name} dilepas. Token dihapus dari aplikasi ini; konten tidak lagi dikirim ke Instagram.`
      : 'Tidak ada akun Instagram yang terhubung.',
    dataSource: 'live',
  })
}

/** Asks Meta about the stored account: proves the sealed token still works today. */
export async function checkInstagramConnection(): Promise<{ state: 'ready' | 'missing' | 'invalid' | 'error'; message: string }> {
  if (!metaConfig().configured) {
    return { state: 'missing', message: 'Meta App ID atau App Secret belum diisi, jadi Instagram belum bisa dihubungkan.' }
  }

  const account = await getActiveInstagramAccount()
  if (!account) return { state: 'missing', message: 'Belum ada akun Instagram Bisnis yang terhubung.' }

  const token = openToken(account.tokenSealed)
  if (!token) {
    return { state: 'error', message: 'Token tersimpan tidak bisa dibuka dengan kunci aplikasi saat ini. Hubungkan ulang Instagram-nya.' }
  }

  const result = await graphCall<{ id: string; username?: string; name?: string }>(`/${account.externalId}`, {
    access_token: token,
    fields: 'id,username,name',
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
    const name = result.data.username ? `@${result.data.username}` : result.data.name ?? result.data.id
    return { state: 'ready', message: `Meta menerima akun ${name}. Publikasi foto dan video siap dipakai.` }
  }
  return { state: 'invalid', message: `Meta menolak token akun ini: ${result.message}` }
}

export type InstagramPublishResult =
  | { ok: true; id: string; url: string }
  | { ok: false; reason: string; code?: number; retryable: boolean }

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Publishes one photo or video with its caption.
 *
 * Order matters and mirrors Meta's own: create the container, wait until Meta reports it
 * finished processing, then publish it. Only the publish call's id counts as success.
 */
export async function publishToInstagram(args: {
  caption: string
  mediaUrl: string | null
  mediaType: 'image' | 'video' | null
}): Promise<InstagramPublishResult> {
  const account = await getActiveInstagramAccount()
  if (!account) {
    return { ok: false, reason: 'Belum ada akun Instagram Bisnis yang terhubung.', retryable: false }
  }

  const token = openToken(account.tokenSealed)
  if (!token) {
    return { ok: false, reason: 'Token Instagram tersimpan tidak bisa dibuka. Hubungkan ulang akunnya.', retryable: false }
  }

  if (!args.mediaUrl || !args.mediaType) {
    return {
      ok: false,
      reason: 'Instagram hanya menerima kiriman yang berisi foto atau video. Lampirkan berkasnya lebih dulu.',
      retryable: false,
    }
  }

  const containerParams: Record<string, string> = {
    access_token: token,
    caption: args.caption,
  }
  if (args.mediaType === 'video') {
    containerParams.media_type = 'VIDEO'
    containerParams.video_url = args.mediaUrl
  } else {
    containerParams.image_url = args.mediaUrl
  }

  const container = await graphCall<{ id: string }>(`/${account.externalId}/media`, containerParams)
  if (!container.ok) return failure(account.id, container.message, container.code)

  const creationId = container.data.id

  // Meta processes video asynchronously. Poll briefly; if it is still not ready when the
  // time is up, record that honestly rather than pretending it went out.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const status = await graphCall<{ status_code?: string; status?: string }>(`/${creationId}`, {
      access_token: token,
      fields: 'status_code,status',
    })
    if (!status.ok) return failure(account.id, status.message, status.code)
    const code = status.data.status_code
    if (code === 'FINISHED') break
    if (code === 'ERROR' || code === 'EXPIRED') {
      return failure(account.id, status.data.status ?? `Meta menandai berkas ini ${code.toLowerCase()}.`)
    }
    await sleep(2500)
  }

  const published = await graphCall<{ id: string }>(`/${account.externalId}/media_publish`, {
    access_token: token,
    creation_id: creationId,
  })
  if (!published.ok) return failure(account.id, published.message, published.code)

  const mediaId = published.data.id
  const permalink = await graphCall<{ permalink?: string }>(`/${mediaId}`, {
    access_token: token,
    fields: 'permalink',
  })

  await db
    .update(socialAccounts)
    .set({ lastError: null, lastCheckedAt: new Date(), status: 'connected' })
    .where(eq(socialAccounts.id, account.id))

  return {
    ok: true,
    id: mediaId,
    url: permalink.ok && permalink.data.permalink ? permalink.data.permalink : `https://www.instagram.com/${account.name.replace('@', '')}/`,
  }
}

async function failure(rowId: string, message: string, code?: number): Promise<InstagramPublishResult> {
  const expired = code === 190
  if (expired) {
    await db
      .update(socialAccounts)
      .set({ status: 'invalid', lastError: message, lastCheckedAt: new Date() })
      .where(and(eq(socialAccounts.id, rowId), eq(socialAccounts.channel, 'instagram')))
  }
  return { ok: false, reason: message, code, retryable: !expired }
}
