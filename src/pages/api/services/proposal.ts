import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { proposals, serviceRequests, services } from '@/lib/db/schema'
import { requireOwnerSession } from '@/lib/auth'
import { askAi, aiConfigured } from '@/lib/ai'
import { logActivity } from '@/lib/data'

const Body = z.object({
  requestId: z.string().uuid(),
  amountIdr: z.coerce.number().int().min(1).max(10_000_000_000),
})

/**
 * Drafts a client-facing offer for one brief with the configured model, then files it
 * as a live proposal so the owner still makes the call before anything is sent.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const session = await requireOwnerSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Angka penawaran tidak valid.' })

  const [request] = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.id, parsed.data.requestId))
    .limit(1)
  if (!request) return res.status(404).json({ error: 'Permintaan tidak ditemukan.' })

  const [service] = await db.select().from(services).where(eq(services.id, request.serviceId)).limit(1)
  const outcome = aiConfigured()
    ? await askAi({
        system:
          'Anda penyusun penawaran jasa digital profesional. Tulis dalam bahasa yang sama dengan brief klien (Indonesia atau Inggris). Ringkas, konkret, tanpa janji hasil yang tidak pasti, tanpa mengarang portofolio atau klien.',
        prompt: [
          `Layanan: ${request.serviceName}`,
          `Ruang lingkup katalog: ${service?.detail ?? service?.summary ?? 'Ikuti brief dan ruang lingkup yang disepakati.'}`,
          `Klien: ${request.name}${request.company ? ` (${request.company})` : ''} — pasar ${request.market}`,
          `Brief klien: ${request.brief}`,
          `Anggaran indikatif: ${request.budgetIdr ? `Rp ${Number(request.budgetIdr).toLocaleString('id-ID')}` : 'tidak disebutkan'}`,
          `Harga penawaran: Rp ${parsed.data.amountIdr.toLocaleString('id-ID')}`,
          '',
          'Tulis penawaran dengan bagian: pemahaman kebutuhan, lingkup pekerjaan, deliverables, yang tidak termasuk, tenggat, harga, dan langkah berikutnya. Maksimal 320 kata. Jangan mencantumkan data yang tidak diberikan.',
        ].join('\n'),
        maxTokens: 700,
      })
    : { ok: false as const, reason: 'Model AI tidak terhubung.' }

  const source = outcome.ok ? `ai:${outcome.model}` : 'template:fallback'
  const text = outcome.ok ? outcome.text : [
    `PENAWARAN LAYANAN — ${request.serviceName}`,
    '',
    '1. PEMAHAMAN KEBUTUHAN',
    `Kami meninjau brief Anda: ${request.brief}`,
    '',
    '2. LINGKUP PEKERJAAN',
    service?.detail ?? service?.summary ?? 'Ruang lingkup final akan disepakati secara tertulis sebelum pekerjaan dimulai.',
    '',
    '3. HASIL YANG DISERAHKAN',
    'File dan hasil kerja digital mengikuti ruang lingkup layanan di atas. Format, jumlah aset, dan kriteria penerimaan dikonfirmasi dalam brief kerja sebelum produksi.',
    '',
    '4. YANG TIDAK TERMASUK',
    'Pekerjaan tambahan di luar ruang lingkup, biaya lisensi atau aset pihak ketiga, produksi fisik, dan layanan eksternal tidak termasuk kecuali disepakati tertulis.',
    '',
    '5. TENGGAT',
    service?.deliveryDays ? `Estimasi ${service.deliveryDays} hari kerja setelah pembayaran terverifikasi dan seluruh materi yang dibutuhkan diterima.` : 'Jadwal final dikonfirmasi sebelum pekerjaan dimulai.',
    '',
    '6. HARGA',
    `Rp ${parsed.data.amountIdr.toLocaleString('id-ID')}.`,
    '',
    '7. LANGKAH BERIKUTNYA',
    'Periksa penawaran ini. Jika setuju, lanjutkan melalui portal privat dan selesaikan pembayaran. Pengerjaan dimulai setelah Midtrans mengonfirmasi pembayaran.',
    '',
    '(Draf otomatis berbasis ruang lingkup katalog; wajib ditinjau Owner sebelum dikirim kepada klien.)',
  ].join('\n')

  await db
    .update(serviceRequests)
    .set({
      proposalBody: text,
      proposalAmountIdr: parsed.data.amountIdr,
      proposalSource: source,
      status: 'proposed',
      updatedAt: new Date(),
    })
    .where(eq(serviceRequests.id, request.id))

  await db.insert(proposals).values({
    title: `Penawaran ${request.serviceName} untuk ${request.name}`,
    summary: `Draf penawaran sebesar Rp ${parsed.data.amountIdr.toLocaleString('id-ID')} untuk ${request.code}. Kirim hanya setelah Anda menyetujui isinya.`,
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
    detail: `${request.code} — ${request.serviceName}, nilai Rp ${parsed.data.amountIdr.toLocaleString('id-ID')}. Sumber draf: ${source}. Menunggu persetujuan sebelum dikirim.`,
  })

  return res.status(200).json({ ok: true, text, model: outcome.ok ? outcome.model : 'Template fallback — AI belum tersedia' })
}
