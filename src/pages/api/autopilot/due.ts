import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from '@/lib/auth'
import { autopilotDue, runAutopilot } from '@/lib/autopilot'
import { logActivity } from '@/lib/data'
import { runBillingPass } from '@/lib/billing'
import { publishDuePosts } from '@/lib/social'

let running = false

/**
 * The daily pass. A published app has no always-on process, so the schedule is
 * driven by the console being opened: this runs at most one pass per day, only while
 * unpaused, and only when nothing else is already running.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const session = await getSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  if (running) return res.status(200).json({ ran: false, reason: 'sedang berjalan' })

  const due = await autopilotDue()
  if (!due) return res.status(200).json({ ran: false, reason: 'belum jatuh tempo' })

  running = true
  try {
    const result = await runAutopilot('schedule')
    if (result.paused) return res.status(200).json({ ran: false, reason: 'operasi dijeda' })
    // Recurring billing rides along with the same daily pass: reminders before a due
    // date, periods for consented renewals, and nothing invented.
    const billing = await runBillingPass('schedule').catch(() => null)
    // Approved content whose date has come is checked here. With no channel connected
    // it records that the provider was never called, and never claims a publish.
    const social = await publishDuePosts().catch(() => null)
    await logActivity({
      actor: 'system',
      action: 'Putaran harian autopilot berjalan',
      detail: result.results.map((item) => `${item.label}: ${item.summary}`).join(' · '),
    })
    return res.status(200).json({ ran: true, results: result.results, billing, social })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Kesalahan tidak diketahui'
    console.error('[autopilot due]', message)
    return res.status(500).json({ ran: false, reason: message })
  } finally {
    running = false
  }
}
