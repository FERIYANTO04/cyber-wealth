import type { NextApiRequest, NextApiResponse } from 'next'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { sqlClient } from '@/lib/db'
import { requireOwnerSession } from '@/lib/auth'

const Checklist = z.object({
  brief_match: z.boolean(),
  visual_quality: z.boolean(),
  audio_quality: z.boolean(),
  spelling_brand: z.boolean(),
  rights_clearance: z.boolean(),
})
const Body = z.object({
  status: z.enum(['queued','assigned','in_production','internal_review','client_review','revision','approved','delivered','cancelled']).optional(),
  priority: z.enum(['low','normal','high','urgent']).optional(),
  assignedType: z.enum(['unassigned','human','ai','hybrid']).optional(),
  assignedTo: z.string().trim().max(120).nullable().optional(),
  assignedRole: z.string().trim().max(120).nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  agreedPriceIdr: z.number().int().min(0).max(10000000000).optional(),
  revisionLimit: z.number().int().min(0).max(20).optional(),
  deliverableUrl: z.string().url().max(1000).refine(v => v.startsWith('https://'), 'Tautan hasil harus HTTPS.').nullable().optional(),
  internalNotes: z.string().trim().max(5000).nullable().optional(),
  qualityChecklist: Checklist.optional(),
  clientApproved: z.boolean().optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireOwnerSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi owner tidak ditemukan.' })
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH')
    return res.status(405).json({ error: 'Metode tidak diizinkan.' })
  }
  const id = String(req.query.id ?? '')
  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Data proyek tidak valid.' })
  const [current] = await sqlClient`SELECT * FROM "creative_project" WHERE id=${id} LIMIT 1`
  if (!current) return res.status(404).json({ error: 'Proyek tidak ditemukan.' })

  const patch = parsed.data
  const next = {
    status: patch.status ?? current.status,
    priority: patch.priority ?? current.priority,
    assignedType: patch.assignedType ?? current.assigned_type,
    assignedTo: patch.assignedTo === undefined ? current.assigned_to : patch.assignedTo,
    assignedRole: patch.assignedRole === undefined ? current.assigned_role : patch.assignedRole,
    dueAt: patch.dueAt === undefined ? current.due_at : patch.dueAt,
    agreedPriceIdr: patch.agreedPriceIdr ?? Number(current.agreed_price_idr),
    revisionLimit: patch.revisionLimit ?? current.revision_limit,
    deliverableUrl: patch.status === 'revision' && current.status !== 'revision' ? null : (patch.deliverableUrl === undefined ? current.deliverable_url : patch.deliverableUrl),
    internalNotes: patch.internalNotes === undefined ? current.internal_notes : patch.internalNotes,
    qualityChecklist: patch.status === 'revision' && current.status !== 'revision' ? { brief_match: false, visual_quality: false, audio_quality: false, spelling_brand: false, rights_clearance: false } : (patch.qualityChecklist ?? current.quality_checklist),
    clientApprovedAt: patch.clientApproved === undefined ? current.client_approved_at : (patch.clientApproved ? (current.client_approved_at ?? new Date()) : null),
    revisionsUsed: Number(current.revisions_used) + (patch.status === 'revision' && current.status !== 'revision' ? 1 : 0),
  }

  if (next.assignedType !== 'unassigned' && (!next.assignedTo || !next.assignedRole)) {
    return res.status(409).json({ error: 'Isi nama penanggung jawab dan keahliannya sebelum menetapkan jenis penugasan.' })
  }
  if (['assigned','in_production','internal_review','client_review','revision'].includes(next.status) && next.assignedType === 'unassigned') {
    return res.status(409).json({ error: 'Tetapkan penanggung jawab sebelum proyek masuk produksi.' })
  }
  if (next.status === 'client_review') {
    const checks = next.qualityChecklist as Record<string, boolean>
    if (!Object.values(checks).every(Boolean) || !next.deliverableUrl) {
      return res.status(409).json({ error: 'Belum lolos pemeriksaan internal. Lengkapi seluruh checklist dan tautan hasil HTTPS.' })
    }
  }
  if (next.status === 'revision' && next.revisionsUsed > next.revisionLimit) {
    return res.status(409).json({ error: 'Batas revisi yang disepakati sudah habis. Minta persetujuan biaya tambahan sebelum revisi baru.' })
  }
  if (next.status === 'approved' && !next.clientApprovedAt) {
    return res.status(409).json({ error: 'Catat persetujuan klien terlebih dahulu setelah konfirmasi benar-benar diterima.' })
  }
  if (next.status === 'delivered' && (!next.clientApprovedAt || !next.deliverableUrl)) {
    return res.status(409).json({ error: 'Penyerahan final memerlukan persetujuan klien dan tautan hasil.' })
  }

  const changes = Object.keys(patch).join(', ')
  await sqlClient.begin(async (tx) => {
    await tx`UPDATE "creative_project" SET
      status=${next.status}, priority=${next.priority}, assigned_type=${next.assignedType},
      assigned_to=${next.assignedTo}, assigned_role=${next.assignedRole}, due_at=${next.dueAt ? new Date(next.dueAt) : null},
      agreed_price_idr=${next.agreedPriceIdr}, revision_limit=${next.revisionLimit}, revisions_used=${next.revisionsUsed},
      quality_checklist=${JSON.stringify(next.qualityChecklist)}::jsonb, deliverable_url=${next.deliverableUrl},
      client_approved_at=${next.clientApprovedAt}, internal_notes=${next.internalNotes}, updated_at=now()
      WHERE id=${id}`
    await tx`INSERT INTO "creative_project_event" ("id","project_id","actor","event_type","detail") VALUES
      (${randomUUID()},${id},'owner',${patch.status ? 'status_changed' : 'project_updated'},${'Pembaruan: '+changes+'. Status '+current.status+' → '+next.status+'.'})`
  })
  const [updated] = await sqlClient`SELECT * FROM "creative_project" WHERE id=${id} LIMIT 1`
  return res.status(200).json({ ok: true, project: updated })
}
