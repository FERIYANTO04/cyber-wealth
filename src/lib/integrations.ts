import { isPlaceholder } from './env'
import { aiConfig, chatWithAi } from './ai'
import { testStorageRoundTrip } from './storage'

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

/** Calls the model with a one-token prompt. The answer is not used as content. */
export async function testAi(): Promise<{ state: CheckState; message: string }> {
  const { key, model, baseUrl } = aiConfig()
  if (isPlaceholder(key)) {
    return {
      state: 'missing',
      message: 'Kunci API model AI belum diisi. Agen yang menulis teks akan dilewati sampai kunci ini ada.',
    }
  }

  const outcome = await chatWithAi({
    messages: [{ role: 'user', content: 'Balas dengan satu kata: siap' }],
    maxTokens: 20,
    temperature: 0,
  })
  if (outcome.ok) {
    return { state: 'ready', message: `Model ${outcome.model || model} berhasil menjawab melalui ${baseUrl}.` }
  }
  const message = outcome.reason
  const state: CheckState = /ditolak|kredensial|akses model/i.test(message) ? 'invalid' : 'error'
  return { state, message }
}

export async function storageStatus(): Promise<{ state: CheckState; message: string }> {
  if (
    !process.env.STORAGE_ENDPOINT ||
    !process.env.STORAGE_BUCKET ||
    !process.env.STORAGE_ACCESS_KEY_ID ||
    !process.env.STORAGE_SECRET_ACCESS_KEY
  ) {
    return {
      state: 'missing',
      message: 'Konfigurasi penyimpanan S3 belum lengkap. Periksa variabel penyimpanan di lingkungan server.',
    }
  }

  try {
    await testStorageRoundTrip()
    return {
      state: 'ready',
      message: 'Berhasil mengunggah dan mengunduh berkas percobaan dari bucket. Berkas percobaan sudah dibersihkan.',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Kesalahan tidak diketahui.'
    return { state: 'error', message: `Uji unggah/unduh penyimpanan gagal: ${message}` }
  }
}
