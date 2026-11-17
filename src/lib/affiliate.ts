import { desc, eq, sql } from 'drizzle-orm'
import { db } from './db'
import { affiliateCommissions, affiliateLinks, affiliatePrograms } from './db/schema'

export async function getPrograms() {
  return db.select().from(affiliatePrograms).orderBy(desc(affiliatePrograms.createdAt))
}

export async function getLinks() {
  return db
    .select({ link: affiliateLinks, programName: affiliatePrograms.name, network: affiliatePrograms.network })
    .from(affiliateLinks)
    .leftJoin(affiliatePrograms, eq(affiliateLinks.programId, affiliatePrograms.id))
    .orderBy(desc(affiliateLinks.createdAt))
}

export async function getCommissions(limit = 40) {
  return db
    .select({ commission: affiliateCommissions, programName: affiliatePrograms.name })
    .from(affiliateCommissions)
    .leftJoin(affiliatePrograms, eq(affiliateCommissions.programId, affiliatePrograms.id))
    .orderBy(desc(affiliateCommissions.createdAt))
    .limit(limit)
}

export type AffiliateTotals = {
  clicks: number
  recordedIdr: number
  paidOutIdr: number
  programs: number
  links: number
}

export async function getAffiliateTotals(): Promise<AffiliateTotals> {
  const [clicks] = await db.select({ n: sql<number>`coalesce(sum(${affiliateLinks.clicks}), 0)::int` }).from(affiliateLinks)
  const [recorded] = await db.select({ n: sql<number>`coalesce(sum(${affiliateCommissions.amountIdr}), 0)::bigint` }).from(affiliateCommissions)
  const [paidOut] = await db
    .select({ n: sql<number>`coalesce(sum(${affiliateCommissions.amountIdr}), 0)::bigint` })
    .from(affiliateCommissions)
    .where(eq(affiliateCommissions.status, 'paid'))
  const [programs] = await db.select({ n: sql<number>`count(*)::int` }).from(affiliatePrograms)
  const [links] = await db.select({ n: sql<number>`count(*)::int` }).from(affiliateLinks)
  return {
    clicks: clicks?.n ?? 0,
    recordedIdr: Number(recorded?.n ?? 0),
    paidOutIdr: Number(paidOut?.n ?? 0),
    programs: programs?.n ?? 0,
    links: links?.n ?? 0,
  }
}

export async function getLinkBySlug(slug: string) {
  const rows = await db.select().from(affiliateLinks).where(eq(affiliateLinks.slug, slug)).limit(1)
  return rows[0] ?? null
}
