import { isPlaceholder } from './env'
import { putFile, deleteFile } from './storage'

/**
 * Live checks for every outside service the app depends on. Each one actually calls
 * the provider and reports what came back — a key being present is not the same as a
 * key working, and the owner needs to see the difference.
 */

export type CheckState = 'ready' | 'missing' | 'invalid' | 'error'

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
    key: process.env.NEON_AI_GATEWAY_TOKEN || process.env.GROQ_API_KEY || '',
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
    state: 'ready',
    message: `Instruksi transfer tersedia untuk rekening ${bank} atas nama ${accountName}. Pembayaran tetap diverifikasi dari mutasi rekening sebelum pesanan aktif.`,
  }
}

/** Calls the model with a one-token prompt. The answer is not used as content. */
export async function testAi(): Promise<{ state: CheckState; message: string }> {
  const { key, model, baseUrl } = aiConfig()
  if (isPlaceholder(key)) {
    return {
      state: 'missing',
      message: 'Kunci API model AI belum diisi. Agen yang menulis teks akan dilewati sampai kunci ini ada.',
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20_000)
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        max_tokens: 200,
        reasoning_effort: 'low',
        messages: [{ role: 'user', content: 'Balas dengan satu kata: siap' }],
      }),
      signal: controller.signal,
      cache: 'no-store',
    })
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null

    if (response.ok) return { state: 'ready', message: `Model ${model} menjawab. Agen siap menulis.` }
    if (response.status === 401 || response.status === 403) {
      return { state: 'invalid', message: 'Penyedia menolak kunci ini. Periksa apakah kuncinya benar dan masih aktif.' }
    }
    if (response.status === 404) {
      return {
        state: 'invalid',
        message: `Model "${model}" tidak dikenal di alamat ini. Periksa nama model dan alamat API-nya.`,
      }
    }
    return {
      state: 'error',
      message: `Penyedia menjawab ${response.status}${body?.error?.message ? `: ${body.error.message}` : ''}.`,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { state: 'error', message: 'Penyedia tidak menjawab dalam 20 detik.' }
    }
    return { state: 'error', message: 'Tidak bisa menghubungi penyedia. Periksa alamat API dan koneksi keluar.' }
  } finally {
    clearTimeout(timer)
  }
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

