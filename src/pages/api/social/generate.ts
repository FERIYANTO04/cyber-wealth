import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { generatePosts } from '@/lib/social'
import { CHANNELS, MARKETS, type ChannelKey } from '@/lib/labels'

const Body = z.object({
  markets: z.array(z.enum(MARKETS.map((m) => m.key) as [string, ...string[]])).max(2).optional(),
  channels: z
    .array(z.enum(CHANNELS.map((c) => c.key) as [string, ...string[]]))
    .max(5)
    .optional(),
  limit: z.coerce.number().int().min(1).max(20).optional(),
})

/** Writes drafts. Every one of them waits for the owner; nothing is scheduled or sent. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const session = await getSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  const parsed = Body.safeParse(req.body ?? {})
  if (!parsed.success) return res.status(400).json({ error: 'Pilihan pasar atau kanal tidak valid.' })

  try {
    const result = await generatePosts({
      markets: parsed.data.markets,
      channels: parsed.data.channels as ChannelKey[] | undefined,
      limit: parsed.data.limit,
    })
    return res.status(200).json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Kesalahan tidak diketahui'
    console.error('[social generate]', message)
    return res.status(500).json({ error: `Draf konten tidak bisa dibuat: ${message}` })
  }
}
