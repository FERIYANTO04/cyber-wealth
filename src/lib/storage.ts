import { createHash, createHmac } from 'node:crypto'

const ENDPOINT = process.env.AWS_ENDPOINT_URL_S3 || ''
const REGION = process.env.AWS_REGION || 'ap-southeast-1'
const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID || ''
const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY || ''
const BUCKET = process.env.STORAGE_BUCKET || 'cyber-wealth-products'
const ALGORITHM = 'AWS4-HMAC-SHA256'

export class StorageError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'StorageError'
  }
}

function config() {
  if (!ENDPOINT || !ACCESS_KEY || !SECRET_KEY || !BUCKET) {
    throw new StorageError(500, 'Konfigurasi Neon Object Storage belum lengkap.')
  }
  return new URL(ENDPOINT)
}

function validKey(key: string): string {
  const parts = key.split('/')
  if (!key || parts.some((p) => !p || p === '.' || p === '..')) {
    throw new StorageError(400, 'Kunci berkas tidak valid.')
  }
  return parts.map(encodeURIComponent).join('/')
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac('sha256', key).update(value, 'utf8').digest()
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function signingKey(date: string): Buffer {
  const dateKey = hmac('AWS4' + SECRET_KEY, date)
  const regionKey = hmac(dateKey, REGION)
  const serviceKey = hmac(regionKey, 's3')
  return hmac(serviceKey, 'aws4_request')
}

function encodeQuery(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
}

function presign(method: 'GET' | 'PUT' | 'DELETE', key: string, expiresIn: number, responseName?: string): string {
  const endpoint = config()
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const date = amzDate.slice(0, 8)
  const scope = date + '/' + REGION + '/s3/aws4_request'
  const canonicalUri = '/' + encodeURIComponent(BUCKET) + '/' + validKey(key)
  const params: Record<string, string> = {
    'X-Amz-Algorithm': ALGORITHM,
    'X-Amz-Credential': ACCESS_KEY + '/' + scope,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(Math.max(1, Math.min(expiresIn, 604800))),
    'X-Amz-SignedHeaders': 'host',
  }
  if (responseName) params['response-content-disposition'] = 'attachment; filename="' + responseName.replace(/["\\\r\n]/g, '_') + '"'
  const canonicalQuery = Object.keys(params).sort().map((k) => encodeQuery(k) + '=' + encodeQuery(params[k])).join('&')
  const canonicalHeaders = 'host:' + endpoint.host + '\n'
  const canonicalRequest = [method, canonicalUri, canonicalQuery, canonicalHeaders, 'host', 'UNSIGNED-PAYLOAD'].join('\n')
  const stringToSign = [ALGORITHM, amzDate, scope, sha256(canonicalRequest)].join('\n')
  const signature = createHmac('sha256', signingKey(date)).update(stringToSign).digest('hex')
  endpoint.pathname = canonicalUri
  endpoint.search = canonicalQuery + '&X-Amz-Signature=' + signature
  return endpoint.toString()
}

export async function uploadUrl(key: string, _options: { upsert?: boolean } = {}): Promise<string> {
  return presign('PUT', key, 7200)
}

export async function fileUrl(
  key: string,
  { expiresIn = 3600, download }: { expiresIn?: number; download?: boolean | string } = {},
): Promise<string | null> {
  // Public, version-controlled deliverables may use a trusted HTTPS URL.
  // Private customer files continue to use short-lived signed object-storage URLs.
  if (/^https:\/\//i.test(key)) return key
  return presign('GET', key, expiresIn, download ? (typeof download === 'string' ? download : 'download') : undefined)
}

export async function fileUrls(keys: string[], { expiresIn = 3600 }: { expiresIn?: number } = {}): Promise<Record<string, string | null>> {
  return Object.fromEntries(keys.map((key) => [key, presign('GET', key, expiresIn)]))
}

export async function putFile(
  key: string,
  data: Blob | ArrayBuffer | Uint8Array | string,
  contentType: string,
  _options: { upsert?: boolean } = {},
): Promise<void> {
  const response = await fetch(presign('PUT', key, 900), {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: data as BodyInit,
    cache: 'no-store',
  })
  if (!response.ok) throw new StorageError(response.status, 'Gagal menyimpan berkas ke Neon Object Storage.')
}

export async function getFile(key: string): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  const response = await fetch(presign('GET', key, 900), { cache: 'no-store' })
  if (response.status === 404 || response.status === 403) return null
  if (!response.ok) throw new StorageError(response.status, 'Gagal mengambil berkas dari Neon Object Storage.')
  return { data: await response.arrayBuffer(), contentType: response.headers.get('content-type') || 'application/octet-stream' }
}

export async function deleteFile(keys: string | string[]): Promise<void> {
  for (const key of Array.isArray(keys) ? keys : [keys]) {
    const response = await fetch(presign('DELETE', key, 900), { method: 'DELETE', cache: 'no-store' })
    if (!response.ok && response.status !== 404) {
      throw new StorageError(response.status, 'Gagal menghapus berkas dari Neon Object Storage.')
    }
  }
}
