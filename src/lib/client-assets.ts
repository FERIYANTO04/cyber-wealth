import { createHash, createHmac } from 'node:crypto'

const BUCKET = process.env.CLIENT_ASSETS_BUCKET || 'cyber-wealth-client-assets'
const endpoint = () => {
  const value = process.env.AWS_ENDPOINT_URL_S3
  if (!value) throw new Error('Object storage endpoint belum dikonfigurasi.')
  return new URL(value)
}
const hmac = (key: Buffer | string, value: string) => createHmac('sha256', key).update(value, 'utf8').digest()
const encode = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const tokenHash = (value: string) => hash(value)

function signUrl(method: 'PUT'|'GET'|'HEAD'|'DELETE', objectKey: string, contentType?: string, expiresIn = 900) {
  const accessKey = process.env.AWS_ACCESS_KEY_ID
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY
  const region = process.env.AWS_REGION
  if (!accessKey || !secretKey || !region) throw new Error('Kredensial object storage belum lengkap.')
  const base = endpoint()
  const path = [BUCKET, ...objectKey.split('/')].map(encode).join('/')
  const canonicalUri = (base.pathname.replace(/\/$/, '') || '') + '/' + path
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0,8)
  const scope = dateStamp + '/' + region + '/s3/aws4_request'
  const params: Record<string,string> = {
    'X-Amz-Algorithm':'AWS4-HMAC-SHA256',
    'X-Amz-Credential':accessKey + '/' + scope,
    'X-Amz-Date':amzDate,
    'X-Amz-Expires':String(expiresIn),
    'X-Amz-SignedHeaders':contentType && method==='PUT' ? 'content-type;host' : 'host'
  }
  const canonicalQuery = Object.entries(params).map(([k,v])=>[encode(k),encode(v)] as [string,string]).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>k+'='+v).join('&')
  const canonicalHeaders = contentType && method==='PUT' ? 'content-type:'+contentType.trim()+'\nhost:'+base.host+'\n' : 'host:'+base.host+'\n'
  const signedHeaders = params['X-Amz-SignedHeaders']
  const canonicalRequest = [method,canonicalUri,canonicalQuery,canonicalHeaders,signedHeaders,'UNSIGNED-PAYLOAD'].join('\n')
  const stringToSign = ['AWS4-HMAC-SHA256',amzDate,scope,hash(canonicalRequest)].join('\n')
  const dateKey = hmac('AWS4'+secretKey,dateStamp)
  const regionKey = hmac(dateKey,region)
  const serviceKey = hmac(regionKey,'s3')
  const signingKey = hmac(serviceKey,'aws4_request')
  const signature = createHmac('sha256',signingKey).update(stringToSign,'utf8').digest('hex')
  const url = new URL(base.toString())
  url.pathname = canonicalUri
  url.search = canonicalQuery + '&X-Amz-Signature=' + signature
  return url.toString()
}

export function createAssetUploadUrl(objectKey:string,contentType:string) {
  return {url:signUrl('PUT',objectKey,contentType,900),headers:{'Content-Type':contentType},expiresIn:900}
}
export function createAssetDownloadUrl(objectKey:string) {
  return signUrl('GET',objectKey,undefined,900)
}
export async function verifyAssetObject(objectKey:string,expectedSize:number,expectedType:string) {
  const response = await fetch(signUrl('HEAD',objectKey,undefined,120),{method:'HEAD'})
  if (!response.ok) throw new Error('File belum ditemukan di penyimpanan atau pemeriksaan gagal.')
  const actualSize = Number(response.headers.get('content-length') || 0)
  const actualType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
  if (actualSize !== expectedSize || actualType !== expectedType.toLowerCase()) throw new Error('Ukuran atau tipe file tidak cocok dengan data upload.')
  return {size:actualSize,contentType:actualType}
}
export async function deleteAssetObject(objectKey:string) {
  const response = await fetch(signUrl('DELETE',objectKey,undefined,120),{method:'DELETE'})
  if (!response.ok && response.status !== 404) throw new Error('File gagal dihapus dari object storage.')
}
export { BUCKET, tokenHash }
