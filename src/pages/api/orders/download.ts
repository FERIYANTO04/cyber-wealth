import type { NextApiRequest, NextApiResponse } from 'next'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getOrderByToken, getProductById } from '@/lib/revenue'
import { getFile } from '@/lib/storage'

const bundledFiles: Record<string, { file: string; name: string; contentType?: string }> = {
  'kalkulator-hpp-umkm': {
    file: 'kalkulator-hpp-umkm.html',
    name: 'Cyber-Wealth-Kalkulator-HPP-UMKM.html',
    contentType: 'text/html; charset=utf-8',
  },
  'panduan-konten-media-sosial': {
    file: 'panduan-konten-media-sosial.pdf',
    name: 'Panduan-Konten-Media-Sosial-30-Hari.pdf',
  },
}

function safeDownloadName(value: string): string {
  return value.split('\r').join('_').split('\n').join('_').split('"').join('_').split('\\').join('_').slice(0, 160) || 'unduhan'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metode tidak diizinkan.' })

  const token = typeof req.query.token === 'string' ? req.query.token : ''
  if (!/^[a-f0-9]{32}$/i.test(token)) return res.status(404).json({ error: 'Pesanan tidak ditemukan.' })

  const order = await getOrderByToken(token)
  if (!order || order.status !== 'paid') {
    return res.status(403).json({ error: 'Unduhan hanya tersedia setelah pembayaran terkonfirmasi.' })
  }

  try {
    // Prefer the exact private deliverable attached to this product. This keeps
    // customer delivery aligned with the Owner's current uploaded file, rather
    // than silently serving an older bundled copy.
    const product = await getProductById(order.productId)
    if (product?.fileKey?.startsWith('bundled:')) {
      const deliverable = bundledFiles[order.productSlug]
      if (!deliverable || product.fileKey !== 'bundled:' + deliverable.file) return res.status(404).json({ error: 'Berkas produk belum tersedia.' })
      const filePath = path.join(process.cwd(), 'public', 'downloads', deliverable.file)
      const file = await readFile(filePath)
      res.setHeader('Content-Type', deliverable.contentType || 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${safeDownloadName(deliverable.name)}"`)
      res.setHeader('Content-Length', String(file.byteLength))
      res.setHeader('Cache-Control', 'private, no-store, max-age=0')
      return res.status(200).send(file)
    }
    if (product?.fileKey) {
      const stored = await getFile(product.fileKey)
      if (!stored) {
        return res.status(503).json({ error: 'Berkas produk belum dapat diambil dari penyimpanan. Silakan hubungi admin.' })
      }
      const name = safeDownloadName(product.fileName || order.productName)
      res.setHeader('Content-Type', stored.contentType || 'application/octet-stream')
      res.setHeader('Content-Disposition', `attachment; filename="${name}"`)
      res.setHeader('Content-Length', String(stored.data.byteLength))
      res.setHeader('Cache-Control', 'private, no-store, max-age=0')
      return res.status(200).send(Buffer.from(stored.data))
    }

    // Keep compatibility with the original bundled product for older catalogue rows.
    const deliverable = bundledFiles[order.productSlug]
    if (!deliverable) return res.status(404).json({ error: 'Berkas produk belum tersedia.' })

    const filePath = path.join(process.cwd(), 'public', 'downloads', deliverable.file)
    const file = await readFile(filePath)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${deliverable.name}"`)
    res.setHeader('Content-Length', String(file.byteLength))
    res.setHeader('Cache-Control', 'private, no-store, max-age=0')
    return res.status(200).send(file)
  } catch (error) {
    console.error('[order-download] deliverable unavailable:', error instanceof Error ? error.message : error)
    return res.status(503).json({ error: 'Berkas unduhan sedang tidak tersedia. Silakan hubungi admin.' })
  }
}
