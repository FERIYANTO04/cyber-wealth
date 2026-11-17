const STORAGE_URL = (process.env.STORAGE_URL || 'http://127.0.0.1:9000/storage/v1').replace(/\/+$/, '')
const STORAGE_KEY = process.env.STORAGE_KEY || 'local'
const STORAGE_BUCKET = process.env.STORAGE_BUCKET || 'app'
const BROWSER_BASE = process.env.GL_PREVIEW_STORAGE_PATH
  ? `${process.env.GL_PREVIEW_STORAGE_PATH.replace(/\/+$/, '')}/storage/v1`
  : STORAGE_URL

export class StorageError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'StorageError'
  }
}

function objectPath(key: string): string {
  const parts = key.split('/')
  if (!key || parts.some((p) => !p || p === '.' || p === '..')) {
    throw new StorageError(400, `Invalid file key: ${key}`)
  }
  return `${encodeURIComponent(STORAGE_BUCKET)}/${parts.map(encodeURIComponent).join('/')}`
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${STORAGE_URL}${path}`, {
    ...init,
    cache: 'no-store',
    headers: { apikey: STORAGE_KEY, Authorization: `Bearer ${STORAGE_KEY}`, ...(init.headers ?? {}) },
  })
}

async function readJson(res: Response): Promise<any> {
  try {
    return await res.json()
  } catch {
    return null
  }
}

function isNotFound(res: Response, body: any): boolean {
  return res.status === 404 || body?.statusCode === '404' || body?.error === 'not_found'
}

function failure(res: Response, body: any): StorageError {
  const status = Number(body?.statusCode) || res.status
  return new StorageError(status, body?.message || `Storage request failed (${res.status})`)
}

function json(body: unknown): RequestInit {
  return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}

// The URL the browser PUTs one file to, with the file's Content-Type header. Valid for 2 hours.
export async function uploadUrl(key: string, { upsert = false }: { upsert?: boolean } = {}): Promise<string> {
  const init = json({})
  const res = await request(`/object/upload/sign/${objectPath(key)}`, {
    method: 'POST',
    ...init,
    headers: { ...(init.headers as Record<string, string>), ...(upsert ? { 'x-upsert': 'true' } : {}) },
  })
  const body = await readJson(res)
  if (!res.ok) throw failure(res, body)
  return `${BROWSER_BASE}${body.url}`
}

// A short-lived link to view or download a file, or null when the file is gone.
export async function fileUrl(
  key: string,
  { expiresIn = 3600, download }: { expiresIn?: number; download?: boolean | string } = {},
): Promise<string | null> {
  const res = await request(`/object/sign/${objectPath(key)}`, { method: 'POST', ...json({ expiresIn }) })
  const body = await readJson(res)
  if (isNotFound(res, body)) return null
  if (!res.ok) throw failure(res, body)
  return withDownload(`${BROWSER_BASE}${body.signedURL}`, download)
}

export async function fileUrls(keys: string[], { expiresIn = 3600 }: { expiresIn?: number } = {}): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = {}
  if (keys.length === 0) return out
  keys.forEach(objectPath)
  const res = await request(`/object/sign/${encodeURIComponent(STORAGE_BUCKET)}`, { method: 'POST', ...json({ expiresIn, paths: keys }) })
  const body = await readJson(res)
  if (!res.ok) throw failure(res, body)
  for (const key of keys) out[key] = null
  for (const item of body as { path: string; signedURL: string | null; error: string | null }[]) {
    out[item.path] = item.signedURL && !item.error ? `${BROWSER_BASE}${item.signedURL}` : null
  }
  return out
}

export async function putFile(
  key: string,
  data: Blob | ArrayBuffer | Uint8Array | string,
  contentType: string,
  { upsert = true }: { upsert?: boolean } = {},
): Promise<void> {
  const res = await request(`/object/${objectPath(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': contentType, 'x-upsert': upsert ? 'true' : 'false' },
    body: data as BodyInit,
  })
  if (!res.ok) throw failure(res, await readJson(res))
}

export async function getFile(key: string): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  const res = await request(`/object/authenticated/${objectPath(key)}`)
  if (!res.ok) {
    const body = await readJson(res)
    if (isNotFound(res, body)) return null
    throw failure(res, body)
  }
  return { data: await res.arrayBuffer(), contentType: res.headers.get('content-type') || 'application/octet-stream' }
}

export async function deleteFile(keys: string | string[]): Promise<void> {
  const list = Array.isArray(keys) ? keys : [keys]
  if (list.length === 0) return
  list.forEach(objectPath)
  const res = await request(`/object/${encodeURIComponent(STORAGE_BUCKET)}`, { method: 'DELETE', ...json({ prefixes: list }) })
  if (!res.ok) throw failure(res, await readJson(res))
}

function withDownload(url: string, download?: boolean | string): string {
  if (!download) return url
  const name = typeof download === 'string' ? encodeURIComponent(download) : ''
  return `${url}${url.includes('?') ? '&' : '?'}download=${name}`
}
