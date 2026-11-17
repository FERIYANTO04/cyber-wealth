import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { decidePost, getPosts, setPostSchedule, updatePost } from '@/lib/social'

const Post = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('decide'),
    postId: z.string().trim().min(1).max(80),
    decision: z.enum(['approved', 'rejected']),
    note: z.string().trim().max(400).optional(),
    scheduledAt: z.string().trim().max(40).nullable().optional(),
  }),
  z.object({
    action: z.literal('edit'),
    postId: z.string().trim().min(1).max(80),
    headline: z.string().trim().max(140).optional(),
    body: z.string().trim().max(5000).optional(),
  }),
  z.object({
    action: z.literal('schedule'),
    postId: z.string().trim().min(1).max(80),
    scheduledAt: z.string().trim().max(40).nullable(),
  }),
])

/** Everything the owner does to a post before it could ever be published. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, posts: await getPosts() })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const parsed = Post.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Permintaan tidak valid.' })

  const data = parsed.data
  if (data.action === 'decide') {
    const result = await decidePost({
      postId: data.postId,
      decision: data.decision,
      note: data.note,
      scheduledAt: data.scheduledAt ?? null,
    })
    if (!result.ok) return res.status(409).json({ error: result.error })
    return res.status(200).json({ ok: true })
  }

  if (data.action === 'edit') {
    const result = await updatePost({ postId: data.postId, headline: data.headline, body: data.body })
    if (!result.ok) return res.status(409).json({ error: result.error })
    return res.status(200).json({ ok: true })
  }

  const result = await setPostSchedule(data.postId, data.scheduledAt)
  if (!result.ok) return res.status(409).json({ error: result.error })
  return res.status(200).json({ ok: true })
}
