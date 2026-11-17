/**
 * The one place an AI model is actually called. It talks to any OpenAI-compatible
 * chat-completions endpoint — pointed here at Groq.
 *
 * Without GROQ_API_KEY nothing is invented: the caller gets `ok: false` with a reason
 * and the screen says so. No agent ever pretends to have thought something through.
 */

import { isPlaceholder } from './env'

const BASE_URL = (process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/+$/, '')
const MODEL = process.env.AI_MODEL || 'openai/gpt-oss-120b'

export function aiConfig() {
  return { baseUrl: BASE_URL, model: MODEL, key: process.env['GROQ_API_KEY'] ?? '' }
}

/** True only when a real key is set — a placeholder is treated as not connected. */
export function aiConfigured(): boolean {
  return !isPlaceholder(process.env['GROQ_API_KEY'])
}

export type AiMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export type AiOutcome =
  | { ok: true; text: string; model: string }
  | { ok: false; reason: string }

/**
 * A reasoning model spends part of its budget thinking, so the ceiling is set generously
 * and the effort kept low: the owner is waiting on this answer.
 */
export async function chatWithAi(args: {
  messages: AiMessage[]
  maxTokens?: number
  temperature?: number
}): Promise<AiOutcome> {
  const key = process.env['GROQ_API_KEY']
  if (isPlaceholder(key) || !key) {
    return {
      ok: false,
      reason: 'Model AI belum terhubung. Isi kunci Groq di pengaturan aplikasi, lalu coba lagi.',
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25_000)
  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: args.temperature ?? 0.4,
        max_tokens: args.maxTokens ?? 1200,
        reasoning_effort: 'low',
        messages: args.messages,
      }),
      signal: controller.signal,
      cache: 'no-store',
    })

    const body = (await response.json().catch(() => null)) as
      | {
          choices?: { message?: { content?: string | null }; finish_reason?: string }[]
          error?: { message?: string }
        }
      | null

    if (!response.ok) {
      const detail = body?.error?.message
      if (response.status === 401 || response.status === 403) {
        return { ok: false, reason: 'Kunci API model AI ditolak penyedia. Periksa kuncinya, lalu coba lagi.' }
      }
      if (response.status === 429) {
        return { ok: false, reason: 'Batas pemakaian model AI tercapai. Tunggu sebentar, lalu coba lagi.' }
      }
      return {
        ok: false,
        reason: `Penyedia model AI menolak permintaan (${response.status})${detail ? `: ${detail}` : ''}.`,
      }
    }

    const choice = body?.choices?.[0]
    const text = choice?.message?.content?.trim()
    if (!text) {
      return {
        ok: false,
        reason:
          choice?.finish_reason === 'length'
            ? 'Jawaban model AI terpotong sebelum selesai. Coba pertanyaan yang lebih singkat.'
            : 'Model AI tidak mengembalikan jawaban. Coba lagi.',
      }
    }
    return { ok: true, text, model: MODEL }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, reason: 'Model AI tidak menjawab dalam 25 detik. Coba lagi.' }
    }
    return { ok: false, reason: 'Tidak bisa menghubungi penyedia model AI. Periksa koneksi lalu coba lagi.' }
  } finally {
    clearTimeout(timer)
  }
}

/** The single-prompt shape every agent uses. */
export async function askAi(args: {
  system: string
  prompt: string
  maxTokens?: number
}): Promise<AiOutcome> {
  return chatWithAi({
    messages: [
      { role: 'system', content: args.system },
      { role: 'user', content: args.prompt },
    ],
    maxTokens: args.maxTokens ?? 900,
  })
}
