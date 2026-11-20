import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { products } from '@/lib/db/schema'
import { requireOwnerSession } from '@/lib/auth'
import { logActivity } from '@/lib/data'
import { putFile } from '@/lib/storage'
import { randomUUID } from 'node:crypto'

const Body = z.object({ productId: z.string().uuid() })
const TRUSTED_PREFIX = 'https://raw.githubusercontent.com/FERIYANTO04/cyber-wealth/main/public/produk/'
const MAX_BYTES = 20 * 1024 * 1024

/** Copies only this repository's existing public product Markdown into private object storage. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan.' })
  const session = await requireOwnerSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Produk tidak valid.' })

  const [product] = await db.select().from(products).where(eq(products.id, parsed.data.productId)).limit(1)
  if (!product) return res.status(404).json({ error: 'Produk tidak ditemukan.' })
  if (!product.fileKey?.startsWith(TRUSTED_PREFIX) || !product.fileName?.toLowerCase().endsWith('.md')) {
    return res.status(409).json({ error: 'Berkas ini bukan Markdown publik Cyber Wealth yang dapat dipindahkan otomatis. Unggah berkas final melalui tombol Berkas.' })
  }

  try {
    const source = await fetch(product.fileKey, { cache: 'no-store', signal: AbortSignal.timeout(15000) })
    if (!source.ok) return res.status(502).json({ error: 'Berkas sumber tidak dapat diambil dari repositori.' })
    const bytes = await source.arrayBuffer()
    if (!bytes.byteLength || bytes.byteLength > MAX_BYTES) {
      return res.status(400).json({ error: 'Ukuran berkas sumber tidak valid atau melebihi 20 MB.' })
    }

    const key = `produk/${product.id}/${randomUUID()}.md`
    await putFile(key, bytes, 'text/markdown')
    await db.update(products).set({ fileKey: key, fileSize: bytes.byteLength }).where(eq(products.id, product.id))
    await logActivity({
      actor: 'owner',
      action: 'Berkas publik dipindahkan ke penyimpanan privat',
      detail: `${product.fileName} pada produk ${product.name}. Unduhan sekarang memerlukan pesanan lunas.`,
    })
    return res.status(200).json({ ok: true, key, size: bytes.byteLength })
  } catch (error) {
    console.error('[secure product file]', error instanceof Error ? error.message : error)
    return res.status(502).json({ error: 'Gagal memindahkan berkas ke penyimpanan privat. Periksa koneksi Object Storage.' })
  }
}
