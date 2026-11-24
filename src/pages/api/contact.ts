import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { db } from '@/lib/db'
import { contactMessages } from '@/lib/db/schema'
import { notifyOwner } from '@/lib/email'
import { logActivity } from '@/lib/data'

const Body = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(120),
  email: z.string().trim().toLowerCase().email('Alamat email tidak valid').max(200),
  subject: z.string().trim().min(3, 'Tulis subjek singkat').max(140),
  body: z.string().trim().min(10, 'Tulis pesan minimal 10 karakter').max(4000),
})

// Public form: a best-effort brake on one instance, never a promise. The message is
// kept in the database, so a flood is a nuisance rather than lost mail.
const hits = new Map<string, { n: number; at: number }>()
function limited(ip: string): boolean {
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now - entry.at > 60_000) {
    hits.set(ip, { n: 1, at: now })
    if (hits.size > 5000) hits.clear()
    return false
  }
  entry.n += 1
  return entry.n > 5
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Metode tidak diizinkan' })
  }

  const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'unknown').split(',')[0]
  if (limited(ip)) return res.status(429).json({ error: 'Terlalu banyak pesan. Tunggu sebentar, lalu coba lagi.' })

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' })
  }

  const [row] = await db.insert(contactMessages).values(parsed.data).returning()

  await logActivity({
    actor: 'system',
    action: 'Pesan dari halaman kontak',
    detail: `${parsed.data.name} — ${parsed.data.subject}`,
  })

  const notifiedOwners = await notifyOwner({
    subject: `Pesan baru dari ${parsed.data.name}`,
    lines: [parsed.data.subject, '', parsed.data.body, '', `Balas ke: ${parsed.data.email}`],
    kind: 'contact-message',
    relatedId: row.id,
  }).catch(() => 0)

  return res.status(201).json({
    ok: true,
    emailSent: notifiedOwners > 0,
    message: notifiedOwners > 0
      ? 'Pesan berhasil disimpan dan notifikasi email diterima penyedia email.'
      : 'Pesan berhasil disimpan, tetapi notifikasi email belum berhasil dikirim. Tim kami dapat melihat pesan ini di dashboard.',
  })
}
