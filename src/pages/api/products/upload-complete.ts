import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { products } from '@/lib/db/schema'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/data'

const Body = z.object({
  productId: z.string().regex(/^(?:[0-9a-fA-F]{32}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/),
  key: z.string().min(1).max(240),
  fileName: z.string().trim().min(1).max(160),
  size: z.number().int().positive().max(20 * 1024 * 1024),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const session = await getSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Data berkas tidak valid.' })

  const { productId, key, fileName, size } = parsed.data
  const safeId = productId.toLowerCase()
  const keyPattern = new RegExp(`^produk/${safeId}/[0-9a-f-]{36}\\.[a-z0-9]{1,8}$`, 'i')
  if (!keyPattern.test(key)) return res.status(400).json({ error: 'Kunci berkas tidak cocok dengan produk.' })

  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1)
  if (!product) return res.status(404).json({ error: 'Produk tidak ditemukan.' })

  await db.update(products)
    .set({ fileKey: key, fileName, fileSize: size })
    .where(eq(products.id, productId))

  await logActivity({
    actor: 'owner',
    action: 'Berkas produk dilampirkan',
    detail: `${fileName} pada produk ${product.name}.`,
  })

  return res.status(200).json({ ok: true })
}

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } }
