import type { NextApiRequest, NextApiResponse } from 'next'
import { jwtVerify } from 'jose'
import { cookieSameSite } from '@/lib/auth'
import { exchangeCode, listPages, sealToken, saveFacebookAccount } from '@/lib/meta'

/**
 * Meta sends the owner back here with an authorization code. The code is exchanged on
 * the server, the resulting user token is sealed into an HttpOnly cookie for the page
 * picker, and it is never put in a URL or handed to browser JavaScript.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const error = typeof req.query.error === 'string' ? req.query.error : null
  if (error) {
    const description = typeof req.query.error_description === 'string' ? req.query.error_description : error
    return res.redirect(`/facebook?error=${encodeURIComponent(description.slice(0, 160))}`)
  }

  const code = typeof req.query.code === 'string' ? req.query.code : ''
  const state = typeof req.query.state === 'string' ? req.query.state : ''
  if (!code) return res.redirect('/facebook?error=Kode%20otorisasi%20tidak%20diterima')

  const secret = process.env.JWT_SECRET
  if (!secret) return res.redirect('/facebook?error=Kunci%20sesi%20aplikasi%20belum%20ada')

  const stateCookie = req.cookies.cwa_meta_state
  if (!stateCookie || stateCookie !== state) {
    return res.redirect('/facebook?error=Permintaan%20tidak%20cocok.%20Ulangi%20penghubungan.')
  }

  let ownerId = ''
  try {
    const { payload } = await jwtVerify(state, new TextEncoder().encode(secret), { algorithms: ['HS256'] })
    if (payload.purpose !== 'meta-oauth' || !payload.sub) throw new Error('bad state')
    ownerId = payload.sub
  } catch {
    return res.redirect('/facebook?error=Sesi%20penghubungan%20kedaluwarsa.%20Coba%20lagi.')
  }

  const origin = (req.headers.origin as string | undefined) ?? `https://${req.headers.host}`
  const exchanged = await exchangeCode(origin, code)
  if (!exchanged.ok) {
    return res.redirect(`/facebook?error=${encodeURIComponent(exchanged.message.slice(0, 160))}`)
  }

  const pages = await listPages(exchanged.userToken)
  if (!pages.ok) {
    return res.redirect(`/facebook?error=${encodeURIComponent(pages.message.slice(0, 160))}`)
  }
  if (pages.pages.length === 0) {
    return res.redirect('/facebook?error=Tidak%20ada%20Halaman%20Facebook%20yang%20Anda%20kelola%20dalam%20izin%20ini.')
  }

  if (pages.pages.length === 1) {
    const saved = await saveFacebookAccount({
      page: pages.pages[0],
      scopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'business_management'],
      connectedBy: ownerId,
    })
    if (!saved.ok) return res.redirect(`/facebook?error=${encodeURIComponent(saved.error.slice(0, 160))}`)
    return res.redirect('/facebook?connected=1')
  }

  // Several pages: keep the token sealed in an HttpOnly cookie until the owner picks.
  const sealed = sealToken(exchanged.userToken)
  if (!sealed) return res.redirect('/facebook?error=Token%20tidak%20bisa%20disimpan%20dengan%20aman')

  res.setHeader('Set-Cookie', [
    `cwa_meta_pending=${sealed}; Path=/; HttpOnly; Secure; SameSite=${cookieSameSite}; Max-Age=900`,
    `cwa_meta_state=; Path=/; HttpOnly; Secure; SameSite=${cookieSameSite}; Max-Age=0`,
  ])
  return res.redirect('/facebook?choose=1')
}
