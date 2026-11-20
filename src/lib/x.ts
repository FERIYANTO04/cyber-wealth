import { createHmac, randomBytes } from 'node:crypto'

type XResult = { ok: true; tweetId: string; url: string } | { ok: false; reason: string }

function oauthHeader(method: string, url: string): string {
  const consumerKey = process.env.X_API_KEY!
  const consumerSecret = process.env.X_API_SECRET!
  const token = process.env.X_ACCESS_TOKEN!
  const tokenSecret = process.env.X_ACCESS_TOKEN_SECRET!
  const params: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: token,
    oauth_version: '1.0',
  }
  const enc = (value: string) => encodeURIComponent(value)
  const normalized = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${enc(key)}=${enc(value)}`)
    .join('&')
  const base = [method.toUpperCase(), enc(url), enc(normalized)].join('&')
  const signingKey = `${enc(consumerSecret)}&${enc(tokenSecret)}`
  params.oauth_signature = createHmac('sha1', signingKey).update(base).digest('base64')
  return 'OAuth ' + Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${enc(key)}="${enc(value)}"`)
    .join(', ')
}

function xConfigured(): boolean {
  return Boolean(
    process.env.X_API_KEY &&
    process.env.X_API_SECRET &&
    process.env.X_ACCESS_TOKEN &&
    process.env.X_ACCESS_TOKEN_SECRET
  )
}

async function xRequest(method: 'GET' | 'POST', path: string, body?: unknown) {
  const url = `https://api.x.com/2/${path}`
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: oauthHeader(method, url),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = data?.detail ?? data?.title ?? data?.errors?.[0]?.message ?? `X API HTTP ${response.status}`
    throw new Error(String(detail))
  }
  return data
}

export async function xReady(): Promise<boolean> {
  if (!xConfigured()) return false
  try {
    const result = await xRequest('GET', 'users/me')
    return Boolean(result?.data?.id)
  } catch {
    return false
  }
}

export async function publishToX(text: string): Promise<XResult> {
  if (!xConfigured()) return { ok: false, reason: 'Kredensial X belum lengkap di Railway.' }
  if (!text.trim()) return { ok: false, reason: 'Konten kosong.' }
  try {
    const result = await xRequest('POST', 'tweets', { text: text.trim().slice(0, 280) })
    const id = String(result?.data?.id ?? '')
    if (!id) return { ok: false, reason: 'X tidak mengembalikan ID kiriman.' }
    return { ok: true, tweetId: id, url: `https://x.com/i/web/status/${id}` }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'X API gagal.' }
  }
}
