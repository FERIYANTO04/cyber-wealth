import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { activity, serviceRequests, services } from '@/lib/db/schema'
import { serviceRequestCode } from '@/lib/services'
import { notifyOwner, sendEmail } from '@/lib/email'

const Body = z.object({
  slug: z.string().trim().min(1).max(120),
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(120),
  email: z.string().trim().toLowerCase().email('Alamat email tidak valid').max(200),
  company: z.string().trim().max(120).optional(),
  market: z.enum(['Indonesia', 'International']).default('Indonesia'),
  brief: z.string().trim().min(20, 'Ceritakan kebutuhan Anda minimal 20 karakter').max(3000),
  budgetIdr: z.coerce.number().int().min(0).max(10_000_000_000).optional(),
})

// Best effort per instance; the real guard is the brief's length limit and the
// owner reviewing every request before anything is promised.
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

/** A prospective client's brief. This is a lead, never revenue. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'unknown').split(',')[0]
  if (limited(ip)) return res.status(429).json({ error: 'Terlalu banyak permintaan. Tunggu sebentar, lalu coba lagi.' })

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Data permintaan tidak valid.' })
  }

  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.slug, parsed.data.slug), eq(services.status, 'published')))
    .limit(1)
  if (!service) return res.status(404).json({ error: 'Layanan tidak ditemukan atau tidak sedang ditawarkan.' })

  const [row] = await db
    .insert(serviceRequests)
    .values({
      code: serviceRequestCode(),
      serviceId: service.id,
      serviceName: service.name,
      name: parsed.data.name,
      email: parsed.data.email,
      company: parsed.data.company || null,
      market: parsed.data.market,
      brief: parsed.data.brief,
      budgetIdr: parsed.data.budgetIdr ?? null,
      status: 'new',
    })
    .returning()

  await db.insert(activity).values({
    actor: 'system',
    action: 'Permintaan jasa masuk',
    detail: `${row.code} — ${row.serviceName} dari ${row.name} (${row.email}). Belum menjadi penjualan.`,
    dataSource: 'live',
  })

  // Notify the owner for every real incoming lead. If email is not configured,
  // notifyOwner records the message as queued in the app's email log.
  await notifyOwner({
    subject: `Permintaan jasa baru: ${row.serviceName} (${row.code})`,
    lines: [
      `Nama: ${row.name}`,
      `Email: ${row.email}`,
      `Perusahaan: ${row.company || '-'}`,
      `Pasar: ${row.market}`,
      `Anggaran indikatif: ${row.budgetIdr == null ? 'Belum disebutkan' : `Rp${Number(row.budgetIdr).toLocaleString('id-ID')}`}`,
      '',
      'Brief:',
      row.brief,
      '',
      'Status: prospek baru, belum menjadi penjualan atau pendapatan.',
    ],
    kind: 'service-request',
    relatedId: row.id,
  }).catch(() => undefined)

  // Send an immediate receipt to the buyer when a verified sender is configured.
  // If email is unavailable, keep the request safely recorded and report that honestly.
  const buyerReceipt = await sendEmail({
    to: row.email,
    subject: `Permintaan Anda diterima — ${row.code}`,
    body: [
      `Halo ${row.name},`,
      '',
      `Permintaan Anda untuk layanan ${row.serviceName} sudah kami terima.`,
      `Nomor permintaan: ${row.code}`,
      '',
      'Tim kami akan meninjau kebutuhan dan mengirimkan rincian lingkup, harga final, serta langkah pembayaran sebelum pekerjaan dimulai.',
      'Belum ada biaya yang dikenakan dan permintaan ini belum merupakan pesanan berbayar.',
      '',
      'Simpan nomor permintaan ini untuk referensi.',
      'Cyber Wealth',
    ].join('\\n'),
    kind: 'buyer-service-receipt',
    relatedType: 'service-request',
    relatedId: row.id,
  }).catch(() => ({ sent: false, status: 'queued', detail: 'Email receipt could not be sent.' }));

  return res.status(201).json({ ok: true, code: row.code, receiptSent: buyerReceipt.sent })
}
