import type { NextApiRequest, NextApiResponse } from 'next'
import { randomUUID, timingSafeEqual } from 'node:crypto'
import { runAutopilot, autopilotDue } from '@/lib/autopilot'
import { logActivity } from '@/lib/data'
import { runBillingPass } from '@/lib/billing'
import { isPlaceholder } from '@/lib/env'
import { runHousekeeping } from '@/lib/housekeeping'
import { testAi, storageStatus } from '@/lib/integrations'
import { testEmail } from '@/lib/email'
import { db } from '@/lib/db'
import { products } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { putFile } from '@/lib/storage'

// Scheduled hosts call this endpoint with: Authorization: Bearer <CRON_SECRET>.
// Keep CRON_SECRET private; never expose it through NEXT_PUBLIC_* variables.
let running = false

function authorized(req: NextApiRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (isPlaceholder(secret) || !secret || secret.length < 32) return false
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return false
  const supplied = Buffer.from(header.slice(7))
  const expected = Buffer.from(secret)
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

async function migrateProductFiles() {
  const allowed = new Set(['Kit_CV_ATS_Lengkap.md', 'Kit_WhatsApp_Business_UMKM.md'])
  const prefix = 'https://raw.githubusercontent.com/FERIYANTO04/cyber-wealth/main/public/produk/'
  const rows = await db.select().from(products)
  const results: string[] = []
  for (const product of rows) {
    if (!product.fileName || !allowed.has(product.fileName) || !product.fileKey?.startsWith(prefix)) continue
    const response = await fetch(product.fileKey, { cache: 'no-store', signal: AbortSignal.timeout(15000) })
    if (!response.ok) {
      results.push(product.fileName + ': sumber belum dapat diambil')
      continue
    }
    const bytes = await response.arrayBuffer()
    if (!bytes.byteLength || bytes.byteLength > 20 * 1024 * 1024) {
      results.push(product.fileName + ': ukuran berkas tidak valid')
      continue
    }
    const key = 'produk/' + product.id + '/' + randomUUID() + '.md'
    await putFile(key, bytes, 'text/markdown')
    await db.update(products).set({ fileKey: key, fileSize: bytes.byteLength }).where(eq(products.id, product.id))
    await logActivity({
      actor: 'system',
      action: 'Berkas produk dipindahkan ke penyimpanan privat',
      detail: product.fileName + ' pada ' + product.name + '.',
    })
    results.push(product.fileName + ': tersimpan privat (' + bytes.byteLength + ' byte)')
  }
  return results
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Metode tidak diizinkan' })
  }
  if (!authorized(req)) {
    return res.status(401).json({ error: 'Otorisasi cron tidak valid atau CRON_SECRET belum dikonfigurasi.' })
  }
  if (running) return res.status(409).json({ ran: false, reason: 'Putaran sedang berjalan pada instance ini.' })

  running = true
  try {
    // The billing pass and the tidy-up run on every call: reminders, expiry and stale
    // links must not wait for the autopilot's own cadence.
    const billing = await runBillingPass('schedule').catch((error) => {
      console.error('[cron billing]', error)
      return { error: 'Proses billing gagal; periksa log server.' }
    })
    const housekeeping = await runHousekeeping().catch((error) => {
      console.error('[cron housekeeping]', error)
      return { error: 'Pembersihan gagal; periksa log server.' }
    })

    // Cyber Wealth is website-first: the scheduled autopilot never publishes social posts.

    // Move the two approved catalogue Markdown deliverables into private object storage.
    // This runs only inside the authenticated cron, never from a public endpoint.
    const productFileMigration = await migrateProductFiles().catch((error) => {
      console.error('[cron product file migration]', error)
      return ['Migrasi berkas gagal; periksa log server.']
    })

    // Provider checks are read-only except for a temporary storage probe file that is
    // deleted immediately. This gives the owner verified status rather than just key presence.
    const [aiCheck, emailCheck, storageCheck] = await Promise.all([
      testAi().catch((error) => ({ state: 'error', message: error instanceof Error ? error.message : 'AI check failed' })),
      testEmail().catch((error) => ({ state: 'error', message: error instanceof Error ? error.message : 'Email check failed' })),
      storageStatus().catch((error) => ({ state: 'error', message: error instanceof Error ? error.message : 'Storage check failed' })),
    ])
    const integrations = { ai: aiCheck, email: emailCheck, storage: storageCheck }
    await logActivity({
      actor: 'system',
      action: 'Pemeriksaan integrasi terjadwal',
      detail: Object.entries(integrations).map(([name, check]) => `${name}: ${check.state} — ${check.message}`).join(' | '),
    })

    const due = await autopilotDue()
    if (!due) {
      return res.status(200).json({ ran: false, reason: 'Autopilot belum jatuh tempo atau dijeda.', billing, housekeeping, productFileMigration, integrations })
    }

    const result = await runAutopilot('schedule')
    if (result.paused) {
      return res.status(200).json({ ran: false, reason: 'Operasi dijeda.', billing, social, housekeeping, productFileMigration, integrations })
    }

    await logActivity({
      actor: 'system',
      action: 'Putaran terjadwal autopilot berjalan',
      detail: result.results.map((item) => `${item.label}: ${item.summary}`).join(' · '),
    })
    return res.status(200).json({ ran: true, results: result.results, billing, social, housekeeping, productFileMigration, integrations })
  } catch (error) {
    console.error('[cron autopilot]', error)
    return res.status(500).json({ ran: false, reason: 'Putaran gagal. Periksa log server.' })
  } finally {
    running = false
  }
}
