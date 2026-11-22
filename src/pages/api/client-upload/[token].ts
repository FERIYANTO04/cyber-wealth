import type { NextApiRequest, NextApiResponse } from 'next'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { sqlClient } from '@/lib/db'
import { createAssetUploadUrl, tokenHash } from '@/lib/client-assets'

const MAX_FILE = 1024 * 1024 * 1024
const PROJECT_QUOTA = 5 * 1024 * 1024 * 1024
const ALLOWED = new Set([
 'image/jpeg','image/png','image/webp',
 'video/mp4','video/quicktime','video/webm','video/x-matroska',
 'audio/mpeg','audio/mp4','audio/wav','audio/x-wav','audio/aac','audio/ogg',
 'application/pdf','text/plain'
])
const Body = z.object({fileName:z.string().trim().min(1).max(180),contentType:z.string().trim().toLowerCase(),sizeBytes:z.number().int().positive().max(MAX_FILE)})

export default async function handler(req:NextApiRequest,res:NextApiResponse){
 const token=String(req.query.token||'')
 if(!/^[A-Za-z0-9_-]{40,100}$/.test(token)) return res.status(404).json({error:'Tautan upload tidak valid.'})
 const [access]=await sqlClient`
  SELECT a.id,a.project_id,a.expires_at,p.project_code,p.service_name,p.status AS project_status
  FROM creative_asset_access a JOIN creative_project p ON p.id=a.project_id
  WHERE a.token_hash=${tokenHash(token)} AND a.revoked_at IS NULL AND a.expires_at>now() LIMIT 1
 `
 if(!access) return res.status(404).json({error:'Tautan upload tidak ditemukan, sudah kedaluwarsa, atau telah dicabut.'})
 if(req.method==='GET'){
  if(['delivered','cancelled'].includes(access.project_status)) return res.status(410).json({error:'Proyek sudah ditutup; upload baru tidak diterima.'})
  const [usage]=await sqlClient`SELECT COALESCE(SUM(size_bytes),0)::bigint AS used_bytes,COUNT(*) FILTER (WHERE status='ready')::int AS files_count FROM creative_asset WHERE project_id=${access.project_id} AND status IN ('pending','ready')`
  return res.status(200).json({projectCode:access.project_code,serviceName:access.service_name,expiresAt:new Date(access.expires_at).toISOString(),maxFileBytes:MAX_FILE,maxProjectBytes:PROJECT_QUOTA,usedBytes:Number(usage.used_bytes),filesCount:usage.files_count})
 }
 if(req.method==='POST'){
  if(['delivered','cancelled'].includes(access.project_status)) return res.status(410).json({error:'Proyek sudah ditutup; upload baru tidak diterima.'})
  const parsed=Body.safeParse(req.body)
  if(!parsed.success) return res.status(400).json({error:parsed.error.issues[0]?.message||'Data file tidak valid.'})
  if(!ALLOWED.has(parsed.data.contentType)) return res.status(415).json({error:'Format belum didukung. Gunakan MP4, MOV, WEBM, JPG, PNG, WEBP, MP3, WAV, PDF, atau TXT.'})
  const fileName=parsed.data.fileName.replace(/[\\/\\\x00-\\x1f\\x7f]/g,'_').replace(/^\.+/,'').slice(0,180)
  if(!fileName) return res.status(400).json({error:'Nama file tidak valid.'})
  const assetId=randomUUID()
  const objectKey='client-uploads/'+access.project_id+'/'+assetId+'/'+fileName.replace(/[^A-Za-z0-9._-]/g,'_')
  try{
   await sqlClient.begin(async tx=>{
    const [validAccess]=await tx`SELECT id FROM creative_asset_access WHERE id=${access.id} AND revoked_at IS NULL AND expires_at>now() FOR UPDATE`
    if(!validAccess) throw new Error('Tautan upload sudah dicabut atau kedaluwarsa.')
    const [usage]=await tx`SELECT COALESCE(SUM(size_bytes),0)::bigint AS used_bytes FROM creative_asset WHERE project_id=${access.project_id} AND status IN ('pending','ready')`
    if(Number(usage.used_bytes)+parsed.data.sizeBytes>PROJECT_QUOTA) throw new Error('Kuota penyimpanan proyek 5 GB sudah tercapai.')
    await tx`INSERT INTO creative_asset (id,project_id,access_id,object_key,file_name,content_type,size_bytes,status) VALUES (${assetId},${access.project_id},${access.id},${objectKey},${fileName},${parsed.data.contentType},${parsed.data.sizeBytes},'pending')`
   })
  }catch(error){return res.status(409).json({error:error instanceof Error?error.message:'Tidak dapat menyiapkan upload.'})}
  const signed=createAssetUploadUrl(objectKey,parsed.data.contentType)
  return res.status(201).json({assetId,uploadUrl:signed.url,headers:signed.headers,expiresIn:signed.expiresIn})
 }
 res.setHeader('Allow','GET, POST')
 return res.status(405).json({error:'Metode tidak diizinkan.'})
}
