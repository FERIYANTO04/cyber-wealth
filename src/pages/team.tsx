import type { GetServerSideProps } from 'next'
import { useState } from 'react'
import { Users, UserPlus, PauseCircle, CheckCircle2 } from 'lucide-react'
import { ConsoleFrame } from '@/components/ConsoleFrame'
import { requireOwnerPage } from '@/lib/auth'
import { sqlClient } from '@/lib/db'
import { PageStack } from '@/components/ui'
import type { PageWithFrame } from '@/lib/frame'

type Member = { id:string; name:string; email:string; role:string; portfolio:string|null; employment_type:string; status:string; notes:string|null; joined_at:string }
type Candidate = { id:string; name:string; email:string; role:string; portfolio:string|null; status:string; created_at:string }

export const getServerSideProps:GetServerSideProps=async(ctx)=>{
  const guard=await requireOwnerPage(ctx)
  if('redirectTo' in guard) return {redirect:{destination:guard.redirectTo,permanent:false}}
  try {
    const [members,eligible]=await Promise.all([
      sqlClient`SELECT * FROM "team_member" ORDER BY CASE WHEN status='active' THEN 0 WHEN status='paused' THEN 1 ELSE 2 END, joined_at DESC LIMIT 200`,
      sqlClient`SELECT a.id,a.name,a.email,a.role,a.portfolio,a.status,a.created_at FROM "talent_application" a WHERE a.status='accepted' AND NOT EXISTS (SELECT 1 FROM "team_member" m WHERE m.talent_application_id=a.id) ORDER BY a.created_at ASC LIMIT 100`
    ])
    return {props:{members:members.map(m=>({...m,joined_at:new Date(m.joined_at).toISOString()})),eligible:eligible.map(c=>({...c,created_at:new Date(c.created_at).toISOString()}))}}
  } catch {
    return {props:{members:[],eligible:[],setupPending:true}}
  }
}

function TeamPage({members,eligible,setupPending=false}:{members:Member[];eligible:Candidate[];setupPending?:boolean}){
  const [rows,setRows]=useState(members)
  const [candidates,setCandidates]=useState(eligible)
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [kind,setKind]=useState<Record<string,string>>({})
  async function onboard(candidate:Candidate){
    setBusy(candidate.id);setError('')
    try{
      const r=await fetch('/api/team',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({applicationId:candidate.id,employmentType:kind[candidate.id]||'freelance'})})
      const d=await r.json().catch(()=>({}))
      if(!r.ok){setError(d.error||'Onboarding gagal.');return}
      setRows(old=>[{id:d.id,name:candidate.name,email:candidate.email,role:candidate.role,portfolio:candidate.portfolio,employment_type:kind[candidate.id]||'freelance',status:'active',notes:null,joined_at:new Date().toISOString()},...old])
      setCandidates(old=>old.filter(x=>x.id!==candidate.id))
    }catch{setError('Koneksi terputus.')}finally{setBusy('')}
  }
  async function update(id:string,patch:Record<string,string|null>){
    setBusy(id);setError('')
    try{
      const r=await fetch('/api/team',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,...patch})})
      const d=await r.json().catch(()=>({}))
      if(!r.ok){setError(d.error||'Perubahan gagal.');return}
      setRows(old=>old.map(m=>m.id===id?{...m,...patch}:m))
    }catch{setError('Koneksi terputus.')}finally{setBusy('')}
  }
  const active=rows.filter(m=>m.status==='active').length
  return <PageStack>
    {setupPending&&<div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">Roster belum tersedia sampai migrasi database selesai diterapkan.</div>}
    <div className="grid gap-3 sm:grid-cols-3">
      {[{label:'Anggota tercatat',value:rows.length,icon:Users},{label:'Aktif',value:active,icon:CheckCircle2},{label:'Kandidat siap onboarding',value:candidates.length,icon:UserPlus}].map(x=><div key={x.label} className="panel-frame p-5"><x.icon className="size-4 text-signal"/><p className="mt-3 text-2xl font-semibold">{x.value}</p><p className="mt-1 text-xs text-ink-quiet">{x.label}</p></div>)}
    </div>
    {error&&<p role="alert" className="text-xs text-danger">{error}</p>}
    <section className="panel-frame p-5">
      <h2 className="text-sm font-semibold">Kandidat disetujui</h2>
      <p className="mt-1 text-xs text-ink-quiet">Hanya kandidat yang sudah disetujui owner yang dapat dimasukkan ke roster. Tidak ada perekrutan otomatis.</p>
      {candidates.length===0?<p className="mt-4 text-xs text-ink-quiet">Belum ada kandidat siap onboarding.</p>:<div className="mt-4 grid gap-3">{candidates.map(c=><div key={c.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3"><div><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-ink-quiet">{c.email} · {c.role}</p>{c.portfolio&&<a className="text-xs text-signal underline" href={c.portfolio} target="_blank" rel="noreferrer">Portofolio</a>}</div><div className="flex flex-wrap items-center gap-2"><select aria-label="Jenis kerja" value={kind[c.id]||'freelance'} onChange={e=>setKind(old=>({...old,[c.id]:e.target.value}))} className="rounded-lg border border-line bg-surface px-2 py-2 text-xs"><option value="freelance">Freelance</option><option value="contractor">Kontrak</option><option value="employee">Karyawan</option></select><button disabled={busy===c.id} onClick={()=>onboard(c)} className="rounded-lg bg-signal px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Catat onboarding</button></div></div>)}</div>}
    </section>
    <section className="panel-frame p-5">
      <h2 className="text-sm font-semibold">Roster tim</h2>
      {rows.length===0?<p className="mt-4 text-xs text-ink-quiet">Belum ada anggota yang direkrut dan dicatat.</p>:<div className="mt-4 grid gap-3">{rows.map(m=><article key={m.id} className="border-t border-line pt-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold">{m.name}</p><p className="mt-1 text-xs text-ink-quiet">{m.email} · {m.role}</p><p className="mt-1 text-[10px] text-ink-quiet">Bergabung {new Date(m.joined_at).toLocaleDateString('id-ID')} · {m.employment_type}</p>{m.portfolio&&<a className="text-xs text-signal underline" href={m.portfolio} target="_blank" rel="noreferrer">Portofolio</a>}</div><div className="flex items-center gap-2"><span className="rounded-full border border-line px-2 py-1 text-[10px]">{m.status}</span><button disabled={busy===m.id||m.status==='offboarded'} onClick={()=>update(m.id,{status:m.status==='active'?'paused':'active'})} className="rounded-lg border border-line px-3 py-2 text-xs disabled:opacity-40">{m.status==='active'?<><PauseCircle className="mr-1 inline size-3"/>Jeda</>:<>Aktifkan</>}</button>{m.status!=='offboarded'&&<button disabled={busy===m.id} onClick={()=>update(m.id,{status:'offboarded'})} className="rounded-lg border border-line px-3 py-2 text-xs disabled:opacity-40">Nonaktifkan</button>}</div></div>{m.notes&&<p className="mt-2 text-xs text-ink-quiet">{m.notes}</p>}</article>)}</div>}
    </section>
  </PageStack>
}
const Page=TeamPage as PageWithFrame<{members:Member[];eligible:Candidate[];setupPending?:boolean}>
Page.getLayout=page=><ConsoleFrame eyebrow="People operations" title="Tim & onboarding" intent="Roster anggota yang benar-benar telah dicatat owner; kandidat tidak otomatis dianggap karyawan.">{page}</ConsoleFrame>
export default Page
