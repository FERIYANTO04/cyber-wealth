import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { products } from '@/lib/db/schema'
import { requireOwnerSession } from '@/lib/auth'
import { logActivity } from '@/lib/data'

const Body = z.object({
  name: z.string().trim().min(3, 'Nama produk minimal 3 karakter').max(120),
  summary: z.string().trim().min(10, 'Ringkasan minimal 10 karakter').max(300),
  description: z.string().trim().min(20, 'Deskripsi minimal 20 karakter').max(4000),
  category: z.enum(['template', 'ebook', 'desain', 'materi', 'toolkit', 'video', 'motion', 'audio', 'social']),
  priceIdr: z.coerce.number().int().min(0, 'Harga tidak boleh negatif').max(1_000_000_000),
  deliverableNote: z.string().trim().max(600).optional(),
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

    const base = slugify(parsed.data.name) || `produk-${Date.now()}`
    let slug = base
    for (let n = 2; n < 40; n += 1) {
      const [taken] = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1)
      if (!taken) break
      slug = `${base}-${n}`
    }

    const [row] = await db
      .insert(products)
      .values({
        slug,
        name: parsed.data.name,
        summary: parsed.data.summary,
        description: parsed.data.description,
        category: parsed.data.category,
        priceIdr: parsed.data.priceIdr,
        deliverableNote: parsed.data.deliverableNote || null,
        status: parsed.data.status,
        dataSource: 'live',
      })
      .returning()

    await logActivity({
      actor: 'owner',
      action: 'Produk digital ditambahkan',
      detail: `${row.name} — ${row.status === 'published' ? 'terbit di katalog' : 'masih draf'}.`,
    })

    return res.status(201).json({ ok: true, product: { id: row.id, slug: row.slug } })
  }

  if (req.method === 'PATCH') {
    const Patch = z.object({
      id: z.string().uuid(),
      status: z.enum(['draft', 'published', 'archived']),
    })
    const parsed = Patch.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Permintaan tidak valid.' })

    const [row] = await db
      .update(products)
      .set({ status: parsed.data.status })
      .where(eq(products.id, parsed.data.id))
      .returning()
    if (!row) return res.status(404).json({ error: 'Produk tidak ditemukan.' })

    await logActivity({
      actor: 'owner',
      action: parsed.data.status === 'published' ? 'Produk diterbitkan' : 'Status produk diubah',
      detail: `${row.name} — ${parsed.data.status}.`,
    })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Metode tidak diizinkan' })
}
