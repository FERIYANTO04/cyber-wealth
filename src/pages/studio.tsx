import type { GetServerSideProps } from 'next'
import { useState } from 'react'
import { CheckCircle2, Clapperboard, Clock3, Film, ShieldCheck, UserRoundCog } from 'lucide-react'
import { ConsoleFrame } from '@/components/ConsoleFrame'
import { requireOwnerPage } from '@/lib/auth'
import { sqlClient } from '@/lib/db'
import type { PageWithFrame } from '@/lib/frame'

type Checklist={brief_match:boolean;visual_quality:boolean;audio_quality:boolean;spelling_brand:boolean;rights_clearance:boolean}
type Project={id:string;project_code:string;service_request_id:string;client_name:string;client_email:string;service_name:string;brief:string;status:string;priority:string;assigned_type:string;assigned_to:string|null;assigned_role:string|null;due_at:string|null;agreed_price_idr:number;revision_limit:number;revisions_used:number;quality_checklist:Checklist;deliverable_url:string|null;client_approved_at:string|null;internal_notes:string|null;created_at:string;updated_at:string}
type Eligible={id:string;code:string;service_name:string;name:string;email:string;brief:string;status:string;created_at:string}
type Props={projects:Project[];eligible:Eligible[]}

function iso(value:any):string|null{return value?new Date(value).toISOString():null}
export const getServerSideProps:GetServerSideProps=async(ctx)=>{
 const guard=await requireOwnerPage(ctx)
 if('redirectTo'in guard)return{redirect:{destination:guard.redirectTo,permanent:false}}
 const [projects,eligible]=await Promise.all([
  sqlClient`SELECT * FROM "creative_project" ORDER BY CASE WHEN status IN ('delivered','cancelled') THEN 1 ELSE 0 END,due_at ASC NULLS LAST,updated_at DESC LIMIT 100`,
  sqlClient`SELECT r.id,r.code,r.service_name,r.name,r.email,r.brief,r.status,r.created_at FROM "service_request" r WHERE r.status='won' AND NOT EXISTS(SELECT 1 FROM "creative_project" p WHERE p.service_request_id=r.id) ORDER BY r.created_at ASC LIMIT 50`
 ])
 return{props:{
  projects:projects.map(r=>({id:r.id,project_code:r.project_code,service_request_id:r.service_request_id,client_name:r.client_name,client_email:r.client_email,service_name:r.service_name,brief:r.brief,status:r.status,priority:r.priority,assigned_type:r.assigned_type,assigned_to:r.assigned_to,assigned_role:r.assigned_role,due_at:iso(r.due_at),agreed_price_idr:Number(r.agreed_price_idr),revision_limit:r.revision_limit,revisions_used:r.revisions_used,quality_checklist:r.quality_checklist,deliverable_url:r.deliverable_url,client_approved_at:iso(r.client_approved_at),internal_notes:r.internal_notes,created_at:iso(r.created_at),updated_at:iso(r.updated_at)})),
  eligible:eligible.map(r=>({...r,created_at:iso(r.created_at)}))
 }}
}

const STAGES=[['queued','Antrean'],['assigned','Ditugaskan'],['in_production','Produksi'],['internal_review','QC internal'],['client_review','Review klien'],['revision','Revisi'],['approved','Disetujui'],['delivered','Diserahkan'],['cancelled','Dibatalkan']] as const
const CHECKS:[keyof Checklist,string][]=[['brief_match','Sesuai brief klien'],['visual_quality','Kualitas visual dan resolusi'],['audio_quality','Audio, level, dan sinkronisasi'],['spelling_brand','Ejaan, logo, dan identitas merek'],['rights_clearance','Hak penggunaan aset dan musik']]
const label=(status:string)=>STAGES.find(s=>s[0]===status)?.[1]??status
const dateLabel=(v:string|null)=>v?new Date(v).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}):'Belum ditetapkan'

