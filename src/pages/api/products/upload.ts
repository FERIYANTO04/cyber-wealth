import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { uploadUrl } from '@/lib/storage'
import { randomUUID } from 'node:crypto'

const MAX_BYTES = 20 * 1024 * 1024

const Body = z.object({
  productId: z.string().regex(/^(?:[0-9a-fA-F]{32}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/),
  fileName: z.string().trim().min(1).max(160),
  contentType: z.string().trim().min(1).max(120),
  size: z.coerce.number().int().positive(),
})

const ALLOWED =
  /^(application\/(zip|x-zip-compressed|pdf|epub\+zip|json|vnd\.openxmlformats-officedocument\.[a-z.]+)|text\/(plain|csv|markdown)|image\/(png|jpeg|webp|svg\+xml))$/

/**
 * Signs an upload for a product's deliverable file. The browser PUTs the bytes
 * straight to storage; only the key is kept here, and a fresh download link is
 * signed each time a paid buyer opens their order.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const session = await getSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Data berkas tidak valid.' })
  if (parsed.data.size > MAX_BYTES) {
    return res.status(400).json({ error: 'Berkas terlalu besar. Maksimal 20 MB per berkas.' })
  }
  if (!ALLOWED.test(parsed.data.contentType)) {
    return res.status(400).json({
      error: 'Jenis berkas ini belum didukung. Gunakan ZIP, PDF, dokumen, teks, atau gambar.',
    })
  }

  const ext = parsed.data.fileName.includes('.')
    ? parsed.data.fileName.split('.').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)
    : 'bin'

  const key = `produk/${parsed.data.productId}/${randomUUID()}.${ext}`

  try {
    const url = await uploadUrl(key, { contentType: parsed.data.contentType })
    return res.status(200).json({ ok: true, uploadUrl: url, key })
  } catch (error) {
    console.error('[product upload] sign failed:', error instanceof Error ? error.message : error)
    return res.status(502).json({ error: 'Penyimpanan berkas tidak menjawab. Coba lagi sebentar lagi.' })
  }
}

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } }
