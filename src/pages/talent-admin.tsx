import type { GetServerSideProps } from 'next'
import { useState } from 'react'
import { ConsoleFrame } from '@/components/ConsoleFrame'
import { requireOwnerPage } from '@/lib/auth'
import { db } from '@/lib/db'
import { talentApplications } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'
import { PageStack } from '@/components/ui'
import type { PageWithFrame } from '@/lib/frame'

type Candidate={id:string;name:string;email:string;role:string;portfolio:string|null;experience:string;message:string;status:string;createdAt:string}
export const getServerSideProps:GetServerSideProps=async(ctx)=>{
 const guard=await requireOwnerPage(ctx)
 if('redirectTo'in guard)return{redirect:{destination:guard.redirectTo,permanent:false}}
 const rows=await db.select().from(talentApplications).orderBy(desc(talentApplications.createdAt)).limit(100)
 return{props:{candidates:rows.map(r=>({id:r.id,name:r.name,email:r.email,role:r.role,portfolio:r.portfolio,experience:r.experience,message:r.message,status:r.status,createdAt:r.createdAt.toISOString()}))}}
}
function TalentAdmin({candidates}:{candidates:Candidate[]}){
 const [rows,setRows]=useState(candidates);const [busy,setBusy]=useState<string|null>(null);const [error,setError]=useState('')
 async function change(id:string,status:string){setBusy(id);setError('');try{const r=await fetch('/api/careers/apply',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status})});const d=await r.json().catch(()=>({}));if(!r.ok){setError(d.error||'Status gagal disimpan.');return}setRows(old=>old.map(x=>x.id===id?{...x,status}:x))}catch{setError('Koneksi terputus.')}finally{setBusy(null)}}
 const label=(s:string)=>({new:'Baru',reviewing:'Ditinjau',interview:'Wawancara',accepted:'Disetujui',rejected:'Ditolak'} as Record<string,string>)[s]||s
 return <PageStack>
  <div className="flex flex-wrap gap-3 text-xs text-ink-quiet"><span>{rows.length} profil masuk</span><span>{rows.filter(x=>x.status==='reviewing').length} sedang ditinjau</span><span>{rows.filter(x=>x.status==='interview').length} wawancara</span></div>
  {error&&<p role="alert" className="text-xs text-danger">{error}</p>}
  {rows.length===0?<div className="panel-frame p-page"><p className="text-sm font-medium">Belum ada kandidat.</p><p className="mt-2 text-xs text-ink-quiet">Profil dari halaman publik /karier akan muncul di sini.</p></div>:rows.map(c=><article key={c.id} className="panel-frame p-page">
   <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold">{c.name}</p><p className="mt-1 text-xs text-ink-quiet">{c.email} · {c.role}</p><p className="mt-1 text-[10px] text-ink-quiet">{new Date(c.createdAt).toLocaleString('id-ID')}</p></div><span className="rounded-full border border-line px-3 py-1 text-[10px]">{label(c.status)}</span></div>
   {c.portfolio&&<p className="mt-3 text-xs"><a href={c.portfolio} target="_blank" rel="noreferrer" className="text-signal underline">Buka portofolio</a></p>}
   <p className="mt-4 whitespace-pre-wrap text-xs leading-6 text-ink-quiet">{c.experience}</p><p className="mt-2 whitespace-pre-wrap text-xs leading-6">{c.message}</p>
   <div className="mt-4 flex flex-wrap gap-2">{(['reviewing','interview','accepted','rejected'] as const).map(status=><button key={status} disabled={busy===c.id||c.status===status} onClick={()=>change(c.id,status)} className="rounded-lg border border-line px-3 py-2 text-[10px] hover:border-signal disabled:opacity-40">{label(status)}</button>)}</div>
  </article>)}
 </PageStack>
}
const Page=TalentAdmin as PageWithFrame<{candidates:Candidate[]}>
Page.getLayout=page=><ConsoleFrame eyebrow="People & culture" title="Rekrutmen kreatif" intent="Tinjau profil editor, desainer, motion artist, dan operator kreatif. Status kandidat tidak otomatis menjadi kontrak kerja.">{page}</ConsoleFrame>
export default Page
