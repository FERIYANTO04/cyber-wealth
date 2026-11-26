import type { NextApiRequest, NextApiResponse } from 'next'
import { randomUUID, timingSafeEqual } from 'node:crypto'
import { runAutopilot, autopilotDue } from '@/lib/autopilot'
import { logActivity } from '@/lib/data'
import { runBillingPass } from '@/lib/billing'
import { isPlaceholder } from '@/lib/env'
import { runHousekeeping } from '@/lib/housekeeping'
import { testAi, storageStatus, testMidtrans } from '@/lib/integrations'
import { testEmail } from '@/lib/email'
import { db } from '@/lib/db'
import { products } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { putFile } from '@/lib/storage'

// Scheduled hosts call this endpoint with: Authorization: Bearer <CRON_SECRET>.
// Keep CRON_SECRET private; never expose it through NEXT_PUBLIC_* variables.
let running = false
let runningSince = 0

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
  if (running && Date.now() - runningSince > 20 * 60 * 1000) {
    console.warn('[cron autopilot] Releasing an in-memory lock older than 20 minutes; database run recovery will decide whether work can resume.')
    running = false
    runningSince = 0
  }
  if (running) return res.status(409).json({ ran: false, reason: 'Putaran sedang berjalan pada instance ini.' })

  running = true
  runningSince = Date.now()
  let handedOffToBackground = false
  try {
    // Billing, housekeeping, migrations, and integration probes are short,
    // bounded operations and finish before the scheduler response.
    const billing = await runBillingPass('schedule').catch((error) => {
      console.error('[cron billing]', error)
      return { error: 'Proses billing gagal; periksa log server.' }
    })
    const housekeeping = await runHousekeeping().catch((error) => {
      console.error('[cron housekeeping]', error)
      return { error: 'Pembersihan gagal; periksa log server.' }
    })

    // Cyber Wealth is website-first: the scheduled autopilot never publishes social posts.
    const productFileMigration = await migrateProductFiles().catch((error) => {
      console.error('[cron product file migration]', error)
      return ['Migrasi berkas gagal; periksa log server.']
    })

    const [aiCheck, emailCheck, storageCheck, paymentCheck] = await Promise.all([
      testAi().catch((error) => ({ state: 'error' as const, message: error instanceof Error ? error.message : 'AI check failed' })),
      testEmail().catch((error) => ({ state: 'error' as const, message: error instanceof Error ? error.message : 'Email check failed' })),
      storageStatus().catch((error) => ({ state: 'error' as const, message: error instanceof Error ? error.message : 'Storage check failed' })),
      testMidtrans().catch((error) => ({ state: 'error' as const, message: error instanceof Error ? error.message : 'Midtrans check failed' })),
    ])
    const integrations = { ai: aiCheck, email: emailCheck, storage: storageCheck, midtrans: paymentCheck }
    await logActivity({
      actor: 'system',
      action: 'Pemeriksaan integrasi terjadwal',
      detail: Object.entries(integrations).map(([name, check]) => `${name}: ${check.state} — ${check.message}`).join(' | '),
    })

    const due = await autopilotDue()
    if (!due) {
      return res.status(200).json({ ran: false, reason: 'Autopilot belum jatuh tempo atau dijeda.', billing, housekeeping, productFileMigration, integrations })
    }

    // Do not hold the cron HTTP request open for the entire multi-agent cycle.
    // Railway's request window is shorter than a full CEO + specialist run. The
    // web process continues this promise after returning 202; each agent persists
    // its own run record, and stale "running" records are recovered by autopilotDue.
    handedOffToBackground = true
    void runAutopilot('schedule')
      .then(async (result) => {
        if (result.paused) return
        await logActivity({
          actor: 'system',
          action: 'Putaran terjadwal autopilot selesai',
          detail: result.results.map((item) => `${item.label}: ${item.summary}`).join(' · '),
        })
      })
      .catch(async (error) => {
        const message = error instanceof Error ? error.message : 'Kesalahan tidak diketahui'
        console.error('[cron autopilot background]', error)
        await logActivity({
          actor: 'system',
          action: 'Putaran terjadwal autopilot gagal',
          detail: message.slice(0, 500),
        }).catch(() => undefined)
      })
      .finally(() => {
        running = false
        runningSince = 0
      })

    return res.status(202).json({ ran: true, queued: true, message: 'Putaran autopilot berjalan di latar belakang.', billing, housekeeping, productFileMigration, integrations })
  } catch (error) {
    console.error('[cron autopilot]', error)
    return res.status(500).json({ ran: false, reason: 'Putaran gagal. Periksa log server.' })
  } finally {
    if (!handedOffToBackground) {
      running = false
      runningSince = 0
    }
  }
}
