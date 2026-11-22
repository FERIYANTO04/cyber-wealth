import type { NextApiRequest, NextApiResponse } from 'next'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { sqlClient } from '@/lib/db'
import { requireOwnerSession } from '@/lib/auth'

const CreateBody = z.object({ requestId: z.string().uuid() })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireOwnerSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi owner tidak ditemukan.' })

  if (req.method === 'GET') {
    const [projects, eligible] = await Promise.all([
      sqlClient`SELECT * FROM "creative_project" ORDER BY CASE WHEN status IN ('delivered','cancelled') THEN 1 ELSE 0 END, due_at ASC NULLS LAST, updated_at DESC LIMIT 100`,
      sqlClient`SELECT id,code,"service_name",name,email,brief,status,created_at FROM "service_request" WHERE status='won' AND NOT EXISTS (SELECT 1 FROM "creative_project" p WHERE p.service_request_id="service_request".id) ORDER BY created_at ASC LIMIT 50`
    ])
    return res.status(200).json({ projects, eligible })
  }

  if (req.method === 'POST') {
    const parsed = CreateBody.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Permintaan klien tidak valid.' })
    const [request] = await sqlClient`SELECT * FROM "service_request" WHERE id=${parsed.data.requestId} AND status='won' LIMIT 1`
    if (!request) return res.status(409).json({ error: 'Proyek hanya dapat dibuat setelah kesepakatan klien dikonfirmasi sebagai won.' })
    const [existing] = await sqlClient`SELECT id,project_code FROM "creative_project" WHERE service_request_id=${request.id} LIMIT 1`
    if (existing) return res.status(409).json({ error: 'Proyek untuk permintaan ini sudah dibuat.', projectId: existing.id })
    const id = randomUUID()
    const code = `CW-${new Date().toISOString().slice(2,10).replace(/-/g,'')}-${randomUUID().slice(0,5).toUpperCase()}`
    try {
      await sqlClient.begin(async (tx) => {
        await tx`INSERT INTO "creative_project" ("id","project_code","service_request_id","client_name","client_email","service_name","brief","status") VALUES (${id},${code},${request.id},${request.name},${request.email},${request.service_name},${request.brief},'queued')`
        await tx`UPDATE "service_request" SET status='in_progress',updated_at=now() WHERE id=${request.id} AND status='won'`
        await tx`INSERT INTO "creative_project_event" ("id","project_id","actor","event_type","detail") VALUES (${randomUUID()},${id},'owner','project_created',${'Proyek dibuat dari kesepakatan klien '+request.code+'.'})`
      })
    } catch (error) {
      const [raced] = await sqlClient`SELECT id,project_code FROM "creative_project" WHERE service_request_id=${request.id} LIMIT 1`
      if (raced) return res.status(409).json({ error: 'Proyek sudah dibuat oleh proses lain.', projectId: raced.id })
      throw error
    }
    return res.status(201).json({ ok: true, id, code })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Metode tidak diizinkan.' })
}
