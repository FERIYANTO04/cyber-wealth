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
  ? (process.env.KIOSAPI_MODEL || 'meta/llama-3.1-8b')
  : (process.env.AI_MODEL || 'openai/gpt-oss-120b')
// Kiosapi supports provider-side fallback through the "models" field.
// These are documented free models; the gateway only falls back if the first fails.
const KIOSAPI_FALLBACK_MODELS = [
  MODEL,
  'qwen/qwen3-30b',
  'zai/glm-4.7-flash',
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

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), USE_KIOSAPI ? 70_000 : 35_000)
  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        ...(USE_KIOSAPI ? { models: KIOSAPI_FALLBACK_MODELS } : { model: MODEL }),
        temperature: args.temperature ?? 0.4,
        max_tokens: args.maxTokens ?? 1200,
        messages: args.messages,
      }),
      signal: controller.signal,
      cache: 'no-store',
    })

    const body = (await response.json().catch(() => null)) as
      | { choices?: { message?: { content?: string | null }; finish_reason?: string }[]; error?: { message?: string } }
      | null

    if (!response.ok) {
      const detail = body?.error?.message
      if (response.status === 401 || response.status === 403) {
        return { ok: false, reason: 'Kredensial atau akses model AI ditolak. Periksa izin dan kredit akun.' }
      }
      if (response.status === 429) {
        return { ok: false, reason: 'Batas pemakaian model AI tercapai. Periksa kredit atau kuota akun.' }
      }
      return { ok: false, reason: `Penyedia model AI menolak permintaan (${response.status})${detail ? `: ${detail}` : ''}.` }
    }

    const choice = body?.choices?.[0]
    const text = choice?.message?.content?.trim()
    if (!text) {
      return {
        ok: false,
        reason: choice?.finish_reason === 'length'
          ? 'Jawaban model AI terpotong sebelum selesai. Coba pertanyaan yang lebih singkat.'
          : 'Model AI tidak mengembalikan jawaban. Coba lagi.',
      }
    }
    return { ok: true, text, model: response.headers.get('X-Kiosapi-Model-Used') || MODEL }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, reason: 'Model AI tidak menjawab setelah batas waktu. Coba lagi.' }
    }
    return { ok: false, reason: 'Tidak bisa menghubungi penyedia model AI. Periksa koneksi lalu coba lagi.' }
  } finally {
    clearTimeout(timer)
  }
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
