import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { plans } from '@/lib/db/schema'
import { requireOwnerSession } from '@/lib/auth'
import { logActivity } from '@/lib/data'

const Body = z.object({
  name: z.string().trim().min(2, 'Nama paket minimal 2 karakter').max(80),
  summary: z.string().trim().min(10, 'Ringkasan minimal 10 karakter').max(300),
  features: z.string().trim().min(3, 'Tulis minimal satu fitur').max(2000),
  priceIdr: z.coerce.number().int().min(0, 'Harga tidak boleh negatif').max(1_000_000_000),
  interval: z.enum(['month', 'year']).default('month'),
  serviceId: z.string().trim().max(80).optional(),
  status: z.enum(['draft', 'published']).default('published'),
})

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireOwnerSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  if (req.method === 'POST') {
    const parsed = Body.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' })

    const base = slugify(parsed.data.name) || 'paket'
    let code = base
    for (let n = 2; n < 40; n += 1) {
      const [taken] = await db.select({ id: plans.id }).from(plans).where(eq(plans.code, code)).limit(1)
      if (!taken) break
      code = `${base}-${n}`
    }

    const [row] = await db
      .insert(plans)
      .values({
        code,
        name: parsed.data.name,
        summary: parsed.data.summary,
        features: parsed.data.features,
        priceIdr: parsed.data.priceIdr,
        interval: parsed.data.interval,
        serviceId: parsed.data.serviceId || null,
        status: parsed.data.status,
      })
      .returning()

    await logActivity({
      actor: 'owner',
      action: 'Paket langganan dibuat',
      detail: `${row.name} — Rp ${parsed.data.priceIdr.toLocaleString('id-ID')}/${parsed.data.interval === 'year' ? 'tahun' : 'bulan'}, ${row.status}.`,
    })
    return res.status(201).json({ ok: true, code: row.code })
  }

  if (req.method === 'PATCH') {
    const Patch = z
      .object({
        id: z.string().trim().min(1).max(64),
        status: z.enum(['draft', 'published', 'archived']).optional(),
        priceIdr: z.coerce.number().int().min(0, 'Harga tidak boleh negatif').max(1_000_000_000).optional(),
      })
      .refine((value) => value.status !== undefined || value.priceIdr !== undefined, {
        message: 'Tidak ada perubahan yang dikirim.',
      })
    const parsed = Patch.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Permintaan tidak valid.' })

    const patch: { status?: string; priceIdr?: number } = {}
    if (parsed.data.status) patch.status = parsed.data.status
    if (parsed.data.priceIdr !== undefined) patch.priceIdr = parsed.data.priceIdr

    const [row] = await db.update(plans).set(patch).where(eq(plans.id, parsed.data.id)).returning()
    if (!row) return res.status(404).json({ error: 'Paket tidak ditemukan.' })

    await logActivity({
      actor: 'owner',
      action: parsed.data.priceIdr !== undefined ? 'Harga paket diubah' : 'Status paket diubah',
      detail:
        parsed.data.priceIdr !== undefined
          ? `${row.name} — Rp ${parsed.data.priceIdr.toLocaleString('id-ID')} per ${row.interval === 'year' ? 'tahun' : 'bulan'}.`
          : `${row.name} — ${row.status}.`,
    })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Metode tidak diizinkan' })
}
