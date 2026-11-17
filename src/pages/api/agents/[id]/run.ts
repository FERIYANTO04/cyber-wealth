import type { NextApiRequest, NextApiResponse } from 'next'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { agents } from '@/lib/db/schema'
import { getSession } from '@/lib/auth'
import { runAgentTask } from '@/lib/autopilot'
import { enqueueAgentTasks } from '@/lib/agent-queue'
import { TASKS } from '@/lib/labels'

// One agent's task does database work and, when configured, a model call. Only one
// run at a time per instance keeps a double-click from doubling the work.
const busy = new Set<string>()

function taskFor(role: string) {
  return TASKS.find((entry) => entry.agentRole === role)?.task ?? null
}

/** Runs the single agent the owner pressed, and records the outcome in the audit log. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const session = await getSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  const id = String(req.query.id ?? '')
  const [agent] = await db.select().from(agents).where(eq(agents.id, id)).limit(1)
  if (!agent) return res.status(404).json({ error: 'Agen tidak ditemukan.' })

  const task = taskFor(agent.role)
  if (!task) {
    return res.status(400).json({ error: 'Agen ini belum punya tugas yang bisa dijalankan sendiri.' })
  }

  if (busy.has(id)) return res.status(429).json({ error: 'Agen ini sedang bekerja. Tunggu sampai selesai.' })

  busy.add(id)
  try {
    if (task !== 'ceo') {
      const workflowId = crypto.randomUUID()
      const queued = await enqueueAgentTasks(workflowId, [{
        task,
        directive: `Jalankan pekerjaan standar sesuai mandat ${agent.name}. Gunakan hanya data bisnis yang tercatat dan simpan hasil sebagai draf atau laporan untuk ditinjau pemilik.`,
        priority: 50,
      }])
      return res.status(202).json({ ok: true, queued, message: 'Tugas masuk antrean. Worker akan mengambilnya satu per satu.' })
    }
    const result = await runAgentTask(task)
    if (!result.ok) {
      return res.status(409).json({ error: result.summary, blocked: result.blocked })
    }
    return res.status(200).json({ ok: true, summary: result.summary })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Kesalahan tidak diketahui'
    console.error('[agent run]', agent.role, message)
    return res.status(500).json({ error: `Tugas gagal: ${message}` })
  } finally {
    busy.delete(id)
  }
}
