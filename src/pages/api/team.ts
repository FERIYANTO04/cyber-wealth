import type { NextApiRequest, NextApiResponse } from 'next'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { sqlClient } from '@/lib/db'
import { requireOwnerSession } from '@/lib/auth'
import { logActivity } from '@/lib/data'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireOwnerSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi owner tidak ditemukan.' })

  if (req.method === 'GET') {
    const [members, eligible] = await Promise.all([
      sqlClient`SELECT * FROM "team_member" ORDER BY CASE WHEN status='active' THEN 0 WHEN status='paused' THEN 1 ELSE 2 END, joined_at DESC LIMIT 200`,
      sqlClient`SELECT a.id,a.name,a.email,a.role,a.portfolio,a.status,a.created_at FROM "talent_application" a WHERE a.status='accepted' AND NOT EXISTS (SELECT 1 FROM "team_member" m WHERE m.talent_application_id=a.id) ORDER BY a.created_at ASC LIMIT 100`
    ])
    return res.status(200).json({ members, eligible })
  }

  if (req.method === 'POST') {
    const parsed = z.object({
      applicationId: z.string().uuid(),
      employmentType: z.enum(['employee','contractor','freelance']).default('freelance')
    }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Data onboarding tidak valid.' })
    const [candidate] = await sqlClient`SELECT * FROM "talent_application" WHERE id=${parsed.data.applicationId} AND status='accepted' LIMIT 1`
    if (!candidate) return res.status(409).json({ error: 'Kandidat harus berstatus disetujui sebelum masuk roster.' })
    const id = randomUUID()
    try {
      await sqlClient`
        INSERT INTO "team_member" ("id","talent_application_id","name","email","role","portfolio","employment_type")
        VALUES (${id},${candidate.id},${candidate.name},${candidate.email},${candidate.role},${candidate.portfolio},${parsed.data.employmentType})
      `
    } catch {
      const [existing] = await sqlClient`SELECT id FROM "team_member" WHERE talent_application_id=${candidate.id} LIMIT 1`
      if (existing) return res.status(409).json({ error: 'Kandidat ini sudah tercatat di roster.', memberId: existing.id })
      throw new Error('Gagal membuat catatan onboarding.')
    }
    await logActivity({ actor: 'owner', action: 'Anggota tim dicatat', detail: candidate.name + ' — ' + candidate.role + ' (' + parsed.data.employmentType + ').' })
    return res.status(201).json({ ok: true, id })
  }

  if (req.method === 'PATCH') {
    const parsed = z.object({
      id: z.string().uuid(),
      status: z.enum(['active','paused','offboarded']).optional(),
      employmentType: z.enum(['employee','contractor','freelance']).optional(),
      notes: z.string().trim().max(2000).nullable().optional()
    }).refine(v => v.status !== undefined || v.employmentType !== undefined || v.notes !== undefined).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Perubahan roster tidak valid.' })
    const [current] = await sqlClient`SELECT * FROM "team_member" WHERE id=${parsed.data.id} LIMIT 1`
    if (!current) return res.status(404).json({ error: 'Anggota tim tidak ditemukan.' })
    const nextStatus = parsed.data.status ?? current.status
    const nextType = parsed.data.employmentType ?? current.employment_type
    const nextNotes = parsed.data.notes === undefined ? current.notes : parsed.data.notes
    const [row] = await sqlClient`UPDATE "team_member" SET status=${nextStatus},employment_type=${nextType},notes=${nextNotes},updated_at=now() WHERE id=${parsed.data.id} RETURNING id,name,role,status,employment_type`
    await logActivity({ actor: 'owner', action: 'Roster tim diperbarui', detail: row.name + ' — ' + row.status + ', ' + row.employment_type + '.' })
    return res.status(200).json({ ok: true, member: row })
  }

  res.setHeader('Allow', 'GET, POST, PATCH')
  return res.status(405).json({ error: 'Metode tidak diizinkan.' })
}
