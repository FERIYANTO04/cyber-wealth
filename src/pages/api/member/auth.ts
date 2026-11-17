import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { memberAccounts } from '@/lib/db/schema'
import { createMemberToken, memberCookie, clearMemberCookie } from '@/lib/member-auth'
import { memberReadinessError } from '@/lib/member-readiness'
const schema = z.object({ action: z.enum(['register','login','logout']), name: z.string().trim().min(2).max(100).optional(), email: z.string().trim().toLowerCase().email(), password: z.string().min(8).max(100), referralCode: z.string().trim().max(32).optional() })
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
 if(req.method!=='POST') return res.status(405).end()
 if(req.body?.action==='logout'){res.setHeader('Set-Cookie',clearMemberCookie());return res.status(200).json({ok:true})}
 const p=schema.safeParse(req.body); if(!p.success)return res.status(400).json({error:p.error.issues[0]?.message??'Data tidak valid'})
 const {action,email,password,name,referralCode}=p.data
 const readinessError = memberReadinessError()
 if (readinessError) return res.status(503).json({error: readinessError})
 if(action==='register'){
  if(!name)return res.status(400).json({error:'Nama wajib diisi'})
  const exists=await db.select({id:memberAccounts.id}).from(memberAccounts).where(eq(memberAccounts.email,email)).limit(1); if(exists[0])return res.status(409).json({error:'Email sudah terdaftar'})
  let referredBy:string|undefined
  if(referralCode){const ref=await db.select({id:memberAccounts.id}).from(memberAccounts).where(eq(memberAccounts.referralCode,referralCode.toUpperCase())).limit(1);if(!ref[0])return res.status(400).json({error:'Kode referral tidak ditemukan'});referredBy=ref[0].id}
  // Build the session before writing the account so a missing signing key cannot
  // leave a newly-created account that the user cannot log into.
  const passwordHash = await bcrypt.hash(password, 12)
  const code=`CW${crypto.randomUUID().replace(/-/g,'').slice(0,8).toUpperCase()}`
  try {
   const rows=await db.insert(memberAccounts).values({email,name,passwordHash,referralCode:code,referredBy}).returning({id:memberAccounts.id,email:memberAccounts.email})
   const token=await createMemberToken(rows[0].id,email)
   if(!token) return res.status(500).json({error:'JWT_SECRET belum dikonfigurasi'})
   res.setHeader('Set-Cookie',memberCookie(token)); return res.status(201).json({ok:true})
  } catch (error) {
   // A concurrent registration can pass the pre-check; let the unique index decide.
   const message = error instanceof Error ? error.message : ''
   if (/unique|duplicate/i.test(message)) return res.status(409).json({error:'Email atau kode referral sudah digunakan. Coba lagi.'})
   console.error('[member register] failed:', message)
   return res.status(500).json({error:'Pendaftaran gagal diproses. Coba lagi.'})
  }
 }
 const rows=await db.select().from(memberAccounts).where(eq(memberAccounts.email,email)).limit(1);const account=rows[0]
 if(!account||!(await bcrypt.compare(password,account.passwordHash)))return res.status(401).json({error:'Email atau kata sandi salah'})
 const token=await createMemberToken(account.id,email);if(!token)return res.status(500).json({error:'JWT_SECRET belum dikonfigurasi'})
 res.setHeader('Set-Cookie',memberCookie(token));return res.status(200).json({ok:true})
}