function ProjectCard({project,onUpdated}:{project:Project;onUpdated:(p:Project)=>void}){
 const [assignee,setAssignee]=useState(project.assigned_to??'')
 const [role,setRole]=useState(project.assigned_role??'')
 const [kind,setKind]=useState(project.assigned_type)
 const [priority,setPriority]=useState(project.priority)
 const [due,setDue]=useState(project.due_at?project.due_at.slice(0,10):'')
 const [price,setPrice]=useState(String(project.agreed_price_idr||''))
 const [limit,setLimit]=useState(String(project.revision_limit))
 const [url,setUrl]=useState(project.deliverable_url??'')
 const [notes,setNotes]=useState(project.internal_notes??'')
 const [checks,setChecks]=useState<Checklist>(project.quality_checklist)
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const [error,setError]=useState('')
 const [expanded,setExpanded]=useState(project.status!=='delivered'&&project.status!=='cancelled')
 async function save(patch:Record<string,unknown>){
  setBusy(true);setError('');setMessage('')
  try{const r=await fetch('/api/studio/projects/'+project.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(patch)});const d=await r.json().catch(()=>({}));if(!r.ok){setError(d.error||'Pembaruan gagal.');return}onUpdated({...project,...d.project,agreed_price_idr:Number(d.project.agreed_price_idr),due_at:iso(d.project.due_at),client_approved_at:iso(d.project.client_approved_at),created_at:iso(d.project.created_at),updated_at:iso(d.project.updated_at),quality_checklist:d.project.quality_checklist});setMessage('Perubahan tersimpan dan masuk ke riwayat proyek.')}catch{setError('Koneksi terputus.')}finally{setBusy(false)}
 }
 const active= !['delivered','cancelled'].includes(project.status)
 const allChecks=Object.values(checks).every(Boolean)
 return <article className="overflow-hidden rounded-2xl border border-line bg-surface">
  <div className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
   <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[0.7rem] text-ink-quiet">{project.project_code}</span><span className="rounded-full border border-line px-2.5 py-1 text-[0.65rem]">{label(project.status)}</span><span className="rounded-full bg-surface-muted px-2.5 py-1 text-[0.65rem]">{project.priority.toUpperCase()}</span></div><h3 className="mt-2 text-base font-semibold">{project.service_name}</h3><p className="mt-1 text-xs text-ink-quiet">{project.client_name} · {project.client_email}</p></div>
   <button onClick={()=>setExpanded(v=>!v)} className="rounded-lg border border-line px-3 py-2 text-xs">{expanded?'Tutup detail':'Kelola proyek'}</button>
  </div>
  <div className="grid grid-cols-2 gap-px border-y border-line bg-line sm:grid-cols-4">
   <div className="bg-surface px-4 py-3"><p className="text-[0.62rem] uppercase tracking-wider text-ink-quiet">Penanggung jawab</p><p className="mt-1 text-xs font-medium">{project.assigned_to||'Belum ditetapkan'}</p></div>
   <div className="bg-surface px-4 py-3"><p className="text-[0.62rem] uppercase tracking-wider text-ink-quiet">Tenggat</p><p className="mt-1 text-xs font-medium">{dateLabel(project.due_at)}</p></div>
   <div className="bg-surface px-4 py-3"><p className="text-[0.62rem] uppercase tracking-wider text-ink-quiet">Revisi</p><p className="mt-1 text-xs font-medium">{project.revisions_used}/{project.revision_limit}</p></div>
   <div className="bg-surface px-4 py-3"><p className="text-[0.62rem] uppercase tracking-wider text-ink-quiet">Pemeriksaan QC</p><p className="mt-1 text-xs font-medium">{Object.values(project.quality_checklist).filter(Boolean).length}/5 lolos</p></div>
  </div>
  {expanded&&<div className="space-y-5 p-4 sm:p-5">
   <div><p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-wider text-ink-quiet">Brief pelanggan</p><p className="whitespace-pre-wrap rounded-xl bg-surface-muted p-3 text-xs leading-6">{project.brief}</p></div>
   <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <label className="text-xs text-ink-quiet">Model penugasan<select value={kind} onChange={e=>setKind(e.target.value)} className="mt-1.5 min-h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"><option value="unassigned">Belum ditugaskan</option><option value="human">Tenaga manusia</option><option value="ai">Bantuan AI</option><option value="hybrid">AI + manusia</option></select></label>
    <label className="text-xs text-ink-quiet">Nama penanggung jawab<input value={assignee} onChange={e=>setAssignee(e.target.value)} placeholder="Nama pekerja / operator AI" className="mt-1.5 min-h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"/></label>
    <label className="text-xs text-ink-quiet">Keahlian / peran<input value={role} onChange={e=>setRole(e.target.value)} placeholder="Video editor, motion designer..." className="mt-1.5 min-h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"/></label>
    <label className="text-xs text-ink-quiet">Prioritas<select value={priority} onChange={e=>setPriority(e.target.value)} className="mt-1.5 min-h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"><option value="low">Rendah</option><option value="normal">Normal</option><option value="high">Tinggi</option><option value="urgent">Mendesak</option></select></label>
    <label className="text-xs text-ink-quiet">Tenggat<input type="date" value={due} onChange={e=>setDue(e.target.value)} className="mt-1.5 min-h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"/></label>
    <label className="text-xs text-ink-quiet">Nilai kesepakatan (Rp)<input inputMode="numeric" value={price} onChange={e=>setPrice(e.target.value.replace(/[^0-9]/g,''))} className="mt-1.5 min-h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"/></label>
    <label className="text-xs text-ink-quiet">Batas revisi<input type="number" min="0" max="20" value={limit} onChange={e=>setLimit(e.target.value)} className="mt-1.5 min-h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"/></label>
   </div>
   <div><p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-wider text-ink-quiet">Standar quality assurance</p><div className="grid gap-2 sm:grid-cols-2">{CHECKS.map(([key,text])=><label key={key} className="flex items-center gap-2 rounded-lg border border-line p-3 text-xs"><input type="checkbox" checked={checks[key]} onChange={e=>setChecks(old=>({...old,[key]:e.target.checked}))} className="size-4 accent-current"/>{text}</label>)}</div><p className="mt-2 text-[0.68rem] text-ink-quiet">Semua lima pemeriksaan wajib lulus sebelum hasil boleh masuk ke review klien.</p></div>
   <label className="block text-xs text-ink-quiet">Tautan hasil final (HTTPS)<input type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://..." className="mt-1.5 min-h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"/></label>
   <label className="block text-xs text-ink-quiet">Catatan internal<textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink" placeholder="Arahan produksi, risiko, dan catatan tim..."/></label>
   <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={()=>save({assignedType:kind,assignedTo:assignee||null,assignedRole:role||null,priority,dueAt:due?new Date(due+'T23:59:00.000Z').toISOString():null,agreedPriceIdr:Number(price)||0,revisionLimit:Number(limit),deliverableUrl:url||null,internalNotes:notes||null,qualityChecklist:checks})} className="rounded-lg bg-ink px-4 py-2.5 text-xs font-semibold text-surface disabled:opacity-50">{busy?'Menyimpan...':'Simpan pengaturan'}</button>
    {project.status==='queued'&&<button disabled={busy} onClick={()=>save({status:'assigned',assignedType:kind,assignedTo:assignee||null,assignedRole:role||null})} className="rounded-lg border border-line px-4 py-2.5 text-xs">Tetapkan tim</button>}
    {['assigned','queued'].includes(project.status)&&<button disabled={busy} onClick={()=>save({status:'in_production',assignedType:kind,assignedTo:assignee||null,assignedRole:role||null})} className="rounded-lg border border-line px-4 py-2.5 text-xs">Mulai produksi</button>}
    {project.status==='in_production'&&<button disabled={busy} onClick={()=>save({status:'internal_review'})} className="rounded-lg border border-line px-4 py-2.5 text-xs">Masuk QC internal</button>}
    {project.status==='internal_review'&&<button disabled={busy||!allChecks||!url.startsWith('https://')} onClick={()=>save({status:'client_review',qualityChecklist:checks,deliverableUrl:url})} className="rounded-lg border border-line px-4 py-2.5 text-xs disabled:opacity-40">Lulus QC · kirim ke klien</button>}
    {project.status==='client_review'&&<button disabled={busy} onClick={()=>{const reset={brief_match:false,visual_quality:false,audio_quality:false,spelling_brand:false,rights_clearance:false};setChecks(reset);setUrl('');save({status:'revision',qualityChecklist:reset,deliverableUrl:null})}} className="rounded-lg border border-line px-4 py-2.5 text-xs">Minta revisi</button>}
    {project.status==='revision'&&<button disabled={busy} onClick={()=>save({status:'in_production'})} className="rounded-lg border border-line px-4 py-2.5 text-xs">Mulai pengerjaan revisi</button>}
    {project.status==='client_review'&&<button disabled={busy} onClick={()=>save({clientApproved:true,status:'approved'})} className="rounded-lg border border-line px-4 py-2.5 text-xs">Catat persetujuan klien</button>}
    {project.status==='approved'&&<button disabled={busy} onClick={()=>save({status:'delivered'})} className="rounded-lg border border-line px-4 py-2.5 text-xs">Tandai diserahkan</button>}
   </div>
   {error&&<p role="alert" className="text-xs text-red-600">{error}</p>}{message&&<p role="status" className="text-xs text-emerald-700">{message}</p>}
   {project.deliverable_url&&<a href={project.deliverable_url} target="_blank" rel="noreferrer" className="inline-flex text-xs underline">Buka file hasil produksi</a>}
  </div>}
 </article>
}

