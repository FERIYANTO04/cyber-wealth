import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Read-only Paddle integration probe.
 * It never returns credentials or customer data; it only verifies that the
 * production API key can authenticate against the configured Paddle environment.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' })

  const apiKey = process.env.PADDLE_API_KEY?.trim() ?? ''
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET?.trim() ?? ''
  const environment = process.env.PADDLE_ENV === 'sandbox' ? 'sandbox' : 'production'

  if (!apiKey || !webhookSecret) {
    return res.status(503).json({
      ok: false,
      environment,
      apiKeyConfigured: Boolean(apiKey),
      webhookSecretConfigured: Boolean(webhookSecret),
      apiAuthenticated: false,
      message: 'Konfigurasi Paddle belum lengkap.',
    })
  }

  const base = environment === 'sandbox' ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com'
  try {
    const response = await fetch(base + '/products?per_page=1', {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + apiKey, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return res.status(502).json({
        ok: false,
        environment,
        apiKeyConfigured: true,
        webhookSecretConfigured: true,
        apiAuthenticated: false,
        paddleStatus: response.status,
        message: response.status === 401 || response.status === 403
          ? 'Paddle menolak API key. Periksa mode live/sandbox dan izin key.'
          : 'Paddle API belum merespons dengan sukses.',
      })
    }

    return res.status(200).json({
      ok: true,
      environment,
      apiKeyConfigured: true,
      webhookSecretConfigured: true,
      apiAuthenticated: true,
      message: 'Koneksi API Paddle berhasil. Tidak ada pembayaran yang dibuat.',
    })
  } catch {
    return res.status(502).json({
      ok: false,
      environment,
      apiKeyConfigured: true,
      webhookSecretConfigured: true,
      apiAuthenticated: false,
      message: 'Tidak dapat menjangkau Paddle API dari server.',
    })
  }
}
