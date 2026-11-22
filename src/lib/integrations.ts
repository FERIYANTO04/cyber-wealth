import { chatWithAi } from './ai'
import { putFile, deleteFile } from './storage'
import { isPlaceholder } from './env'

/**
 * Live checks for every outside service the app depends on. Each one actually calls
 * the provider and reports what came back — a key being present is not the same as a
 * key working, and the owner needs to see the difference.
 */

export type CheckState = 'ready' | 'missing' | 'invalid' | 'error' | 'unverified'

export type IntegrationCheck = {
  key: 'ai' | 'bank' | 'email' | 'storage'
  label: string
  state: CheckState
  headline: string
  detail: string
  /** Named values the owner must supply, in plain language. */
  required: string[]
  steps: string[]
}

export function aiConfig() {
  const neonBaseUrl = (process.env.NEON_AI_GATEWAY_BASE_URL || '').replace(/\/+$/, '')
  return {
    key: (process.env.AI_BASE_URL || '').includes('api.groq.com')
      ? (process.env.GROQ_API_KEY || '')
      : (process.env.NEON_AI_GATEWAY_TOKEN || process.env.GROQ_API_KEY || ''),
    model: process.env.AI_MODEL || 'openai/gpt-oss-120b',
    baseUrl: (
      process.env.AI_BASE_URL ||
      (neonBaseUrl ? `${neonBaseUrl}/v1` : 'https://api.groq.com/openai/v1')
    ).replace(/\/+$/, ''),
  }
}

export function bankTransferStatus(): { state: CheckState; message: string } {
  const bank = process.env.BANK_NAME?.trim()
  const accountName = process.env.BANK_ACCOUNT_NAME?.trim()
  const accountNumber = process.env.BANK_ACCOUNT_NUMBER?.trim()
  if (!bank || !accountName || !accountNumber) {
    return {
      state: 'missing',
      message: 'Detail rekening penerima belum diatur. Isi BANK_NAME, BANK_ACCOUNT_NAME, dan BANK_ACCOUNT_NUMBER di pengaturan rahasia hosting.',
    }
  }
  return {
    state: 'unverified',
    message: `Detail rekening ${bank} atas nama ${accountName} sudah diisi, tetapi aplikasi tidak dapat membuktikan kepemilikan atau keakuratan rekening. Owner harus mencocokkannya langsung di aplikasi bank sebelum menerima pembayaran.`,
  }
}

/** Calls the model with a one-token prompt. The answer is not used as content. */
export async function testAi(): Promise<{ state: CheckState; message: string }> {
  // Exercise the same primary-plus-fallback path used by the agents. Testing only
  // the primary provider can report a false failure when Neon is unavailable but
  // the configured Groq fallback is healthy.
  const outcome = await chatWithAi({
    messages: [{ role: 'user', content: 'Balas dengan satu kata: siap' }],
    maxTokens: 256,
    temperature: 0,
  })

  if (outcome.ok) {
    return { state: 'ready', message: `Model ${outcome.model} menjawab. Jalur AI siap digunakan.` }
  }
  if (/belum ada kredensial/i.test(outcome.reason)) {
    return { state: 'missing', message: outcome.reason }
  }
  if (/menolak autentikasi \((401|403)\)/i.test(outcome.reason)) {
    return { state: 'invalid', message: outcome.reason }
  }
  return { state: 'error', message: outcome.reason }
}

