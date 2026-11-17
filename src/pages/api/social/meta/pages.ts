import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession, cookieSameSite } from '@/lib/auth'
import { listPages, openToken, saveFacebookAccount } from '@/lib/meta'

/**
 * The page picker. The user token stays sealed in its HttpOnly cookie: this route
 * opens it on the server, lists the pages, and stores the one the owner picked. The
 * response carries page names only — never a token.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  const sealed = req.cookies.cwa_meta_pending
  if (!sealed) {
    return res.status(409).json({ error: 'Sesi penghubungan sudah berakhir. Mulai lagi dari tombol Hubungkan Facebook.' })
  }
  const token = openToken(sealed)
  if (!token) {
    return res.status(409).json({ error: 'Token penghubungan tidak bisa dibuka. Ulangi penghubungan.' })
  }

  if (req.method === 'GET') {
    const result = await listPages(token)
    if (!result.ok) return res.status(502).json({ error: result.message })
    return res.status(200).json({
      ok: true,
      pages: result.pages.map((page) => ({ id: page.id, name: page.name, category: page.category ?? null })),
    })
  }

  if (req.method === 'POST') {
    const pageId = typeof req.body?.pageId === 'string' ? req.body.pageId : ''
    if (!pageId) return res.status(400).json({ error: 'Pilih salah satu halaman.' })

    const result = await listPages(token)
    if (!result.ok) return res.status(502).json({ error: result.message })

    const page = result.pages.find((entry) => entry.id === pageId)
    if (!page) return res.status(404).json({ error: 'Halaman itu tidak ada dalam izin yang Anda berikan.' })

    const saved = await saveFacebookAccount({
      page,
      scopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'business_management'],
      connectedBy: session.ownerId,
    })
    if (!saved.ok) return res.status(409).json({ error: saved.error })

    res.setHeader('Set-Cookie', [
      `cwa_meta_pending=; Path=/; HttpOnly; Secure; SameSite=${cookieSameSite}; Max-Age=0`,
    ])
    return res.status(200).json({ ok: true, page: { id: page.id, name: page.name } })
  }

  return res.status(405).json({ error: 'Metode tidak diizinkan' })
}
