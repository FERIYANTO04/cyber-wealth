import type { NextApiRequest,NextApiResponse } from 'next'
import { randomUUID } from 'node:crypto'
import { sqlClient } from '@/lib/db'
import { requireOwnerSession } from '@/lib/auth'
import { deleteAssetObject } from '@/lib/client-assets'

export default async function handler(req:NextApiRequest,res:NextApiResponse){
 const session=await requireOwnerSession(req)
 if(!session) return res.status(401).json({error:'Sesi owner tidak ditemukan.'})
 if(req.method!=='DELETE'){res.setHeader('Allow','DELETE');return res.status(405).json({error:'Metode tidak diizinkan.'})}
 const id=String(req.query.assetId||'')
 const [asset]=await sqlClient`SELECT id,project_id,object_key,file_name,status FROM creative_asset WHERE id=${id} LIMIT 1`
 if(!asset) return res.status(404).json({error:'File tidak ditemukan.'})
 if(asset.status==='deleted') return res.status(200).json({ok:true})
 try{await deleteAssetObject(asset.object_key)}catch(error){return res.status(502).json({error:error instanceof Error?error.message:'Penghapusan object gagal.'})}
 await sqlClient.begin(async tx=>{
  await tx`UPDATE creative_asset SET status='deleted',updated_at=now() WHERE id=${id}`
  await tx`INSERT INTO creative_project_event (id,project_id,actor,event_type,detail) VALUES (${randomUUID()},${asset.project_id},'owner','asset_deleted',${'Owner menghapus file bahan '+asset.file_name+'.'})`
 })
 return res.status(200).json({ok:true})
}
