import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { getSession } from '@/lib/auth'
import { uploadObject } from '@/lib/storage'
import { db } from '@/lib/db'
import { products } from '@/lib/db/schema'
import { logActivity } from '@/lib/data'

const MAX_BYTES = 20 * 1024 * 1024
const ProductId = z.string().regex(/^(?:[0-9a-fA-F]{32}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/)
const FileName = z.string().trim().min(1).max(160)
const ALLOWED = /^(application\/(zip|x-zip-compressed|pdf|epub\+zip|json|vnd\.openxmlformats-officedocument\.[a-z.]+)|text\/(plain|csv|markdown)|image\/(png|jpeg|webp|svg\+xml))$/

async function readBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of req) {
    const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += part.length
    if (total > MAX_BYTES) throw new Error('FILE_TOO_LARGE')
    chunks.push(part)
  }
  return Buffer.concat(chunks, total)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })
  const session = await getSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  const productId = ProductId.safeParse(req.headers['x-product-id'])
  let decodedName = ''
  try {
    decodedName = decodeURIComponent(String(req.headers['x-file-name'] ?? ''))
  } catch {
    return res.status(400).json({ error: 'Nama berkas tidak valid.' })
  }
  const fileName = FileName.safeParse(decodedName)
  const contentType = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase()
  if (!productId.success || !fileName.success || !ALLOWED.test(contentType)) {
    return res.status(400).json({ error: 'Data berkas tidak valid atau jenis berkas belum didukung.' })
  }

  const declaredSize = Number(req.headers['content-length'] ?? 0)
  if (declaredSize > MAX_BYTES) return res.status(413).json({ error: 'Berkas terlalu besar. Maksimal 20 MB per berkas.' })

  let body: Buffer
  try {
    body = await readBody(req)
  } catch (error) {
    if (error instanceof Error && error.message === 'FILE_TOO_LARGE') {
      return res.status(413).json({ error: 'Berkas terlalu besar. Maksimal 20 MB per berkas.' })
    }
    return res.status(400).json({ error: 'Isi berkas tidak dapat dibaca.' })
  }
  if (!body.length) return res.status(400).json({ error: 'Berkas kosong.' })
  if (declaredSize && declaredSize !== body.length) return res.status(400).json({ error: 'Ukuran berkas tidak cocok.' })

  const [product] = await db.select().from(products).where(eq(products.id, productId.data)).limit(1)
  if (!product) return res.status(404).json({ error: 'Produk tidak ditemukan.' })

  const ext = fileName.data.includes('.')
    ? fileName.data.split('.').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)
    : 'bin'
  const key = `produk/${productId.data.toLowerCase()}/${randomUUID()}.${ext || 'bin'}`

  try {
    await uploadObject(key, body, contentType)
  } catch (error) {
    console.error('[product upload] storage failed:', error instanceof Error ? error.message : error)
    return res.status(502).json({ error: 'Penyimpanan berkas gagal menerima unggahan. Data produk belum diubah.' })
  }

  try {
    await db.update(products)
      .set({ fileKey: key, fileName: fileName.data, fileSize: body.length })
      .where(eq(products.id, productId.data))
    await logActivity({ actor: 'owner', action: 'Berkas produk dilampirkan', detail: `${fileName.data} pada produk ${product.name}.` })
  } catch (error) {
    console.error('[product upload] metadata save failed:', error instanceof Error ? error.message : error)
    return res.status(500).json({ error: 'Berkas sudah masuk penyimpanan, tetapi data produk belum tersimpan. Hubungi dukungan sebelum mengunggah ulang.' })
  }

  return res.status(200).json({ ok: true, key, fileName: fileName.data, size: body.length })
}

export const config = { api: { bodyParser: false, responseLimit: false } }