export async function storageStatus(): Promise<{ state: CheckState; message: string }> {
  if (
    !process.env.AWS_ENDPOINT_URL_S3 ||
    !process.env.AWS_ACCESS_KEY_ID ||
    !process.env.AWS_SECRET_ACCESS_KEY ||
    !process.env.STORAGE_BUCKET
  ) {
    return { state: 'missing', message: 'Konfigurasi Neon Object Storage belum lengkap. Periksa endpoint, access key, secret key, dan nama bucket.' }
  }
  const probeKey = `pemeriksaan/koneksi-${Date.now()}.txt`
  try {
    await putFile(probeKey, 'Cyber Wealth storage connection check', 'text/plain')
    await deleteFile(probeKey)
    return { state: 'ready', message: 'Object Storage berhasil menerima dan menghapus berkas uji.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'tidak diketahui'
    return { state: 'error', message: `Penyimpanan berkas belum siap: ${message}.` }
  }
}


/** Checks Paddle API credentials without creating a charge or checkout. */
export async function testPaddle(expectedWebhookUrl?: string): Promise<{ state: CheckState; message: string }> {
  const key = process.env.PADDLE_API_KEY ?? ''
  const secret = process.env.PADDLE_WEBHOOK_SECRET ?? ''
  if (!key || isPlaceholder(key)) return { state: 'missing', message: 'PADDLE_API_KEY belum dikonfigurasi.' }
  const mode = process.env.PADDLE_ENV === 'sandbox' ? 'Sandbox' : 'Live'
  const base = process.env.PADDLE_ENV === 'sandbox' ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com'
  const webhookUrl = expectedWebhookUrl || (
    process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN.replace('https://', '').replace('http://', '').split('/')[0]}/api/webhooks/paddle`
      : ''
  )
  try {
    const headers = { Authorization: 'Bearer ' + key }
    const eventsResponse = await fetch(base + '/event-types', {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    })
    if (eventsResponse.status === 401 || eventsResponse.status === 403) {
      return { state: 'invalid', message: 'Paddle menolak API key (' + eventsResponse.status + '). Periksa apakah key cocok dengan mode ' + mode + '.' }
    }
    if (!eventsResponse.ok) return { state: 'error', message: 'Paddle API menjawab ' + eventsResponse.status + '. Koneksi pembayaran belum terverifikasi.' }

    if (!secret || isPlaceholder(secret)) {
      return { state: 'missing', message: 'API key Paddle valid, tetapi PADDLE_WEBHOOK_SECRET belum diisi. Pembayaran tidak boleh dianggap otomatis terkonfirmasi.' }
    }
    if (!webhookUrl) {
      return { state: 'unverified', message: 'API key Paddle valid (' + mode + '), tetapi domain webhook aplikasi tidak dapat ditentukan dari server.' }
    }

    const destinationsResponse = await fetch(base + '/notification-settings?per_page=200', {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    })
    if (destinationsResponse.status === 401 || destinationsResponse.status === 403) {
      return { state: 'unverified', message: 'API key Paddle valid, tetapi tidak memiliki izin notification_setting.read untuk memeriksa tujuan webhook.' }
    }
    if (!destinationsResponse.ok) {
      return { state: 'error', message: 'Paddle gagal memeriksa tujuan webhook (' + destinationsResponse.status + ').' }
    }

    const payload = await destinationsResponse.json().catch(() => null) as {
      data?: {
        type?: string
        destination?: string
        active?: boolean
        subscribed_events?: { name?: string }[]
        endpoint_secret_key?: string
      }[]
    } | null
    const destination = (payload?.data ?? []).find((item) => item.type === 'url' && item.destination === webhookUrl && item.active === true)
    if (!destination) {
      return { state: 'unverified', message: 'API key Paddle valid (' + mode + '), tetapi belum ada webhook aktif yang cocok dengan URL ' + webhookUrl + '.' }
    }

    const eventNames = new Set((destination.subscribed_events ?? []).map((event) => event.name))
    const missingEvents = ['transaction.completed', 'transaction.paid'].filter((name) => !eventNames.has(name))
    if (missingEvents.length > 0) {
      return { state: 'unverified', message: 'Webhook Paddle ditemukan, tetapi belum berlangganan event ' + missingEvents.join(' dan ') + '.' }
    }
    if (!destination.endpoint_secret_key || destination.endpoint_secret_key !== secret) {
      return { state: 'invalid', message: 'Webhook Paddle aktif dan event sudah benar, tetapi PADDLE_WEBHOOK_SECRET tidak cocok dengan secret tujuan tersebut.' }
    }

    return { state: 'ready', message: 'Paddle ' + mode + ' terhubung. API key valid, URL webhook aktif cocok, event pembayaran lengkap, dan webhook secret sesuai.' }
  } catch {
    return { state: 'error', message: 'Tidak dapat menghubungi Paddle API dari server.' }
  }
}
