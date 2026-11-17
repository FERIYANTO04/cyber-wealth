import { desc, eq } from 'drizzle-orm'
import { db } from './db'
import { aiChatMessages } from './db/schema'
import { chatWithAi, type AiMessage } from './ai'

const TURNS = 12

export type ChatTurn = { id: string; role: 'user' | 'assistant'; content: string; createdAt: string }

/** The owner's own transcript, newest last so it reads like a conversation. */
export async function getChatTurns(ownerEmail: string): Promise<ChatTurn[]> {
  const rows = await db
    .select()
    .from(aiChatMessages)
    .where(eq(aiChatMessages.ownerEmail, ownerEmail))
    .orderBy(desc(aiChatMessages.createdAt))
    .limit(TURNS)

  return rows
    .reverse()
    .map((row) => ({
      id: row.id,
      role: row.role === 'assistant' ? 'assistant' : 'user',
      content: row.content,
      createdAt: row.createdAt.toISOString(),
    }))
}

export type ChatReply = { ok: true; answer: ChatTurn } | { ok: false; error: string }

/**
 * Saves the question, sends the recent transcript plus it to the model, and saves the
 * answer only when the model actually produced one. A failure stores nothing extra and
 * answers with a plain reason.
 */
export async function askAssistant(args: {
  ownerEmail: string
  message: string
  system: string
}): Promise<ChatReply> {
  const [question] = await db
    .insert(aiChatMessages)
    .values({ role: 'user', content: args.message, ownerEmail: args.ownerEmail })
    .returning()

  const history = await getChatTurns(args.ownerEmail)
  const messages: AiMessage[] = [
    { role: 'system', content: args.system },
    ...history.slice(0, -1).map((turn) => ({ role: turn.role, content: turn.content }) as AiMessage),
    { role: 'user', content: args.message },
  ]

  const outcome = await chatWithAi({ messages, maxTokens: 1500 })
  if (!outcome.ok) return { ok: false, error: outcome.reason }

  const [answer] = await db
    .insert(aiChatMessages)
    .values({
      role: 'assistant',
      content: outcome.text,
      model: outcome.model,
      ownerEmail: args.ownerEmail,
    })
    .returning()

  return {
    ok: true,
    answer: {
      id: answer?.id ?? question?.id ?? '',
      role: 'assistant',
      content: outcome.text,
      createdAt: (answer?.createdAt ?? new Date()).toISOString(),
    },
  }
}

/** What the owner asked the assistant to think about: only the facts they can verify. */
export function assistantBrief(facts: {
  netWorthIdr: number
  revenueIdr: number
  paidOrders: number
  activeSubscriptions: number
  pendingApprovals: number
  publishedProducts: number
  paused: boolean
}): string {
  return [
    'Kamu adalah penasihat bisnis di dalam aplikasi "Cyber Wealth Autopilot", milik satu pemilik usaha digital di Indonesia.',
    'Jawab dalam bahasa Indonesia yang jelas dan ringkas. Pakai poin-poin bila membantu. Jangan bertele-tele.',
    'Kamu hanya boleh menyebut angka yang diberikan di bawah ini. Bila sebuah angka tidak ada, katakan datanya belum ada — jangan mengarang.',
    'Jangan pernah menjanjikan hasil pasti, dan jangan menyebut kamu sudah melakukan sesuatu di aplikasi; kamu hanya memberi saran yang bisa dijalankan pemilik.',
    'Bila pemilik bertanya soal pembayaran, langganan, atau email: sebutkan bahwa fitur itu baru aktif setelah kuncinya diisi di pengaturan.',
    '',
    'Keadaan aplikasi saat ini:',
    `- Kekayaan bersih tercatat: Rp ${facts.netWorthIdr.toLocaleString('id-ID')}`,
    `- Pendapatan terkonfirmasi: Rp ${facts.revenueIdr.toLocaleString('id-ID')} dari ${facts.paidOrders} pesanan lunas`,
    `- Langganan aktif: ${facts.activeSubscriptions}`,
    `- Produk terbit di katalog: ${facts.publishedProducts}`,
    `- Usulan menunggu keputusan pemilik: ${facts.pendingApprovals}`,
    `- Autopilot: ${facts.paused ? 'sedang dijeda' : 'berjalan'}`,
  ].join('\n')
}
