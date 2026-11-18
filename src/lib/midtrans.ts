import { createHash, timingSafeEqual } from 'node:crypto'
import { isPlaceholder } from './env'

const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY?.trim() ?? ''
const PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true'

export function midtransConfigured(): boolean {
  return Boolean(SERVER_KEY && !isPlaceholder(SERVER_KEY))
}

function appOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_STATIC_URL
  if (!configured) throw new Error('Domain publik aplikasi belum tersedia untuk menyelesaikan pembayaran.')
  return configured.startsWith('http') ? configured.replace(/\/+$/, '') : 'https://' + configured.replace(/\/+$/, '')
}

export async function createMidtransSnapPayment(args: {
  orderCode: string
  amountIdr: number
  productId: string
  productName: string
  buyerName: string
  buyerEmail: string
  accessToken: string
}): Promise<{ token: string; redirectUrl: string }> {
  if (!midtransConfigured()) throw new Error('MIDTRANS_SERVER_KEY belum dikonfigurasi.')

  const endpoint = PRODUCTION
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions'
  const finishUrl = appOrigin() + '/pesanan/' + encodeURIComponent(args.accessToken)

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from(SERVER_KEY + ':').toString('base64'),
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: args.orderCode,
        gross_amount: args.amountIdr,
      },
      item_details: [{
        id: args.productId.slice(0, 50),
        price: args.amountIdr,
        quantity: 1,
        name: args.productName.slice(0, 50),
      }],
      customer_details: {
        first_name: args.buyerName.slice(0, 50),
        email: args.buyerEmail,
      },
      callbacks: { finish: finishUrl },
    }),
    cache: 'no-store',
  })

  const body = await response.json().catch(() => null) as
    | { token?: string; redirect_url?: string; error_messages?: string[] }
    | null

  if (!response.ok || !body?.token || !body.redirect_url) {
    const reason = body?.error_messages?.join('; ') || 'Midtrans tidak mengembalikan halaman pembayaran.'
    throw new Error('Gagal membuat pembayaran Midtrans: ' + reason.slice(0, 400))
  }

  return { token: body.token, redirectUrl: body.redirect_url }
}

export function verifyMidtransSignature(input: {
  order_id: string
  status_code: string
  gross_amount: string
  signature_key: string
}): boolean {
  if (!midtransConfigured()) return false
  const expected = createHash('sha512')
    .update(input.order_id + input.status_code + input.gross_amount + SERVER_KEY, 'utf8')
    .digest()
  const supplied = Buffer.from(input.signature_key, 'hex')
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}
