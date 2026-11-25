import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { serviceRequests } from '@/lib/db/schema'
import { requireOwnerSession } from '@/lib/auth'
import { logActivity } from '@/lib/data'
import { sendEmail } from '@/lib/email'
import { money } from '@/lib/format'

const Body = z.object({ requestId: z.string().uuid() })

/** Sends an owner-reviewed proposal to the prospective client; never charges them. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const session = await requireOwnerSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Permintaan tidak valid.' })

  const [request] = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.id, parsed.data.requestId))
    .limit(1)
  if (!request) return res.status(404).json({ error: 'Permintaan calon klien tidak ditemukan.' })
  if (!request.proposalBody || request.proposalAmountIdr === null) {
    return res.status(409).json({ error: 'Susun dan periksa draf penawaran terlebih dahulu.' })
  }
  if (request.status === 'proposal_sent') {
    return res.status(409).json({ error: 'Penawaran ini sudah pernah dikirim.' })
  }

  const portalUrl = request.proposalToken
    ? (process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || 'https://cyber-wealth-web-production.up.railway.app').replace(/\\/$/, '') + '/permintaan/' + request.proposalToken
    : null

  const result = await sendEmail({
    to: request.email,
    subject: `Penawaran Cyber Wealth — ${request.serviceName}`,
    body: [
      `Halo ${request.name},`,
      '',
      'Berikut penawaran berdasarkan brief yang Anda kirim:',
      '',
      request.proposalBody,
      '',
      ...(portalUrl ? ['Lihat penawaran dan lanjutkan pembayaran melalui portal privat:', portalUrl, ''] : []),
      `Nilai penawaran: ${money(Number(request.proposalAmountIdr))}`,
      '',
      'Jika Anda setuju, balas email ini. Kami akan mengonfirmasi langkah pembayaran dan jadwal pengerjaan setelah persetujuan Anda.',
      '',
      'Tidak ada pembayaran yang diproses melalui email ini.',
      '',
      'Salam,',
      'Cyber Wealth',
    ].join('\n'),
    kind: 'service-proposal',
    relatedType: 'service-request',
    relatedId: request.id,
  })

  if (result.sent) {
    await db
      .update(serviceRequests)
      .set({ status: 'proposal_sent', updatedAt: new Date() })
      .where(eq(serviceRequests.id, request.id))
  }

  await logActivity({
    actor: 'owner',
    action: result.sent ? 'Penawaran jasa dikirim ke klien' : 'Pengiriman penawaran jasa belum berhasil',
    detail: `${request.code} — ${request.email}. ${result.detail}`,
  })

  return res.status(result.sent ? 200 : 202).json({
    ok: true,
    sent: result.sent,
    status: result.status,
    message: result.detail,
  })
}
