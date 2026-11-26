import { randomUUID } from 'node:crypto'
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
  key: 'ai' | 'bank' | 'email' | 'storage' | 'midtrans'
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
  const kiosapiKey = (process.env.KIOSAPI_API_KEY || '').trim()
  const kiosapiReady = Boolean(kiosapiKey) && !isPlaceholder(kiosapiKey)
  const configuredBaseUrl = (
    process.env.AI_BASE_URL ||
    (neonBaseUrl ? `${neonBaseUrl}/v1` : 'https://api.groq.com/openai/v1')
  ).replace(/\/+$/, '')

  // Keep the owner-facing diagnostics aligned with the same KiosAPI-first
  // provider selection used by chatWithAi. A saved key alone is not success:
  // testAi still makes a real completion request and reports the actual result.
  return {
    key: kiosapiReady
      ? kiosapiKey
      : configuredBaseUrl.includes('api.groq.com')
        ? (process.env.GROQ_API_KEY || '')
        : configuredBaseUrl.includes('api.kiosapi.id')
          ? (process.env.KIOSAPI_API_KEY || '')
          : (process.env.NEON_AI_GATEWAY_TOKEN || process.env.GROQ_API_KEY || ''),
    model: kiosapiReady
      ? (process.env.AI_KIOSAPI_MODEL || process.env.AI_MODEL || 'minimax/minimax-m3')
      : (process.env.AI_MODEL || 'openai/gpt-oss-120b'),
    baseUrl: kiosapiReady ? 'https://api.kiosapi.id/v1' : configuredBaseUrl,
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

/** Read-only Midtrans status lookup. A random nonexistent order ID verifies auth without creating a charge. */
export async function testMidtrans(): Promise<{ state: CheckState; message: string }> {
  const key = process.env.MIDTRANS_SERVER_KEY?.trim() ?? ''
  if (!key || isPlaceholder(key)) {
    return { state: 'missing', message: 'MIDTRANS_SERVER_KEY belum dikonfigurasi.' }
  }
  const production = process.env.MIDTRANS_IS_PRODUCTION === 'true'
  const baseUrl = production ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com'
  const probeOrderId = 'cw-health-' + randomUUID()
  try {
    const response = await fetch(baseUrl + '/v2/' + encodeURIComponent(probeOrderId) + '/status', {
      method: 'GET',
      headers: {
        Authorization: 'Basic ' + Buffer.from(key + ':').toString('base64'),
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    })
    if (response.status === 404) {
      return {
        state: 'ready',
        message: 'Midtrans ' + (production ? 'Production' : 'Sandbox') + ' menerima autentikasi server key. Lookup order uji acak mendapat 404 sesuai harapan; tidak ada transaksi atau tagihan dibuat.',
      }
    }
    if (response.status === 401 || response.status === 403) {
      return { state: 'invalid', message: 'Midtrans menolak server key (' + response.status + '). Periksa pasangan key dan mode Production/Sandbox.' }
    }
    if (response.ok) {
      return { state: 'ready', message: 'Midtrans ' + (production ? 'Production' : 'Sandbox') + ' menerima autentikasi server key. Pemeriksaan hanya membaca status order acak; tidak ada pembayaran dibuat.' }
    }
    const body = await response.text().catch(() => '')
    return { state: 'error', message: 'Midtrans menjawab HTTP ' + response.status + (body ? ': ' + body.slice(0, 180) : '.') }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'koneksi gagal'
    return { state: 'error', message: 'Pemeriksaan Midtrans gagal: ' + message.slice(0, 200) }
  }
}

/** Midtrans is the active checkout provider; a configured key still needs a real test transaction. */
export function midtransStatus(): { state: CheckState; message: string } {
  const key = process.env.MIDTRANS_SERVER_KEY?.trim() ?? ''
  if (!key || isPlaceholder(key)) return { state: 'missing', message: 'MIDTRANS_SERVER_KEY belum dikonfigurasi. Checkout berbayar belum dapat membuat tagihan.' }
  const mode = process.env.MIDTRANS_IS_PRODUCTION === 'true' ? 'Production' : 'Sandbox'
  return { state: 'unverified', message: `Server key Midtrans tersedia (${mode}). Koneksi baru terbukti setelah checkout uji berhasil dan webhook mengonfirmasi pembayaran.` }
}
