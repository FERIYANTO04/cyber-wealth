import { createHash, createHmac, randomUUID } from 'node:crypto'

const endpoint = process.env.STORAGE_ENDPOINT
const bucket = process.env.STORAGE_BUCKET
const region = process.env.STORAGE_REGION || 'auto'
const accessKey = process.env.STORAGE_ACCESS_KEY_ID
const secretKey = process.env.STORAGE_SECRET_ACCESS_KEY

export class StorageError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'StorageError'
  }
}

function config() {
  if (!endpoint || !bucket || !accessKey || !secretKey) {
    throw new StorageError(503, 'Konfigurasi penyimpanan S3 belum lengkap.')
  }
  let base: URL
  try {
    base = new URL(endpoint)
  } catch {
    throw new StorageError(503, 'Alamat penyimpanan S3 tidak valid.')
  }
  if (base.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    throw new StorageError(503, 'Penyimpanan harus menggunakan HTTPS.')
  }
  return { base, bucket, region, accessKey, secretKey }
}

function encode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  )
}

function safeKey(key: string): string {
  const parts = key.split('/')
  if (!key || parts.some((part) => !part || part === '.' || part === '..')) {
    throw new StorageError(400, 'Lokasi berkas tidak valid.')
  }
  return parts.map(encode).join('/')
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac('sha256', key).update(value).digest()
}

function signingKey(secret: string, date: string, region: string): Buffer {
  const dateKey = hmac(`AWS4${secret}`, date)
  const regionKey = hmac(dateKey, region)
  const serviceKey = hmac(regionKey, 's3')
  return hmac(serviceKey, 'aws4_request')
}

function amzDate(date: Date): { full: string; day: string } {
  const full = date.toISOString().replace(/[:-]|\.\d{3}/g, '')
  return { full, day: full.slice(0, 8) }
}

function objectUrl(key: string): { url: URL; cfg: ReturnType<typeof config> } {
  const cfg = config()
  const url = new URL(cfg.base.toString())
  url.hostname = `${cfg.bucket}.${url.hostname}`
  url.pathname = `/${safeKey(key)}`
  url.search = ''
  url.hash = ''
  return { url, cfg }
}

function presign(method: 'PUT' | 'GET' | 'DELETE', key: string, expiresIn: number, contentType?: string, extraQuery: Record<string, string> = {}): string {
  const { url, cfg } = objectUrl(key)
  const now = amzDate(new Date())
  const scope = `${now.day}/${cfg.region}/s3/aws4_request`
  const signedHeaders = contentType ? 'content-type;host' : 'host'
  const query: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${cfg.accessKey}/${scope}`,
    'X-Amz-Date': now.full,
    'X-Amz-Expires': String(Math.max(1, Math.min(604800, Math.floor(expiresIn)))),
    'X-Amz-SignedHeaders': signedHeaders,
    ...extraQuery,
  }
  const canonicalQuery = Object.entries(query)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${encode(name)}=${encode(value)}`)
    .join('&')
  const canonicalHeaders = contentType
    ? `content-type:${contentType.trim()}\nhost:${url.host.toLowerCase()}\n`
    : `host:${url.host.toLowerCase()}\n`
  const canonicalRequest = [
    method,
    url.pathname,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n')
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    now.full,
    scope,
    sha256(canonicalRequest),
  ].join('\n')
  const signature = createHmac('sha256', signingKey(cfg.secretKey, now.day, cfg.region))
    .update(stringToSign)
    .digest('hex')
  url.search = `${canonicalQuery}&X-Amz-Signature=${signature}`
  return url.toString()
}

// Browser uploads directly to the private bucket using a short-lived S3 signature.
export async function uploadUrl(
  key: string,
  { contentType, expiresIn = 900 }: { contentType?: string; upsert?: boolean; expiresIn?: number } = {},
): Promise<string> {
  return presign('PUT', key, expiresIn, contentType)
}

// Upload bytes from the application server to the private S3-compatible bucket.
// Keeping this hop server-side avoids browser-to-bucket CORS failures.
export async function uploadObject(key: string, body: Uint8Array, contentType: string): Promise<void> {
  const url = await uploadUrl(key, { contentType, expiresIn: 300 })
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: new Uint8Array(body),
  })
  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 500)
    throw new StorageError(response.status, `Penyimpanan menolak unggahan (HTTP ${response.status}). ${detail}`)
  }
}

// Performs a real, isolated bucket round-trip and removes its temporary object.
export async function testStorageRoundTrip(): Promise<void> {
  const key = `_system-check/${randomUUID()}.txt`
  const expected = `cyber-wealth-storage-check:${randomUUID()}`
  const body = new TextEncoder().encode(expected)
  let uploaded = false
  let primaryError: unknown

  try {
    await uploadObject(key, body, 'text/plain')
    uploaded = true

    const download = await fileUrl(key, { expiresIn: 60 })
    if (!download) throw new StorageError(502, 'URL unduh percobaan tidak berhasil dibuat.')

    const response = await fetch(download, { method: 'GET', cache: 'no-store' })
    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 300)
      throw new StorageError(response.status, `Bucket gagal membaca berkas percobaan (HTTP ${response.status}). ${detail}`)
    }

    const received = new Uint8Array(await response.arrayBuffer())
    if (received.length !== body.length || Buffer.compare(Buffer.from(received), Buffer.from(body)) !== 0) {
      throw new StorageError(502, 'Isi berkas hasil unduhan tidak sama dengan berkas yang diunggah.')
    }
  } catch (error) {
    primaryError = error
  } finally {
    if (uploaded) {
      try {
        const deleteUrl = presign('DELETE', key, 60)
        const deleted = await fetch(deleteUrl, { method: 'DELETE', cache: 'no-store' })
        if (!deleted.ok) {
          const detail = (await deleted.text().catch(() => '')).slice(0, 300)
          throw new StorageError(deleted.status, `Berkas percobaan berhasil dibuat tetapi gagal dibersihkan (HTTP ${deleted.status}). ${detail}`)
        }
      } catch (cleanupError) {
        if (primaryError) {
          const original = primaryError instanceof Error ? primaryError.message : 'Pengujian gagal.'
          const cleanup = cleanupError instanceof Error ? cleanupError.message : 'Pembersihan gagal.'
          throw new StorageError(502, `${original} Pembersihan berkas percobaan juga gagal: ${cleanup}`)
        }
        throw cleanupError
      }
    }
  }

  if (primaryError) throw primaryError
}

// A short-lived private download URL, or null if the caller has no file key.
export async function fileUrl(
  key: string,
  { expiresIn = 3600, download }: { expiresIn?: number; download?: boolean | string } = {},
): Promise<string | null> {
  const name = typeof download === 'string' ? download : 'download'
  const extraQuery: Record<string, string> = download
    ? { 'response-content-disposition': `attachment; filename="${name.replace(/["\\\\\\r\\n]/g, '_')}"` }
    : {}
  return presign('GET', key, expiresIn, undefined, extraQuery)
}
