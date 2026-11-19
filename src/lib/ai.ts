/**
 * Shared OpenAI-compatible chat-completions client.
 * Neon AI Gateway is primary; an already-configured Groq key is the automatic fallback.
 * The fallback reuses an existing credential and is attempted only when the primary fails.
 */
import { isPlaceholder } from './env'

const NEON_BASE_URL = (process.env.NEON_AI_GATEWAY_BASE_URL || '').replace(/\/+$/, '')
const PRIMARY_BASE_URL = (
  process.env.AI_BASE_URL ||
  (NEON_BASE_URL ? `${NEON_BASE_URL}/v1` : 'https://api.groq.com/openai/v1')
).replace(/\/+$/, '')
const PRIMARY_MODEL = process.env.AI_MODEL || 'openai/gpt-oss-120b'
const PRIMARY_KEY = process.env.NEON_AI_GATEWAY_TOKEN || process.env.GROQ_API_KEY || ''
const FALLBACK_KEY = process.env.GROQ_API_KEY || ''
const FALLBACK_BASE_URL = 'https://api.groq.com/openai/v1'
const FALLBACK_MODEL = process.env.AI_FALLBACK_MODEL || 'openai/gpt-oss-120b'
const FALLBACK_ENABLED = true

export function aiConfig() {
  return { baseUrl: PRIMARY_BASE_URL, model: PRIMARY_MODEL, key: PRIMARY_KEY }
}

export function aiConfigured(): boolean {
  const primaryReady = Boolean(PRIMARY_KEY) && !isPlaceholder(PRIMARY_KEY)
  const fallbackReady = Boolean(FALLBACK_KEY) && !isPlaceholder(FALLBACK_KEY)
  return primaryReady || fallbackReady
}

export type AiMessage = { role: 'system' | 'user' | 'assistant'; content: string }
export type AiOutcome =
  | { ok: true; text: string; model: string }
  | { ok: false; reason: string }

type Provider = { baseUrl: string; model: string; key: string; label: string }

async function requestProvider(provider: Provider, args: {
  messages: AiMessage[]
  maxTokens?: number
  temperature?: number
}): Promise<AiOutcome> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25_000)
  try {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.key}`,
      },
      body: JSON.stringify({
        model: provider.model,
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
      const reason = response.status === 401 || response.status === 403
        ? `${provider.label} menolak autentikasi (${response.status})${detail ? `: ${detail.slice(0, 300)}` : '.'}`
        : response.status === 429
          ? `Kuota ${provider.label} tercapai (429).`
          : `${provider.label} menolak permintaan (${response.status})${detail ? `: ${detail.slice(0, 300)}` : '.'}`
      return { ok: false, reason }
    }

    const choice = body?.choices?.[0]
    const text = choice?.message?.content?.trim()
    if (!text) {
      return {
        ok: false,
        reason: choice?.finish_reason === 'length'
          ? 'Jawaban model AI terpotong sebelum selesai. Coba pertanyaan yang lebih singkat.'
          : `${provider.label} tidak mengembalikan jawaban.`,
      }
    }
    return { ok: true, text, model: `${provider.label} / ${provider.model}` }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, reason: `${provider.label} tidak menjawab dalam 25 detik.` }
    }
    return { ok: false, reason: `Tidak bisa menghubungi ${provider.label}.` }
  } finally {
    clearTimeout(timer)
  }
}

function canFailOver(reason: string): boolean {
  return /menolak autentikasi \((401|403)\)|kuota|429|menolak permintaan \(5\d\d\)|tidak bisa menghubungi|tidak menjawab dalam 25 detik/i.test(reason)
}

export async function chatWithAi(args: {
  messages: AiMessage[]
  maxTokens?: number
  temperature?: number
}): Promise<AiOutcome> {
  const primaryKey = isPlaceholder(PRIMARY_KEY) ? '' : PRIMARY_KEY
  const primaryIsConfigured = Boolean(primaryKey)
  const fallbackKey = !isPlaceholder(FALLBACK_KEY) ? FALLBACK_KEY : ''

  if (!primaryIsConfigured && !fallbackKey) {
    return { ok: false, reason: 'Belum ada kredensial model AI utama maupun cadangan di server.' }
  }
  if (!primaryIsConfigured && fallbackKey) {
    return requestProvider({
      baseUrl: FALLBACK_BASE_URL,
      model: FALLBACK_MODEL,
      key: fallbackKey,
      label: 'Groq cadangan',
    }, args)
  }

  const primary: Provider = {
    baseUrl: PRIMARY_BASE_URL,
    model: PRIMARY_MODEL,
    key: primaryKey,
    label: NEON_BASE_URL || process.env.AI_BASE_URL ? 'AI Gateway' : 'Groq',
  }
  const primaryIsGroq = primary.baseUrl.includes('api.groq.com')
  const result = primaryIsConfigured
    ? await requestProvider(primary, args)
    : { ok: false as const, reason: 'Model utama belum dikonfigurasi; mencoba model cadangan.' }
  if (result.ok) return result

  const fallbackAvailable = FALLBACK_ENABLED && !primaryIsGroq && Boolean(fallbackKey)
  if (!fallbackAvailable || (primaryIsConfigured && !canFailOver(result.reason))) return result

  const fallback = await requestProvider({
    baseUrl: FALLBACK_BASE_URL,
    model: FALLBACK_MODEL,
    key: fallbackKey,
    label: 'Groq cadangan',
  }, args)

  if (fallback.ok) return fallback
  return { ok: false, reason: `${result.reason} Jalur cadangan juga gagal: ${fallback.reason}` }
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
