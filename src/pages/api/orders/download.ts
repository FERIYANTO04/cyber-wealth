import type { NextApiRequest, NextApiResponse } from 'next'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { products } from '@/lib/db/schema'
import { fileUrl } from '@/lib/storage'
import { getOrderByToken } from '@/lib/revenue'

const bundledFiles: Record<string, { file: string; name: string }> = {
  'panduan-konten-media-sosial': {
    file: 'panduan-konten-media-sosial.pdf',
    name: 'Panduan-Konten-Media-Sosial-30-Hari.pdf',
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metode tidak diizinkan.' })

  const token = typeof req.query.token === 'string' ? req.query.token : ''
  if (!/^[a-f0-9]{32}$/i.test(token)) return res.status(404).json({ error: 'Pesanan tidak ditemukan.' })

  const order = await getOrderByToken(token)
  if (!order || order.status !== 'paid') {
    return res.status(403).json({ error: 'Unduhan hanya tersedia setelah pembayaran terkonfirmasi.' })
  }

  // Prefer the exact private object uploaded for this product. The unguessable order
  // access token and paid-state check above are required before issuing a short-lived URL.
  const [product] = await db.select().from(products).where(eq(products.id, order.productId)).limit(1)
  if (product?.fileKey) {
    try {
      const signedUrl = await fileUrl(product.fileKey, {
        expiresIn: 300,
        download: product.fileName ?? true,
      })
      if (!signedUrl) return res.status(503).json({ error: 'Berkas unduhan sedang tidak tersedia.' })
      return res.redirect(302, signedUrl)
    } catch (error) {
      console.error('[order-download] private file URL failed:', error)
      return res.status(503).json({ error: 'Berkas unduhan sedang tidak tersedia. Silakan hubungi admin.' })
    }
  }

  // Keep the legacy bundled product available for older orders that have no uploaded file.
  const deliverable = bundledFiles[order.productSlug]
  if (!deliverable) return res.status(404).json({ error: 'Berkas produk belum tersedia.' })

  try {
    const filePath = path.join(process.cwd(), 'public', 'downloads', deliverable.file)
    const file = await readFile(filePath)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${deliverable.name}"`)
    res.setHeader('Content-Length', String(file.byteLength))
    res.setHeader('Cache-Control', 'private, no-store, max-age=0')
    return res.status(200).send(file)
  } catch (error) {
    console.error('[order-download] bundled file unavailable:', error)
    return res.status(503).json({ error: 'Berkas unduhan sedang tidak tersedia. Silakan hubungi admin.' })
  }
}
