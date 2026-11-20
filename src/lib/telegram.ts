type TelegramApiResult = { ok: boolean; description?: string; result?: any }

async function telegramRequest(method: string, body?: Record<string, unknown>): Promise<TelegramApiResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return { ok: false, description: 'TELEGRAM_BOT_TOKEN belum dikonfigurasi.' }
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.ok !== true) return { ok: false, description: data.description ?? `Telegram HTTP ${response.status}` }
  return data
}

export async function telegramReady(): Promise<boolean> {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return false
  const [me, chat] = await Promise.all([
    telegramRequest('getMe'),
    telegramRequest('getChat', { chat_id: process.env.TELEGRAM_CHAT_ID }),
  ])
  return me.ok && chat.ok
}

export async function publishToTelegram(text: string): Promise<
  { ok: true; messageId: string; url: string } | { ok: false; reason: string }
> {
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!chatId) return { ok: false, reason: 'TELEGRAM_CHAT_ID belum dikonfigurasi.' }
  if (!text.trim()) return { ok: false, reason: 'Konten kosong.' }
  const result = await telegramRequest('sendMessage', {
    chat_id: chatId,
    text: text.slice(0, 4096),
    disable_web_page_preview: false,
  })
  if (!result.ok) return { ok: false, reason: result.description ?? 'Telegram API gagal.' }
  const message = result.result
  const chat = message?.chat
  const messageId = String(message?.message_id ?? '')
  if (!messageId) return { ok: false, reason: 'Telegram tidak mengembalikan message_id.' }
  const username = typeof chat?.username === 'string' ? chat.username : null
  const url = username ? `https://t.me/${username}/${messageId}` : `https://t.me/c/${String(chat?.id ?? '').replace('-100', '')}/${messageId}`
  return { ok: true, messageId, url }
}
