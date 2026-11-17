import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { proposals, serviceRequests } from '@/lib/db/schema'
import { getSession } from '@/lib/auth'
import { askAi, aiConfigured } from '@/lib/ai'
import { logActivity } from '@/lib/data'

const Body = z.object({
  requestId: z.string().uuid(),
  amountIdr: z.coerce.number().int().min(0).max(10_000_000_000),
})

/**
 * Drafts a client-facing offer for one brief with the configured model, then files it
 * as a live proposal so the owner still makes the call before anything is sent.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const session = await getSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Angka penawaran tidak valid.' })

  if (!aiConfigured()) {
    return res.status(503).json({
      error: 'Model AI belum terhubung. Isi kunci API model AI di halaman Integrasi, lalu coba lagi.',
    })
  }

  const [request] = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.id, parsed.data.requestId))
    .limit(1)
  if (!request) return res.status(404).json({ error: 'Permintaan tidak ditemukan.' })

  const outcome = await askAi({
    system:
      'Anda penyusun penawaran jasa digital profesional. Tulis dalam bahasa yang sama dengan brief klien (Indonesia atau Inggris). Ringkas, konkret, tanpa janji hasil yang tidak pasti, tanpa mengarang portofolio atau klien.',
    prompt: [
      `Layanan: ${request.serviceName}`,
      `Klien: ${request.name}${request.company ? ` (${request.company})` : ''} — pasar ${request.market}`,
      `Brief klien: ${request.brief}`,
      `Anggaran indikatif: ${request.budgetIdr ? `Rp ${Number(request.budgetIdr).toLocaleString('id-ID')}` : 'tidak disebutkan'}`,
      `Harga penawaran: Rp ${parsed.data.amountIdr.toLocaleString('id-ID')}`,
      '',
      'Tulis penawaran dengan bagian: pemahaman kebutuhan, lingkup pekerjaan, yang tidak termasuk, tenggat, harga, dan langkah berikutnya. Maksimal 320 kata. Jangan mencantumkan data yang tidak diberikan.',
    ].join('\n'),
    maxTokens: 900,
  })

  if (!outcome.ok) return res.status(502).json({ error: outcome.reason })

  await db
    .update(serviceRequests)
    .set({
      proposalBody: outcome.text,
      proposalAmountIdr: parsed.data.amountIdr,
      proposalSource: `ai:${outcome.model}`,
      status: 'proposed',
      updatedAt: new Date(),
    })
    .where(eq(serviceRequests.id, request.id))

  await db.insert(proposals).values({
    title: `Penawaran ${request.serviceName} untuk ${request.name}`,
    summary: `Draf penawaran AI sebesar Rp ${parsed.data.amountIdr.toLocaleString('id-ID')} untuk ${request.code}. Kirim hanya setelah Anda menyetujui isinya.`,
    category: 'contract',
    amountIdr: parsed.data.amountIdr,
    risk: 'low',
    status: 'pending',
    dataSource: 'live',
  })

  await logActivity({
    actor: 'agent',
    agentName: 'Gema — AI Marketing',
    action: 'Draf penawaran dibuat',
    detail: `${request.code} — ${request.serviceName}, nilai Rp ${parsed.data.amountIdr.toLocaleString('id-ID')}. Menunggu persetujuan sebelum dikirim.`,
  })

  return res.status(200).json({ ok: true, text: outcome.text, model: outcome.model })
}
