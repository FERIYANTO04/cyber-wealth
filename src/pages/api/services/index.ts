import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { services } from '@/lib/db/schema'
import { requireOwnerSession } from '@/lib/auth'
import { logActivity } from '@/lib/data'

const Body = z.object({
  name: z.string().trim().min(3, 'Nama layanan minimal 3 karakter').max(120),
  summary: z.string().trim().min(10, 'Ringkasan minimal 10 karakter').max(300),
  detail: z.string().trim().min(20, 'Rincian minimal 20 karakter').max(4000),
  category: z.enum(['desain', 'website', 'konten', 'pemasaran', 'video', 'editing', 'motion', 'ai', 'branding', 'social']),
  priceFromIdr: z.coerce.number().int().min(0).max(1_000_000_000),
  deliveryDays: z.coerce.number().int().min(1).max(180),
  status: z.enum(['draft', 'published']).default('draft'),
})

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 70)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireOwnerSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  if (req.method === 'POST') {
    const parsed = Body.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' })

    const base = slugify(parsed.data.name) || `layanan-${Date.now()}`
    let slug = base
    for (let n = 2; n < 40; n += 1) {
      const [taken] = await db.select({ id: services.id }).from(services).where(eq(services.slug, slug)).limit(1)
      if (!taken) break
      slug = `${base}-${n}`
    }

    const [row] = await db
      .insert(services)
      .values({ ...parsed.data, slug, dataSource: 'live' })
      .returning()

    await logActivity({
      actor: 'owner',
      action: 'Layanan jasa ditambahkan',
      detail: `${row.name} — ${row.status === 'published' ? 'tampil di halaman jasa' : 'masih draf'}.`,
    })
    return res.status(201).json({ ok: true, service: { id: row.id, slug: row.slug } })
  }

  if (req.method === 'PATCH') {
    const Patch = z.object({ id: z.string().uuid(), status: z.enum(['draft', 'published', 'archived']) })
    const parsed = Patch.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Permintaan tidak valid.' })

    const [row] = await db.update(services).set({ status: parsed.data.status }).where(eq(services.id, parsed.data.id)).returning()
    if (!row) return res.status(404).json({ error: 'Layanan tidak ditemukan.' })

    await logActivity({ actor: 'owner', action: 'Status layanan diubah', detail: `${row.name} — ${parsed.data.status}.` })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Metode tidak diizinkan' })
}
