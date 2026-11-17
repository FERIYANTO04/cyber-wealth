import { bankTransferInstructions } from '@/lib/bank-transfer'
import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { activity, plans, subscriptions } from '@/lib/db/schema'
import { addInterval, intervalOf } from '@/lib/billing'
import { sendEmail, notifyOwner } from '@/lib/email'
import { money } from '@/lib/format'

const Body = z.object({
  code: z.string().trim().min(1).max(60),
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(120),
  email: z.string().trim().toLowerCase().email('Alamat email tidak valid').max(200),
  autoRenew: z.boolean().optional().default(false),
})

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

/** Starts a subscription. Paid plans stay pending until the owner verifies the bank transfer. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'unknown').split(',')[0]
  if (limited(ip)) return res.status(429).json({ error: 'Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.' })

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' })

  const [plan] = await db
    .select()
    .from(plans)
    .where(and(eq(plans.code, parsed.data.code), eq(plans.status, 'published')))
    .limit(1)
  if (!plan) return res.status(404).json({ error: 'Paket langganan tidak ditemukan.' })

  const accessToken = crypto.randomUUID()
  const amount = Number(plan.priceIdr)
  const interval = intervalOf(plan.interval)

  // The subscriber's own tick is the only thing that makes a future bill allowed.
  const [row] = await db
    .insert(subscriptions)
    .values({
      accessToken,
      planId: plan.id,
      planName: plan.name,
      accountEmail: parsed.data.email,
      accountName: parsed.data.name,
      amountIdr: amount,
      interval,
      status: 'pending',
      autoRenew: false,
      autoRenewAt: null,
    })
    .returning()

  await activityInsert(plan.name, parsed.data.email, false)

  await sendEmail({
    to: parsed.data.email,
    subject: `Langganan ${plan.name} tercatat, menunggu pembayaran`,
    body: [
      `Halo ${parsed.data.name},`,
      '',
      `Pendaftaran langganan ${plan.name} sudah kami catat.`,
      `Jumlah: ${money(amount)} per ${interval === 'year' ? 'tahun' : 'bulan'}`,
      '',
      'Langganan aktif setelah pemilik memverifikasi transfer masuk ke rekening.',
      'Transfer manual ke rekening pemilik. Perpanjangan tidak otomatis; bayar ulang secara manual saat periode berakhir.',
      bankTransferInstructions(),
      '',
      `Status langganan: /langganan/status/${accessToken}`,
    ].join('\n'),
    kind: 'subscription-created',
    relatedType: 'subscription',
    relatedId: row.id,
  })

  // A plan priced at zero is activated immediately. Paid plans wait for manual bank-transfer verification.
  if (amount === 0) {
    await db
      .update(subscriptions)
      .set({ status: 'active', paidAt: new Date(), periodEnd: addInterval(new Date(), interval) })
      .where(eq(subscriptions.id, row.id))
    return res.status(201).json({ ok: true, accessToken, free: true })
  }

  // Manual bank transfer: subscriber transfers directly to the owner's bank account.
  // Owner verifies the bank statement and activates the subscription from the admin endpoint.
  return res.status(201).json({ ok: true, token: accessToken, paymentMethod: 'manual_bank_transfer' })
}

async function activityInsert(planName: string, email: string, autoRenew: boolean) {
  await db.insert(activity).values({
    actor: 'system',
    action: 'Pendaftaran langganan',
    detail: `${planName} untuk ${email}. Perpanjangan otomatis: ${autoRenew ? 'dinyalakan pelanggan' : 'tidak'}.`,
    dataSource: 'live',
  })
  await notifyOwner({
    subject: `Pendaftaran langganan baru: ${planName}`,
    lines: [`${email} mendaftar ${planName}.`, 'Langganan menunggu transfer manual ke rekening pemilik dan verifikasi pemilik.'],
    kind: 'owner-subscription-created',
  }).catch(() => undefined)
}
