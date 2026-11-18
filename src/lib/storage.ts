import { createHash, createHmac } from 'node:crypto'

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

function presign(method: 'PUT' | 'GET', key: string, expiresIn: number, contentType?: string, extraQuery: Record<string, string> = {}): string {
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

// A short-lived private download URL, or null if the caller has no file key.
export async function fileUrl(
  key: string,
  { expiresIn = 3600, download }: { expiresIn?: number; download?: boolean | string } = {},
): Promise<string | null> {
  const name = typeof download === 'string' ? download : 'download'
  const extraQuery = download
    ? { 'response-content-disposition': `attachment; filename="${name.replace(/["\\\\\\r\\n]/g, '_')}"` }
    : {}
  return presign('GET', key, expiresIn, undefined, extraQuery)
}
