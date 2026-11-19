import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { db } from '@/lib/db'
import { transactions } from '@/lib/db/schema'
import { requireOwnerSession } from '@/lib/auth'
import { logActivity } from '@/lib/data'

const Body = z.object({
  kind: z.enum(['revenue', 'expense']),
  ledger: z.enum(['owner', 'company']).default('owner'),
  category: z.string().trim().min(2, 'Kategori wajib diisi').max(60),
  description: z.string().trim().min(3, 'Keterangan wajib diisi').max(160),
  amountIdr: z.coerce.number().int('Jumlah harus bilangan bulat').positive('Jumlah harus lebih dari nol').max(1_000_000_000_000_000),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' })

  const session = await requireOwnerSession(req)
  if (!session) return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk.' })

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' })
  }

  const { kind, ledger, category, description, amountIdr } = parsed.data

  await db.insert(transactions).values({
    kind,
    category,
    description,
    amountIdr,
    dataSource: 'live',
    ledger,
  })

  await logActivity({
    actor: 'owner',
    action: kind === 'revenue' ? 'Pemasukan dicatat' : 'Pengeluaran dicatat',
    detail: `[${ledger === 'company' ? 'Perusahaan' : 'Owner'}] ${description} — Rp ${amountIdr.toLocaleString('id-ID')}`,
  })

  return res.status(200).json({ ok: true })
}
