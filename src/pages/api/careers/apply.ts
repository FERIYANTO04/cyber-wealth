import type { NextApiRequest, NextApiResponse } from 'next'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { sqlClient } from '@/lib/db'
import { requireOwnerSession } from '@/lib/auth'
import { notifyOwner, sendEmail } from '@/lib/email'
import { logActivity } from '@/lib/data'

const Application = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  role: z.enum(['Video editor', 'Graphic designer', 'Motion designer', 'AI creative operator', 'Creative producer', 'Freelance specialist']),
  portfolio: z.string().trim().max(500).optional().refine((value) => !value || /^https?:\/\//i.test(value), 'Portofolio harus berupa tautan HTTP atau HTTPS.'),
  experience: z.string().trim().min(20).max(2000),
  message: z.string().trim().min(20).max(3000),
  consent: z.literal(true),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const parsed = Application.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Data lamaran belum lengkap.' })
    const { consent, ...data } = parsed.data
    const id = randomUUID()
    const [row] = await sqlClient`
      INSERT INTO "talent_application" ("id","name","email","role","portfolio","experience","message","status")
      VALUES (${id},${data.name},${data.email},${data.role},${data.portfolio || null},${data.experience},${data.message},'new')
      RETURNING *
    `
    await logActivity({ actor: 'system', action: 'Lamaran talenta masuk', detail: `${row.name} — ${row.role}. Menunggu peninjauan owner.` })
    await notifyOwner({
      subject: `Lamaran talenta baru: ${row.role}`,
      lines: [`Nama: ${row.name}`, `Email: ${row.email}`, `Posisi: ${row.role}`, `Portofolio: ${row.portfolio || '-'}`, '', row.experience, '', row.message, '', 'Status: belum direkrut; menunggu peninjauan.'],
      kind: 'talent-application',
      relatedId: row.id,
    }).catch(() => undefined)
    await sendEmail({
      to: row.email,
      subject: 'Lamaran Anda diterima — Cyber Wealth',
      body: [`Halo ${row.name},`, '', 'Terima kasih telah mengirimkan profil ke Cyber Wealth. Data Anda sudah kami terima dan akan ditinjau untuk kebutuhan proyek yang sesuai.', 'Pengiriman lamaran bukan merupakan tawaran kerja atau janji perekrutan.', '', 'Cyber Wealth'].join('\n'),
      kind: 'talent-receipt',
      relatedType: 'talent-application',
      relatedId: row.id,
    }).catch(() => undefined)
    return res.status(201).json({ ok: true, code: row.id.slice(0, 8).toUpperCase() })
  }

  const session = await requireOwnerSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi owner tidak ditemukan.' })
  if (req.method === 'PATCH') {
    const parsed = z.object({ id: z.string().uuid(), status: z.enum(['new', 'reviewing', 'interview', 'accepted', 'rejected']) }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Status lamaran tidak valid.' })
    const [row] = await sqlClient`UPDATE "talent_application" SET "status"=${parsed.data.status},"updated_at"=now() WHERE "id"=${parsed.data.id} RETURNING "id","name","status"`
    if (!row) return res.status(404).json({ error: 'Lamaran tidak ditemukan.' })
    await logActivity({ actor: 'owner', action: 'Status kandidat diperbarui', detail: `${row.name} — ${row.status}.` })
    return res.status(200).json({ ok: true })
  }
  if (req.method === 'GET') {
    const rows = await sqlClient`SELECT * FROM "talent_application" ORDER BY "created_at" DESC LIMIT 100`
    return res.status(200).json({ applications: rows })
  }
  res.setHeader('Allow', 'GET, POST, PATCH')
  return res.status(405).json({ error: 'Metode tidak diizinkan.' })
}
