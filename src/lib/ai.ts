/**
 * Shared OpenAI-compatible chat-completions client.
 * Supports Kiosapi when configured, then Neon AI Gateway and Groq fallback.
 */
import { isPlaceholder } from './env'

const KIOSAPI_API_KEY = process.env.KIOSAPI_API_KEY || ''
const USE_KIOSAPI = Boolean(KIOSAPI_API_KEY)
const NEON_BASE_URL = (process.env.NEON_AI_GATEWAY_BASE_URL || '').replace(/\/+$/, '')
const BASE_URL = (
  USE_KIOSAPI
    ? (process.env.KIOSAPI_BASE_URL || 'https://api.kiosapi.id/v1')
    : (
        process.env.AI_BASE_URL ||
        (NEON_BASE_URL ? `${NEON_BASE_URL}/v1` : 'https://api.groq.com/openai/v1')
      )
).replace(/\/+$/, '')
const MODEL = USE_KIOSAPI
  ? (process.env.KIOSAPI_MODEL || 'openai/gpt-6-astra')
  : (process.env.AI_MODEL || 'openai/gpt-oss-120b')
// Kiosapi Chat Completions documents a single "model" field.
// Try the flagship first, then fall back only when that model is unavailable.
const KIOSAPI_FALLBACK_MODELS = [
  MODEL,
  'openai/gpt-6.1-sol',
  'openai/gpt-6.1-terra',
].filter((model, index, all) => all.indexOf(model) === index).slice(0, 3)
const API_KEY = USE_KIOSAPI
  ? KIOSAPI_API_KEY
  : (process.env.NEON_AI_GATEWAY_TOKEN || process.env.GROQ_API_KEY || '')

export function aiConfig() {
  return { baseUrl: BASE_URL, model: MODEL, key: API_KEY }
}

export function aiConfigured(): boolean {
  return !isPlaceholder(API_KEY)
}

export type AiMessage = { role: 'system' | 'user' | 'assistant'; content: string }
export type AiOutcome =
  | { ok: true; text: string; model: string }
  | { ok: false; reason: string }

export async function chatWithAi(args: {
  messages: AiMessage[]
  maxTokens?: number
  temperature?: number
}): Promise<AiOutcome> {
  if (isPlaceholder(API_KEY) || !API_KEY) {
    return { ok: false, reason: 'Model AI belum terhubung. Kredensial penyedia AI belum tersedia di server.' }
  }

  const deadline = Date.now() + (USE_KIOSAPI ? 24_000 : 35_000)
  const models = USE_KIOSAPI ? KIOSAPI_FALLBACK_MODELS : [MODEL]
  let lastReason = 'Penyedia model AI tidak mengembalikan jawaban.'

  for (const model of models) {
    const remaining = deadline - Date.now()
    if (remaining <= 1_000) break

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), remaining)
    try {
      const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model,
          temperature: args.temperature ?? 0.4,
          max_tokens: args.maxTokens ?? 1200,
          messages: args.messages,
        }),
        signal: controller.signal,
        cache: 'no-store',
      })

      const body = (await response.json().catch(() => null)) as
        | { model?: string; choices?: { message?: { content?: string | null }; finish_reason?: string }[]; error?: { message?: string } }
        | null

      if (!response.ok) {
        const detail = body?.error?.message
        if (response.status === 401 || response.status === 403) {
          return { ok: false, reason: 'Kredensial atau akses model AI ditolak. Periksa izin akun.' }
        }
        if (response.status === 402) {
          return { ok: false, reason: 'Saldo Kiosapi tidak mencukupi untuk model berbayar.' }
        }
        lastReason = `Model ${model} gagal (${response.status})${detail ? `: ${detail}` : ''}.`
        // Try the next configured model for unavailable models, rate limits, or upstream errors.
        if (![400, 404, 429, 502, 503, 504].includes(response.status)) break
        continue
      }

      const choice = body?.choices?.[0]
      const text = choice?.message?.content?.trim()
      if (!text) {
        lastReason = choice?.finish_reason === 'length'
          ? 'Jawaban model AI terpotong sebelum selesai. Coba pertanyaan yang lebih singkat.'
          : `Model ${model} tidak mengembalikan jawaban.`
        continue
      }
      return { ok: true, text, model: body?.model || model }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        lastReason = 'Model AI melewati batas waktu pengujian.'
        break
      }
      lastReason = 'Tidak bisa menghubungi penyedia model AI. Periksa koneksi lalu coba lagi.'
      break
    } finally {
      clearTimeout(timer)
    }
  }

  return { ok: false, reason: lastReason }
}

export async function askAi(args: { system: string; prompt: string; maxTokens?: number }): Promise<AiOutcome> {
  return chatWithAi({
    messages: [
      { role: 'system', content: args.system },
      { role: 'user', content: args.prompt },
    ],
    maxTokens: args.maxTokens ?? 900,
  })
}
