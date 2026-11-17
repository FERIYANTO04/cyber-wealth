import { sql } from 'drizzle-orm'
import { db } from './db'
import { TASKS, type AutopilotTask } from './labels'

export type QueueTask = {
  id: string
  workflow_id: string
  task: AutopilotTask
  agent_role: string
  directive: string
  attempts: number
  max_attempts: number
}

const allowed = new Set(TASKS.filter((item) => item.task !== 'ceo').map((item) => item.task))

export async function enqueueAgentTasks(
  workflowId: string,
  tasks: { task: AutopilotTask; directive: string; priority?: number }[]
): Promise<number> {
  const accepted = tasks.filter((item) => item && allowed.has(item.task) && typeof item.directive === 'string' && item.directive.trim().length > 0)
  const unique = [...new Map(accepted.map((item) => [item.task, item])).values()].slice(0, 6)
  for (const item of unique) {
    const role = TASKS.find((entry) => entry.task === item.task)?.agentRole
    if (!role) continue
    await db.execute(sql`INSERT INTO agent_task_queue
      (id, workflow_id, task, agent_role, directive, status, priority)
      VALUES (${crypto.randomUUID()}, ${workflowId}, ${item.task}, ${role},
        ${item.directive.slice(0, 2000)}, 'queued', ${Number.isInteger(item.priority) ? Math.max(1, Math.min(1000, item.priority!)) : 100})`)
  }
  return unique.length
}

export async function claimNextAgentTask(workerId: string): Promise<QueueTask | null> {
  const result = await db.execute(sql`
    WITH candidate AS (
      SELECT id FROM agent_task_queue
      WHERE ((
        status = 'queued' AND available_at <= now()
      ) OR (
        status = 'running' AND locked_at < now() - interval '10 minutes'
      )) AND attempts < max_attempts
      ORDER BY priority ASC, created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE agent_task_queue AS q
    SET status = 'running', locked_at = now(), locked_by = ${workerId},
        attempts = q.attempts + 1, updated_at = now()
    FROM candidate
    WHERE q.id = candidate.id AND q.attempts < q.max_attempts
    RETURNING q.id, q.workflow_id, q.task, q.agent_role, q.directive, q.attempts, q.max_attempts
  `)
  const rows = result as unknown as QueueTask[]
  return rows[0] ?? null
}

export async function finishAgentTask(id: string, workerId: string, summary: string): Promise<void> {
  await db.execute(sql`
    UPDATE agent_task_queue
    SET status = 'completed', result_summary = ${summary.slice(0, 2000)},
        locked_at = NULL, locked_by = NULL, updated_at = now(), finished_at = now()
    WHERE id = ${id} AND status = 'running' AND locked_by = ${workerId}
  `)
}

export async function failAgentTask(id: string, workerId: string, reason: string): Promise<void> {
  await db.execute(sql`
    UPDATE agent_task_queue
    SET status = CASE WHEN attempts < max_attempts THEN 'queued' ELSE 'failed' END,
        available_at = now() + interval '1 minute',
        last_error = ${reason.slice(0, 2000)}, locked_at = NULL, locked_by = NULL,
        updated_at = now(),
        finished_at = CASE WHEN attempts < max_attempts THEN NULL ELSE now() END
    WHERE id = ${id} AND status = 'running' AND locked_by = ${workerId}
  `)
}

export async function deferAgentTask(id: string, workerId: string): Promise<void> {
  await db.execute(sql`
    UPDATE agent_task_queue
    SET status = 'queued', attempts = GREATEST(attempts - 1, 0),
        available_at = now() + interval '5 minutes',
        locked_at = NULL, locked_by = NULL, updated_at = now()
    WHERE id = ${id} AND status = 'running' AND locked_by = ${workerId}
  `)
}
