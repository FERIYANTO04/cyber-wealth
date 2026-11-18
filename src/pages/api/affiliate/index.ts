import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { affiliateCommissions, affiliateLinks, affiliatePrograms } from '@/lib/db/schema'
import { requireOwnerSession } from '@/lib/auth'
import { logActivity } from '@/lib/data'

const ProgramBody = z.object({
  kind: z.literal('program'),
  name: z.string().trim().min(2, 'Nama program minimal 2 karakter').max(120),
  network: z.string().trim().min(2, 'Jaringan affiliate wajib diisi').max(80),
  signupUrl: z.string().trim().url('Alamat pendaftaran harus berupa tautan lengkap').max(400),
  commissionNote: z.string().trim().min(5, 'Jelaskan skema komisinya').max(300),
  commissionRate: z.string().trim().max(60).optional(),
  market: z.enum(['Indonesia', 'International']).default('International'),
})

const LinkBody = z.object({
  kind: z.literal('link'),
  programId: z.string().uuid(),
  label: z.string().trim().min(2, 'Nama tautan wajib diisi').max(120),
  destinationUrl: z.string().trim().url('Alamat tujuan harus berupa tautan lengkap').max(600),
  channel: z.string().trim().max(60).default('konten'),
})

const CommissionBody = z.object({
  kind: z.literal('commission'),
  programId: z.string().uuid(),
  linkId: z.string().uuid().optional(),
  amountIdr: z.coerce.number().int().positive('Komisi harus lebih dari nol').max(1_000_000_000),
  periodLabel: z.string().trim().min(2, 'Isi periode laporan, misalnya "Mei 2026"').max(60),
  note: z.string().trim().max(300).optional(),
})

const Body = z.discriminatedUnion('kind', [ProgramBody, LinkBody, CommissionBody])

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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const session = await requireOwnerSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' })
  const data = parsed.data

  if (data.kind === 'program') {
    const [row] = await db
      .insert(affiliatePrograms)
      .values({
        name: data.name,
        network: data.network,
        signupUrl: data.signupUrl,
        commissionNote: data.commissionNote,
        commissionRate: data.commissionRate || null,
        market: data.market,
        status: 'candidate',
        dataSource: 'live',
      })
      .returning()
    await logActivity({
      actor: 'owner',
      action: 'Program affiliate ditambahkan',
      detail: `${row.name} (${row.network}) — daftar lewat ${row.signupUrl}. Belum ada komisi tercatat.`,
    })
    return res.status(201).json({ ok: true, id: row.id })
  }

  if (data.kind === 'link') {
    const [program] = await db.select().from(affiliatePrograms).where(eq(affiliatePrograms.id, data.programId)).limit(1)
    if (!program) return res.status(404).json({ error: 'Program affiliate tidak ditemukan.' })

    const base = slugify(data.label) || 'tautan'
    let slug = base
    for (let n = 2; n < 60; n += 1) {
      const [taken] = await db.select({ id: affiliateLinks.id }).from(affiliateLinks).where(eq(affiliateLinks.slug, slug)).limit(1)
      if (!taken) break
      slug = `${base}-${n}`
    }

    const [row] = await db
      .insert(affiliateLinks)
      .values({
        programId: program.id,
        slug,
        label: data.label,
        destinationUrl: data.destinationUrl,
        channel: data.channel,
      })
      .returning()

    await logActivity({
      actor: 'owner',
      action: 'Tautan affiliate dibuat',
      detail: `${row.label} → /go/${row.slug}. Klik dihitung oleh aplikasi; komisi tidak.`,
    })
    return res.status(201).json({ ok: true, slug: row.slug })
  }

  const [program] = await db.select().from(affiliatePrograms).where(eq(affiliatePrograms.id, data.programId)).limit(1)
  if (!program) return res.status(404).json({ error: 'Program affiliate tidak ditemukan.' })

  const [row] = await db
    .insert(affiliateCommissions)
    .values({
      programId: program.id,
      linkId: data.linkId ?? null,
      amountIdr: data.amountIdr,
      periodLabel: data.periodLabel,
      status: 'reported',
      note: data.note || null,
    })
    .returning()

  await logActivity({
    actor: 'owner',
    action: 'Komisi affiliate dicatat dari laporan jaringan',
    detail: `${program.name} — ${data.periodLabel}, Rp ${data.amountIdr.toLocaleString('id-ID')}. Angka dari laporan resmi jaringan, bukan perkiraan.`,
  })

  return res.status(201).json({ ok: true, id: row.id })
}
