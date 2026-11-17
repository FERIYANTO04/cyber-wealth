import { desc, eq } from 'drizzle-orm'
import { db } from './db'
import { serviceRequests, services } from './db/schema'

export async function getPublishedServices() {
  return db
    .select()
    .from(services)
    .where(eq(services.status, 'published'))
    .orderBy(desc(services.createdAt))
}

export async function getOwnerServices() {
  return db.select().from(services).orderBy(desc(services.createdAt))
}

export async function getServiceRequests(limit = 60) {
  return db.select().from(serviceRequests).orderBy(desc(serviceRequests.createdAt)).limit(limit)
}

export async function getServiceRequest(id: string) {
  const rows = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id)).limit(1)
  return rows[0] ?? null
}

export function serviceRequestCode(): string {
  const stamp = new Date().toISOString().slice(2, 10).replace(/-/g, '')
  return `JSA-${stamp}-${crypto.randomUUID().replace(/-/g, '').slice(0, 5).toUpperCase()}`
}
