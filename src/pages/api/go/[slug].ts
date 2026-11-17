import type { NextApiRequest, NextApiResponse } from 'next'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { affiliateLinks, postTracks } from '@/lib/db/schema'

/**
 * The redirect for tracked affiliate links and for links attached to published social
 * content. Every hit is counted here — the count is this app's own observation, nothing
 * more. It does not claim a conversion or a commission; those only exist once the
 * network's own report says so, or a payment provider confirms a sale.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const slug = String(req.query.slug ?? '')

  const [track] = await db.select().from(postTracks).where(eq(postTracks.code, slug)).limit(1)
  if (track) {
    await db
      .update(postTracks)
      .set({ clicks: sql`${postTracks.clicks} + 1` })
      .where(eq(postTracks.id, track.id))
    // The code rides along so a sale started from here can be attributed to the post.
    res.setHeader('Set-Cookie', `cwa_ref=${track.code}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`)
    res.setHeader('Cache-Control', 'no-store')
    return res.redirect(302, `${track.destination}?ref=${encodeURIComponent(track.code)}`)
  }

  const [link] = await db.select().from(affiliateLinks).where(eq(affiliateLinks.slug, slug)).limit(1)
  if (!link) return res.status(404).json({ error: 'Tautan tidak ditemukan.' })

  let destination: URL
  try {
    destination = new URL(link.destinationUrl)
  } catch {
    return res.status(500).json({ error: 'Tautan tujuan tidak valid.' })
  }
  if (destination.protocol !== 'https:' && destination.protocol !== 'http:') {
    return res.status(400).json({ error: 'Tautan tujuan tidak valid.' })
  }

  await db
    .update(affiliateLinks)
    .set({ clicks: sql`${affiliateLinks.clicks} + 1` })
    .where(eq(affiliateLinks.id, link.id))

  res.setHeader('Cache-Control', 'no-store')
  return res.redirect(302, destination.toString())
}
