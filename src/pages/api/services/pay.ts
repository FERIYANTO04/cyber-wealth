import type { NextApiRequest, NextApiResponse } from 'next'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { sqlClient } from '@/lib/db'

const Body = z.object({ requestId: z.string().uuid() })
const attempts = new Map<string, { count: number; since: number }>()

function rateLimited(ip: string) {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now - entry.since > 60_000) {
    attempts.set(ip, { count: 1, since: now })
    if (attempts.size > 5000) attempts.clear()
    return false
  }
  entry.count += 1
  return entry.count > 5
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan.' })
  const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'unknown').split(',')[0]
  if (rateLimited(ip)) return res.status(429).json({ error: 'Terlalu banyak percobaan. Coba lagi nanti.' })
  const parsed = Body.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Permintaan pembayaran tidak valid.' })

  const [request] = await sqlClient`SELECT * FROM service_request WHERE id=${parsed.data.requestId} LIMIT 1`
  if (!request || request.status !== 'proposal_sent') {
    return res.status(409).json({ error: 'Pembayaran hanya tersedia untuk penawaran resmi yang sudah dikirim.' })
  }
  const amount = Number(request.proposal_amount_idr ?? 0)
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return res.status(409).json({ error: 'Nilai penawaran belum ditetapkan dengan benar. Hubungi tim Cyber Wealth.' })
  }

  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim() ?? ''
  if (!serverKey) return res.status(503).json({ error: 'Pembayaran online belum tersedia. Tim kami akan menghubungi Anda.' })
  const production = process.env.MIDTRANS_IS_PRODUCTION === 'true'
  const dataSource = production ? 'live' : 'test'

  const [existing] = await sqlClient`SELECT * FROM service_payment
    WHERE service_request_id=${request.id} AND status='pending' AND data_source=${dataSource}
    ORDER BY created_at DESC LIMIT 1`
  if (existing?.invoice_url) {
    return res.status(200).json({ ok: true, paymentUrl: existing.invoice_url, code: existing.code })
  }

  const code = 'CWS-' + new Date().toISOString().slice(2,10).replace(/-/g,'') + '-' + randomUUID().slice(0,8).toUpperCase()
  const id = randomUUID()
  await sqlClient`INSERT INTO service_payment
    (id,code,service_request_id,amount_idr,buyer_name,buyer_email,status,provider,data_source)
    VALUES (${id},${code},${request.id},${amount},${request.name},${request.email},'pending','midtrans',${dataSource})`

  try {
    const base = production ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com'
    const response = await fetch(base + '/snap/v1/transactions', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(serverKey + ':').toString('base64'),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        transaction_details: { order_id: code, gross_amount: amount },
        customer_details: { first_name: request.name, email: request.email },
        item_details: [{ id: request.service_id ?? request.id, price: amount, quantity: 1, name: String(request.service_name).slice(0,50) }],
        callbacks: { finish: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cyber-wealth-web-production.up.railway.app') + '/layanan/pembayaran/' + request.id + '?status=returned' },
      }),
      signal: AbortSignal.timeout(15000),
    })
    const payload = await response.json().catch(() => ({})) as { token?: string; redirect_url?: string }
    if (!response.ok || !payload.token || !payload.redirect_url) {
      await sqlClient`UPDATE service_payment SET status='failed' WHERE id=${id}`
      return res.status(502).json({ error: 'Gerbang pembayaran belum dapat menerbitkan tagihan. Tidak ada pekerjaan yang dimulai.' })
    }
    await sqlClient`UPDATE service_payment SET invoice_id=${payload.token}, invoice_url=${payload.redirect_url} WHERE id=${id}`
    return res.status(201).json({ ok: true, code, paymentUrl: payload.redirect_url })
  } catch {
    await sqlClient`UPDATE service_payment SET status='failed' WHERE id=${id}`
    return res.status(502).json({ error: 'Tidak dapat menghubungi gerbang pembayaran. Tidak ada pekerjaan yang dimulai.' })
  }
}
