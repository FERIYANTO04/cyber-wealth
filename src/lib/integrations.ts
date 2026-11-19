import { aiConfig as runtimeAiConfig, aiConfigured, chatWithAi } from './ai'
import { uploadUrl } from './storage'
import { hasConfiguredBankTransferDetails } from './bank-transfer'

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
  return runtimeAiConfig()
}

/** Tests the same provider routing and credentials used by real agents. */
export async function testAi(): Promise<{ state: CheckState; message: string }> {
  if (!aiConfigured()) {
    return {
      state: 'missing',
      message: 'Kredensial AI Gateway atau penyedia model belum diisi. Agen yang membutuhkan model akan melewati tugas dan mencatat alasannya.',
    }
  }

  const outcome = await chatWithAi({
    messages: [{ role: 'user', content: 'Balas dengan satu kata: siap' }],
    maxTokens: 50,
    temperature: 0,
  })
  if (outcome.ok) {
    return { state: 'ready', message: `Model ${outcome.model} menjawab melalui jalur AI yang dipakai agen.` }
  }
  const state: CheckState = /401|403|autentikasi/i.test(outcome.reason)
    ? 'invalid'
    : 'error'
  return { state, message: `Uji koneksi AI gagal: ${outcome.reason}` }
}

export function bankTransferStatus(): { state: CheckState; message: string } {
  const bank = process.env.BANK_NAME?.trim()
  const accountName = process.env.BANK_ACCOUNT_NAME?.trim()
  if (!hasConfiguredBankTransferDetails()) {
    return {
      state: 'missing',
      message: 'Instruksi rekening penerima belum lengkap. Atur BANK_NAME, BANK_ACCOUNT_NAME, BANK_ACCOUNT_NUMBER, atau isi BANK_TRANSFER_INSTRUCTIONS dengan nama bank dan nomor rekening.',
    }
  }
  return {
    state: 'ready',
    message: bank && accountName
      ? `Instruksi transfer tersedia untuk rekening ${bank} atas nama ${accountName}. Pembayaran tetap diverifikasi dari mutasi rekening sebelum pesanan aktif.`
      : 'Instruksi rekening khusus tersedia. Pastikan nomor rekening dan nama penerima benar; pembayaran tetap diverifikasi sebelum pesanan aktif.',
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
  if (!(process.env.AWS_ENDPOINT_URL_S3 || process.env.STORAGE_ENDPOINT) || !(process.env.AWS_ACCESS_KEY_ID || process.env.STORAGE_ACCESS_KEY_ID) || !(process.env.AWS_SECRET_ACCESS_KEY || process.env.STORAGE_SECRET_ACCESS_KEY)) {
    return { state: 'missing', message: 'Konfigurasi penyimpanan belum lengkap. Periksa endpoint, access key, dan secret key object storage.' }
  }
  try {
    // Signing an upload URL is the cheapest honest proof the bucket answers and the
    // key is accepted — nothing about the file itself is stored by this check.
    const url = await uploadUrl('pemeriksaan/koneksi.txt', { upsert: true })
    return url
      ? { state: 'ready', message: 'Penyimpanan berkas menjawab. Berkas produk bisa diunggah dan diunduh pembeli.' }
      : { state: 'error', message: 'Penyimpanan tidak memberi tautan unggah.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'tidak diketahui'
    return { state: 'error', message: `Penyimpanan berkas belum siap: ${message}.` }
  }
}

