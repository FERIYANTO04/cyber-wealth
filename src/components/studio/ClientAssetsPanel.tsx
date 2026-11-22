import { useEffect,useState } from 'react'
import { Copy,FileText,Link2,RefreshCw,Trash2 } from 'lucide-react'

type Asset={id:string;fileName:string;contentType:string;sizeBytes:number;status:string;createdAt:string;downloadUrl:string|null}
const size=(n:number)=>n>=1024*1024*1024?(n/1024/1024/1024).toFixed(2)+' GB':(n/1024/1024).toFixed(1)+' MB'
export function ClientAssetsPanel({projectId,closed=false}:{projectId:string;closed?:boolean}){
 const [assets,setAssets]=useState<Asset[]>([]);const [link,setLink]=useState('');const [expires,setExpires]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('')
 async function load(){try{const r=await fetch('/api/studio/projects/'+projectId+'/assets');const d=await r.json();if(r.ok)setAssets(d.assets||[])}catch{}}
 useEffect(()=>{load()},[projectId])
 async function createLink(){
  setBusy(true);setError('');setMessage('')
  try{const r=await fetch('/api/studio/projects/'+projectId+'/upload-link',{method:'POST'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Gagal membuat tautan.');setLink(d.url);setExpires(d.expiresAt);setMessage('Tautan baru dibuat; tautan sebelumnya otomatis dicabut.');await load()}
  catch(e){setError(e instanceof Error?e.message:'Gagal membuat tautan.')}finally{setBusy(false)}
 }
 async function remove(id:string){
  if(!window.confirm('Hapus file bahan ini secara permanen dari penyimpanan?'))return
  setBusy(true);setError('')
  try{const r=await fetch('/api/studio/assets/'+id,{method:'DELETE'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Gagal menghapus file.');await load()}
  catch(e){setError(e instanceof Error?e.message:'Gagal menghapus file.')}finally{setBusy(false)}
 }
 return <section className="rounded-xl border border-line bg-surface-muted/50 p-4">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold">Bahan dari klien</p><p className="mt-1 text-[11px] text-ink-quiet">Penyimpanan privat · link upload berlaku 7 hari · kuota 5 GB/proyek</p></div><button disabled={busy||closed} onClick={createLink} className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs disabled:opacity-40"><Link2 className="size-3.5"/>{busy?'Memproses...':'Buat link upload'}</button></div>
  {link&&<div className="mt-3 rounded-lg border border-line bg-surface p-3"><p className="text-[11px] text-ink-quiet">Link khusus klien · berakhir {new Date(expires).toLocaleString('id-ID')}</p><div className="mt-2 flex flex-wrap gap-2"><input readOnly value={link} className="min-w-0 flex-1 rounded-md border border-line bg-surface-muted px-2 py-2 text-xs"/><button onClick={()=>navigator.clipboard?.writeText(link)} className="rounded-md bg-ink px-3 py-2 text-xs text-surface"><Copy className="mr-1 inline size-3"/>Salin</button></div></div>}
  {message&&<p className="mt-2 text-[11px] text-emerald-700">{message}</p>}{error&&<p role="alert" className="mt-2 text-[11px] text-red-600">{error}</p>}
  <div className="mt-3 space-y-2">{assets.length===0?<p className="text-xs text-ink-quiet">Belum ada bahan yang diunggah.</p>:assets.map(a=><div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface p-3"><div className="flex min-w-0 items-center gap-2"><FileText className="size-4 shrink-0 text-signal"/><div className="min-w-0"><p className="truncate text-xs font-medium">{a.fileName}</p><p className="text-[10px] text-ink-quiet">{size(a.sizeBytes)} · {a.contentType} · {a.status}</p></div></div><div className="flex items-center gap-2">{a.downloadUrl&&<a href={a.downloadUrl} target="_blank" rel="noreferrer" className="rounded-md border border-line px-2.5 py-1.5 text-[11px]">Unduh</a>}<button disabled={busy} onClick={()=>remove(a.id)} aria-label="Hapus file" className="rounded-md border border-line p-2 text-red-600 disabled:opacity-40"><Trash2 className="size-3.5"/></button></div></div>)}</div>
  <button onClick={load} className="mt-3 inline-flex items-center gap-1 text-[11px] text-ink-quiet"><RefreshCw className="size-3"/>Muat ulang daftar</button>
 </section>
}
