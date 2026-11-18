import type { NextApiRequest, NextApiResponse } from 'next'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { requireOwnerSession } from '@/lib/auth'
import { uploadUrl } from '@/lib/storage'
import { setPostMedia } from '@/lib/social'

const MAX_BYTES = 40 * 1024 * 1024

const Sign = z.object({
  action: z.literal('sign'),
  postId: z.string().trim().min(1).max(80),
  contentType: z.string().trim().min(1).max(120),
  size: z.coerce.number().int().positive(),
  fileName: z.string().trim().min(1).max(160),
})

const Attach = z.object({
  action: z.literal('attach'),
  postId: z.string().trim().min(1).max(80),
  key: z.string().trim().min(1).max(200),
  mediaType: z.enum(['image', 'video']),
})

const Body = z.discriminatedUnion('action', [Sign, Attach])

const KIND: { pattern: RegExp; type: 'image' | 'video'; ext: string }[] = [
  { pattern: /^image\/(png|jpeg|webp)$/, type: 'image', ext: 'jpg' },
  { pattern: /^video\/(mp4|quicktime)$/, type: 'video', ext: 'mp4' },
]

/**
 * Two steps so the row never claims a file that never arrived: `sign` hands the browser
 * an upload URL, the browser PUTs the bytes to private storage, and `attach` records the
 * key once that succeeded. Nothing here accepts the file itself.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const session = await requireOwnerSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Data berkas tidak valid.' })
  const data = parsed.data

  if (data.action === 'attach') {
    // Only keys this route could have produced are accepted.
    if (!data.key.startsWith(`konten/${data.postId}/`) || data.key.includes('..')) {
      return res.status(400).json({ error: 'Berkas itu bukan milik konten ini.' })
    }
    const saved = await setPostMedia({ postId: data.postId, mediaKey: data.key, mediaType: data.mediaType })
    if (!saved.ok) return res.status(409).json({ error: saved.error })
    return res.status(200).json({ ok: true })
  }

  if (data.size > MAX_BYTES) {
    return res.status(400).json({ error: 'Berkas terlalu besar. Maksimal 40 MB per berkas.' })
  }

  const kind = KIND.find((entry) => entry.pattern.test(data.contentType))
  if (!kind) {
    return res.status(400).json({ error: 'Gunakan foto JPG, PNG, atau WebP, atau video MP4/MOV.' })
  }

  const key = `konten/${data.postId}/${randomUUID()}.${kind.ext}`

  try {
    return res.status(200).json({ ok: true, uploadUrl: await uploadUrl(key), key, mediaType: kind.type })
  } catch (error) {
    console.error('[social media] sign failed:', error instanceof Error ? error.message : error)
    return res.status(502).json({ error: 'Penyimpanan berkas tidak menjawab. Coba lagi sebentar lagi.' })
  }
}

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } }
