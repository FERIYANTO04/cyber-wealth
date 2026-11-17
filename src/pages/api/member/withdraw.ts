import type {NextApiRequest,NextApiResponse} from 'next'
import {eq,sql} from 'drizzle-orm'
import {z} from 'zod'
import {db} from '@/lib/db'
import {memberAccounts,memberCommissions,memberWithdrawals} from '@/lib/db/schema'
import {getMember} from '@/lib/member-auth'
import {memberReadinessError} from '@/lib/member-readiness'
const body=z.object({amountIdr:z.number().int().min(10000).max(1000000000)})
export default async function handler(req:NextApiRequest,res:NextApiResponse){
 if(req.method!=='POST')return res.status(405).end()
 const readinessError=memberReadinessError();if(readinessError)return res.status(503).json({error:readinessError})
 const s=await getMember(req);if(!s)return res.status(401).json({error:'Silakan masuk'})
 const p=body.safeParse(req.body);if(!p.success)return res.status(400).json({error:'Minimal WD Rp10.000'})
 try {
  const result = await db.transaction(async tx => {
   // Serialize withdrawals per member so two concurrent requests cannot spend the same balance.
   await tx.execute(sql`select id from member_account where id = ${s.id} for update`)
   const a=(await tx.select().from(memberAccounts).where(eq(memberAccounts.id,s.id)).limit(1))[0]
   if(!a?.bankName||!a.bankAccountName||!a.bankAccountNumber)throw new Error('Lengkapi data rekening terlebih dahulu')
   const cs=await tx.select().from(memberCommissions).where(eq(memberCommissions.memberId,s.id))
   const ws=await tx.select().from(memberWithdrawals).where(eq(memberWithdrawals.memberId,s.id))
   const earned=cs.filter(x=>x.status==='approved').reduce((n,x)=>n+x.amountIdr,0)
   const held=ws.filter(x=>['pending','approved','paid'].includes(x.status)).reduce((n,x)=>n+x.amountIdr,0)
   const balance=Math.max(0,earned-held)
   if(p.data.amountIdr>balance)throw new Error('Saldo tersedia tidak mencukupi')
   await tx.insert(memberWithdrawals).values({memberId:s.id,amountIdr:p.data.amountIdr,bankName:a.bankName,bankAccountName:a.bankAccountName,bankAccountNumber:a.bankAccountNumber})
   return true
  })
  if(result)return res.status(201).json({ok:true,message:'Permintaan WD dikirim dan menunggu pemeriksaan admin'})
 } catch(error) {
  const message=error instanceof Error?error.message:'Permintaan WD gagal diproses'
  return res.status(400).json({error:message})
 }
}
