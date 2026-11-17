import type { NextApiRequest, NextApiResponse } from 'next'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const databaseConfigured = Boolean(process.env.DATABASE_URL && /^postgres(?:ql)?:\/\//i.test(process.env.DATABASE_URL))
  const secret = process.env.JWT_SECRET ?? ''
  const authConfigured = secret.length >= 32 && !/change-me|replace|example|development/i.test(secret)
  let database = 'not_configured'
  if (databaseConfigured) {
    try {
      await db.execute(sql`select 1`)
      database = 'connected'
    } catch {
      database = 'connection_failed'
    }
  }
  const bankTransferConfigured = Boolean(
    process.env.BANK_NAME?.trim() &&
    process.env.BANK_ACCOUNT_NAME?.trim() &&
    process.env.BANK_ACCOUNT_NUMBER?.trim()
  )
  const ready = database === 'connected' && authConfigured
  return res.status(ready ? 200 : 503).json({
    ready,
    database,
    authentication: authConfigured ? 'configured' : 'not_configured_or_weak',
    payment: bankTransferConfigured ? 'manual_bank_transfer_configured' : 'manual_bank_transfer_details_missing',
    note: bankTransferConfigured ? 'Pembayaran menggunakan transfer bank manual; status lunas hanya setelah owner memverifikasi mutasi.' : 'Isi detail rekening bank owner untuk menampilkan instruksi transfer kepada pembeli.'
  })
}