function StudioPage({projects:initial,eligible:initialEligible}:Props){
 const [projects,setProjects]=useState(initial);const [eligible,setEligible]=useState(initialEligible);const [busy,setBusy]=useState<string|null>(null);const [error,setError]=useState('')
 async function createProject(id:string){setBusy(id);setError('');try{const r=await fetch('/api/studio/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:id})});const d=await r.json().catch(()=>({}));if(!r.ok){setError(d.error||'Proyek tidak dapat dibuat.');return}const reload=await fetch('/api/studio/projects');const data=await reload.json();setProjects(data.projects.map((p:any)=>({...p,agreed_price_idr:Number(p.agreed_price_idr),due_at:iso(p.due_at),client_approved_at:iso(p.client_approved_at),created_at:iso(p.created_at),updated_at:iso(p.updated_at)})));setEligible(data.eligible); }catch{setError('Koneksi terputus.')}finally{setBusy(null)}}
 function updateProject(next:Project){setProjects(old=>old.map(p=>p.id===next.id?next:p))}
 const active=projects.filter(p=>!['delivered','cancelled'].includes(p.status)).length
 const inProduction=projects.filter(p=>['assigned','in_production','internal_review'].includes(p.status)).length
 const awaiting=projects.filter(p=>p.status==='client_review'||p.status==='revision').length
 return <div className="space-y-5">
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><div className="rounded-xl border border-line bg-surface p-4"><Clapperboard className="size-4 text-signal"/><p className="mt-3 text-2xl font-semibold">{projects.length}</p><p className="text-xs text-ink-quiet">Total proyek</p></div><div className="rounded-xl border border-line bg-surface p-4"><Film className="size-4 text-signal"/><p className="mt-3 text-2xl font-semibold">{active}</p><p className="text-xs text-ink-quiet">Proyek aktif</p></div><div className="rounded-xl border border-line bg-surface p-4"><UserRoundCog className="size-4 text-signal"/><p className="mt-3 text-2xl font-semibold">{inProduction}</p><p className="text-xs text-ink-quiet">Produksi & QC</p></div><div className="rounded-xl border border-line bg-surface p-4"><Clock3 className="size-4 text-signal"/><p className="mt-3 text-2xl font-semibold">{awaiting}</p><p className="text-xs text-ink-quiet">Menunggu klien / revisi</p></div></div>
  {error&&<p role="alert" className="rounded-lg border border-red-300 p-3 text-xs text-red-700">{error}</p>}
  <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5"><div className="flex items-center gap-2"><CheckCircle2 className="size-4 text-signal"/><h2 className="text-sm font-semibold">Kesepakatan siap masuk produksi</h2></div><p className="mt-1 text-xs text-ink-quiet">Hanya permintaan yang sudah ditandai “won” oleh owner yang dapat dijadikan proyek.</p>
   {eligible.length===0?<p className="mt-4 text-xs text-ink-quiet">Belum ada kesepakatan baru yang menunggu dibuatkan proyek.</p>:<div className="mt-3 divide-y divide-line">{eligible.map(row=><div key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-xs font-medium">{row.service_name} · {row.name}</p><p className="mt-1 font-mono text-[0.65rem] text-ink-quiet">{row.code} · {row.email}</p></div><button disabled={busy===row.id} onClick={()=>createProject(row.id)} className="rounded-lg border border-line px-3 py-2 text-xs disabled:opacity-50">{busy===row.id?'Membuat...':'Buat proyek'}</button></div>)}</div>}
  </section>
  <section><div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-sm font-semibold">Papan produksi</h2><p className="mt-1 text-xs text-ink-quiet">Penugasan, tenggat, standar mutu, revisi, dan serah terima.</p></div><span className="text-xs text-ink-quiet">{projects.length} proyek tercatat</span></div>
   {projects.length===0?<div className="rounded-xl border border-dashed border-line p-8 text-center text-xs text-ink-quiet">Belum ada proyek produksi. Konfirmasi kesepakatan dari halaman Layanan dan pesanan jasa terlebih dahulu.</div>:<div className="space-y-3">{projects.map(p=><ProjectCard key={p.id} project={p} onUpdated={updateProject}/>)}</div>}
  </section>
 </div>
}
const Page=StudioPage as PageWithFrame<Props>
Page.getLayout=(page)=><ConsoleFrame eyebrow="Creative operations" title="Studio produksi" intent="Satu alur kendali untuk setiap proyek kreatif, dari penugasan hingga pemeriksaan mutu dan serah terima.">{page}</ConsoleFrame>
export default Page
