import type { NextApiRequest, NextApiResponse } from 'next'
import { timingSafeEqual } from 'node:crypto'
import { runAutopilot, autopilotDue } from '@/lib/autopilot'
import { logActivity } from '@/lib/data'
import { runBillingPass } from '@/lib/billing'
import { publishDuePosts } from '@/lib/social'
import { isPlaceholder } from '@/lib/env'
import { runHousekeeping } from '@/lib/housekeeping'

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

    const due = await autopilotDue()
    if (!due) return res.status(200).json({ ran: false, reason: 'Autopilot belum jatuh tempo atau dijeda.', billing, housekeeping })

    const result = await runAutopilot('schedule')
    if (result.paused) return res.status(200).json({ ran: false, reason: 'Operasi dijeda.', billing, housekeeping })

    const social = await publishDuePosts().catch((error) => {
      console.error('[cron social]', error)
      return { error: 'Publikasi sosial gagal; periksa log server.' }
    })
    await logActivity({
      actor: 'system',
      action: 'Putaran terjadwal autopilot berjalan',
      detail: result.results.map((item) => `${item.label}: ${item.summary}`).join(' · '),
    })
    return res.status(200).json({ ran: true, results: result.results, billing, social, housekeeping })
  } catch (error) {
    console.error('[cron autopilot]', error)
    return res.status(500).json({ ran: false, reason: 'Putaran gagal. Periksa log server.' })
  } finally {
    running = false
  }
}
