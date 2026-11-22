import type { NextApiRequest,NextApiResponse } from 'next'
import { sqlClient } from '@/lib/db'
import { requireOwnerSession } from '@/lib/auth'
import { createAssetDownloadUrl } from '@/lib/client-assets'

export default async function handler(req:NextApiRequest,res:NextApiResponse){
 const session=await requireOwnerSession(req)
 if(!session) return res.status(401).json({error:'Sesi owner tidak ditemukan.'})
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Metode tidak diizinkan.'})}
 const projectId=String(req.query.id||'')
 const [project]=await sqlClient`SELECT id FROM creative_project WHERE id=${projectId} LIMIT 1`
 if(!project) return res.status(404).json({error:'Proyek tidak ditemukan.'})
 const assets=await sqlClient`SELECT id,file_name,content_type,size_bytes,status,object_key,created_at FROM creative_asset WHERE project_id=${projectId} AND status<>'deleted' ORDER BY created_at DESC LIMIT 100`
 const result=await Promise.all(assets.map(async a=>({id:a.id,fileName:a.file_name,contentType:a.content_type,sizeBytes:Number(a.size_bytes),status:a.status,createdAt:new Date(a.created_at).toISOString(),downloadUrl:a.status==='ready'?createAssetDownloadUrl(a.object_key):null})))
 return res.status(200).json({assets:result})
}
