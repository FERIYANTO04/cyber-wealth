import type { NextApiRequest, NextApiResponse } from 'next'
import { sqlClient } from '@/lib/db'
import { tokenHash, verifyAssetObject } from '@/lib/client-assets'

export default async function handler(req:NextApiRequest,res:NextApiResponse){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Metode tidak diizinkan.'})}
 const token=String(req.query.token||'')
 const assetId=String(req.query.assetId||'')
 if(!/^[A-Za-z0-9_-]{40,100}$/.test(token)) return res.status(404).json({error:'Tautan upload tidak valid.'})
 const [asset]=await sqlClient`
  SELECT f.* FROM creative_asset f
  JOIN creative_asset_access a ON a.id=f.access_id
  WHERE f.id=${assetId} AND a.token_hash=${tokenHash(token)} AND a.revoked_at IS NULL AND a.expires_at>now()
  LIMIT 1
 `
 if(!asset) return res.status(404).json({error:'File atau tautan upload tidak ditemukan.'})
 if(asset.status==='ready') return res.status(200).json({ok:true,status:'ready'})
 if(asset.status!=='pending') return res.status(409).json({error:'Status file tidak mengizinkan penyelesaian upload.'})
 try{await verifyAssetObject(asset.object_key,Number(asset.size_bytes),asset.content_type)}
 catch(error){return res.status(409).json({error:error instanceof Error?error.message:'Pemeriksaan file gagal.'})}
 const [updated]=await sqlClient`UPDATE creative_asset SET status='ready',updated_at=now() WHERE id=${asset.id} AND status='pending' RETURNING id,file_name,size_bytes,status`
 if(!updated) return res.status(409).json({error:'Status file berubah; muat ulang halaman.'})
 await sqlClient`INSERT INTO creative_project_event (id,project_id,actor,event_type,detail) VALUES (gen_random_uuid()::text,${asset.project_id},'client','asset_uploaded',${'Klien mengunggah '+asset.file_name+' ('+asset.content_type+').'})`
 return res.status(200).json({ok:true,status:'ready',fileName:updated.file_name})
}
