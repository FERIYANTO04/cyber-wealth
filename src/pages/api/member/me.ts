import type { NextApiRequest, NextApiResponse } from 'next'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { memberAccounts, memberCommissions, memberWithdrawals } from '@/lib/db/schema'
import { getMember } from '@/lib/member-auth'
import { memberReadinessError } from '@/lib/member-readiness'
export default async function handler(req:NextApiRequest,res:NextApiResponse){const readinessError=memberReadinessError();if(readinessError)return res.status(503).json({error:readinessError});const session=await getMember(req);if(!session)return res.status(401).json({error:'Silakan masuk sebagai anggota'})
 if(req.method==='GET'){
 const a=(await db.select({id:memberAccounts.id,name:memberAccounts.name,email:memberAccounts.email,referralCode:memberAccounts.referralCode,phone:memberAccounts.phone,bankName:memberAccounts.bankName,bankAccountName:memberAccounts.bankAccountName,bankAccountNumber:memberAccounts.bankAccountNumber}).from(memberAccounts).where(eq(memberAccounts.id,session.id)).limit(1))[0]
 const commissions=await db.select().from(memberCommissions).where(eq(memberCommissions.memberId,session.id)).orderBy(desc(memberCommissions.createdAt))
 const withdrawals=await db.select().from(memberWithdrawals).where(eq(memberWithdrawals.memberId,session.id)).orderBy(desc(memberWithdrawals.createdAt))
 const earned=commissions.filter(x=>x.status==='approved').reduce((s,x)=>s+x.amountIdr,0);const reserved=withdrawals.filter(x=>['pending','approved','paid'].includes(x.status)).reduce((s,x)=>s+x.amountIdr,0)
 return res.status(200).json({account:a,commissions,withdrawals,balance:Math.max(0,earned-reserved)})
 }
 if(req.method==='PATCH'){
 const {name,phone,bankName,bankAccountName,bankAccountNumber}=req.body??{}
 if(typeof name!=='string'||name.trim().length<2)return res.status(400).json({error:'Nama tidak valid'})
 await db.update(memberAccounts).set({name:name.trim(),phone:String(phone??'').slice(0,30),bankName:String(bankName??'').slice(0,80),bankAccountName:String(bankAccountName??'').slice(0,100),bankAccountNumber:String(bankAccountNumber??'').slice(0,50)}).where(eq(memberAccounts.id,session.id));return res.status(200).json({ok:true})
 }
 return res.status(405).end()
}
