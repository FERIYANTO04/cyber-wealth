import type {NextApiRequest,NextApiResponse} from 'next'
import {z} from 'zod'
import {eq,desc} from 'drizzle-orm'
import {db} from '@/lib/db'
import {memberAccounts,memberCommissions} from '@/lib/db/schema'
import {requireOwnerSession} from '@/lib/auth'
import {memberReadinessError} from '@/lib/member-readiness'
const schema=z.object({memberId:z.string().min(1),sourceType:z.enum(['referral','sale','task','adjustment']),description:z.string().trim().min(3).max(240),amountIdr:z.number().int().positive().max(1000000000)})
export default async function handler(req:NextApiRequest,res:NextApiResponse){const readinessError=memberReadinessError();if(readinessError)return res.status(503).json({error:readinessError});if(!await requireOwnerSession(req))return res.status(401).json({error:'Admin only'});if(req.method==='GET'){const rows=await db.select({id:memberAccounts.id,name:memberAccounts.name,email:memberAccounts.email,referralCode:memberAccounts.referralCode,createdAt:memberAccounts.createdAt}).from(memberAccounts).orderBy(desc(memberAccounts.createdAt));return res.status(200).json({members:rows})}if(req.method==='POST'){const p=schema.safeParse(req.body);if(!p.success)return res.status(400).json({error:p.error.issues[0]?.message??'Data tidak valid'});const m=await db.select({id:memberAccounts.id}).from(memberAccounts).where(eq(memberAccounts.id,p.data.memberId)).limit(1);if(!m[0])return res.status(404).json({error:'Anggota tidak ditemukan'});await db.insert(memberCommissions).values({...p.data,status:'approved'});return res.status(201).json({ok:true})}return res.status(405).end()}
