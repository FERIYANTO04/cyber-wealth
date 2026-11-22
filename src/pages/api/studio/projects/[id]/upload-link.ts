import type { NextApiRequest,NextApiResponse } from 'next'
import { randomBytes,randomUUID } from 'node:crypto'
import { sqlClient } from '@/lib/db'
import { requireOwnerSession } from '@/lib/auth'
import { tokenHash,createAssetDownloadUrl } from '@/lib/client-assets'

export default async function handler(req:NextApiRequest,res:NextApiResponse){
 const session=await requireOwnerSession(req)
 if(!session) return res.status(401).json({error:'Sesi owner tidak ditemukan.'})
 const projectId=String(req.query.id||'')
 if(req.method==='POST'){
  const [project]=await sqlClient`SELECT id,project_code,status FROM creative_project WHERE id=${projectId} LIMIT 1`
  if(!project) return res.status(404).json({error:'Proyek tidak ditemukan.'})
  if(['delivered','cancelled'].includes(project.status)) return res.status(409).json({error:'Proyek yang sudah ditutup tidak menerima upload.'})
  const token=randomBytes(32).toString('base64url')
  const expiresAt=new Date(Date.now()+7*24*60*60*1000)
  const accessId=randomUUID()
  await sqlClient.begin(async tx=>{
   await tx`UPDATE creative_asset_access SET revoked_at=now() WHERE project_id=${projectId} AND revoked_at IS NULL`
   await tx`INSERT INTO creative_asset_access (id,project_id,token_hash,expires_at) VALUES (${accessId},${projectId},${tokenHash(token)},${expiresAt})`
   await tx`INSERT INTO creative_project_event (id,project_id,actor,event_type,detail) VALUES (${randomUUID()},${projectId},'owner','upload_link_created','Tautan upload bahan klien diterbitkan; tautan sebelumnya dicabut.')`
  })
  const base=(process.env.APP_URL||'https://cyber-wealth-web-production.up.railway.app').replace(/\/$/,'')
  return res.status(201).json({url:base+'/upload/'+token,expiresAt:expiresAt.toISOString()})
 }
 if(req.method==='GET'){
  const [project]=await sqlClient`SELECT id FROM creative_project WHERE id=${projectId} LIMIT 1`
  if(!project) return res.status(404).json({error:'Proyek tidak ditemukan.'})
  const assets=await sqlClient`SELECT id,file_name,content_type,size_bytes,status,created_at FROM creative_asset WHERE project_id=${projectId} AND status<>'deleted' ORDER BY created_at DESC LIMIT 100`
  const result=await Promise.all(assets.map(async a=>({id:a.id,fileName:a.file_name,contentType:a.content_type,sizeBytes:Number(a.size_bytes),status:a.status,createdAt:new Date(a.created_at).toISOString(),downloadUrl:a.status==='ready'?createAssetDownloadUrl((await sqlClient`SELECT object_key FROM creative_asset WHERE id=${a.id} LIMIT 1`)[0].object_key):null})))
  return res.status(200).json({assets:result})
 }
 res.setHeader('Allow','GET, POST')
 return res.status(405).json({error:'Metode tidak diizinkan.'})
}
