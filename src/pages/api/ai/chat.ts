import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { products } from '@/lib/db/schema'
import { requireOwnerSession } from '@/lib/auth'
import { getFinance, getCounts, getSettings } from '@/lib/data'
import { getOrderCounts } from '@/lib/revenue'
import { getSaasTotals } from '@/lib/saas'
import { getChatTurns, askAssistant, assistantBrief } from '@/lib/ai-chat'
import { aiConfigured } from '@/lib/ai'
import { logActivity } from '@/lib/data'

const Body = z.object({
  message: z.string().trim().min(1, 'Tulis pertanyaan Anda lebih dulu.').max(2000, 'Pertanyaan terlalu panjang.'),
})

// One instance answering many browsers: a light per-instance guard, so a loop in one
// tab cannot burn the provider's quota. It is a courtesy limit, not the real control.
const recent: number[] = []
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 12

function overBudget(): boolean {
  const now = Date.now()
  while (recent.length > 0 && now - recent[0]! > WINDOW_MS) recent.shift()
  if (recent.length >= MAX_PER_WINDOW) return true
  recent.push(now)
  return false
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')

  const session = await requireOwnerSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi pemilik tidak ditemukan. Silakan masuk.' })

  if (req.method === 'GET') {
    const turns = await getChatTurns(session.email)
    return res.status(200).json({ configured: aiConfigured(), turns })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Metode tidak diizinkan.' })
  }

  if (!aiConfigured()) {
    return res.status(503).json({
      error:
        'Model AI belum terhubung di server ini. Kredensial AI Gateway belum tersedia.',
      configured: false,
    })
  }

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Pesan tidak valid.' })
  }
  if (overBudget()) {
    return res.status(429).json({ error: 'Terlalu banyak pertanyaan berturut-turut. Tunggu semenit lalu coba lagi.' })
  }

  // Awaited one at a time: the published app's single connection cannot multiplex.
  const finance = await getFinance()
  const counts = await getCounts()
  const orders = await getOrderCounts()
  const saas = await getSaasTotals()
  const settings = await getSettings()
  const published = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(and(eq(products.status, 'published'), eq(products.dataSource, 'live')))

  const system = assistantBrief({
    netWorthIdr: finance.live.netWorth,
    revenueIdr: orders.revenueIdr,
    paidOrders: orders.paid,
    activeSubscriptions: saas.active,
    pendingApprovals: counts.pending,
    publishedProducts: published[0]?.n ?? 0,
    paused: settings.aiPaused,
  })

  const reply = await askAssistant({ ownerEmail: session.email, message: parsed.data.message, system })
  if (!reply.ok) return res.status(502).json({ error: reply.error })

  await logActivity({
    actor: 'owner',
    action: 'Bertanya ke asisten AI',
    detail: `${parsed.data.message.slice(0, 160)}${parsed.data.message.length > 160 ? '…' : ''}`,
  })

  return res.status(200).json({ ok: true, answer: reply.answer })
}
