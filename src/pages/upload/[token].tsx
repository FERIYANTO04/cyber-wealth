import { useEffect,useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { FileUp,ShieldCheck,Clock3,CheckCircle2,AlertCircle } from 'lucide-react'

type Info={projectCode:string;serviceName:string;expiresAt:string;maxFileBytes:number;maxProjectBytes:number;usedBytes:number;filesCount:number}
const fmt=(n:number)=>n>=1024*1024*1024?(n/1024/1024/1024).toFixed(2)+' GB':(n/1024/1024).toFixed(1)+' MB'
const allowed='image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,video/x-matroska,audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/aac,audio/ogg,application/pdf,text/plain'

export default function ClientUploadPage(){
 const router=useRouter();const token=typeof router.query.token==='string'?router.query.token:''
 const [info,setInfo]=useState<Info|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [progress,setProgress]=useState('');const [done,setDone]=useState<string[]>([])
 async function load(){
  if(!token)return
  try{const r=await fetch('/api/client-upload/'+encodeURIComponent(token));const d=await r.json();if(!r.ok)throw new Error(d.error||'Tautan tidak dapat digunakan.');setInfo(d)}catch(e){setError(e instanceof Error?e.message:'Gagal memuat tautan.')}
 }
 useEffect(()=>{load()},[token])
 function putFile(url:string,file:File,headers:Record<string,string>){
  return new Promise<void>((resolve,reject)=>{
   const xhr=new XMLHttpRequest();xhr.open('PUT',url)
   Object.entries(headers).forEach(([k,v])=>xhr.setRequestHeader(k,v))
   xhr.upload.onprogress=e=>{if(e.lengthComputable)setProgress(file.name+' · '+Math.round(e.loaded/e.total*100)+'%')}
   xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve():reject(new Error('Upload gagal ('+xhr.status+').'))
   xhr.onerror=()=>reject(new Error('Koneksi upload terputus.'))
   xhr.send(file)
  })
 }
 async function upload(files:FileList|null){
  if(!files||!files.length||!token)return
  setBusy(true);setError('');setDone([])
  try{
   for(const file of Array.from(files)){
    if(!allowed.split(',').includes(file.type))throw new Error(file.name+': format file tidak didukung.')
    if(file.size>1024*1024*1024)throw new Error(file.name+': ukuran maksimal 1 GB per file.')
    const intent=await fetch('/api/client-upload/'+encodeURIComponent(token),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fileName:file.name,contentType:file.type,sizeBytes:file.size})})
    const data=await intent.json();if(!intent.ok)throw new Error(data.error||'Tidak dapat menyiapkan file.')
    await putFile(data.uploadUrl,file,data.headers||{})
    const complete=await fetch('/api/client-upload/'+encodeURIComponent(token)+'/'+data.assetId,{method:'POST'})
    const result=await complete.json();if(!complete.ok)throw new Error(result.error||'Verifikasi file gagal.')
    setDone(old=>[...old,file.name])
   }
   setProgress('Semua file berhasil diterima dan diverifikasi.');await load()
  }catch(e){setError(e instanceof Error?e.message:'Upload gagal.')}
  finally{setBusy(false)}
 }
 return <div className="min-h-screen bg-[#080a0d] px-4 py-10 text-white">
  <Head><title>Upload bahan proyek · Cyber Wealth</title><meta name="robots" content="noindex,nofollow"/></Head>
  <main className="mx-auto max-w-2xl">
   <div className="mb-8 flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl border border-amber-300/30 bg-amber-300/10 font-semibold text-amber-200">CW</div><div><p className="text-sm font-semibold tracking-wide">CYBER WEALTH</p><p className="text-xs text-white/45">Secure client asset intake</p></div></div>
   {!info&&!error?<div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-sm text-white/65">Memeriksa tautan upload...</div>:null}
   {error&&!info?<div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-5 text-sm text-red-200">{error}</div>:null}
   {info&&<div className="space-y-5">
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
     <p className="text-xs uppercase tracking-[0.18em] text-amber-200/75">Client upload portal</p><h1 className="mt-2 text-2xl font-semibold">Kirim bahan proyek</h1><p className="mt-2 text-sm leading-6 text-white/60">Unggah video mentah, gambar, audio, dokumen brief, dan aset pendukung. File akan disimpan secara privat untuk tim produksi.</p>
     <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-black/20 p-3"><p className="text-[11px] text-white/45">Kode proyek</p><p className="mt-1 font-mono text-sm">{info.projectCode}</p></div><div className="rounded-xl bg-black/20 p-3"><p className="text-[11px] text-white/45">Layanan</p><p className="mt-1 text-sm">{info.serviceName}</p></div></div>
    </section>
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
     <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">Penyimpanan proyek</p><p className="mt-1 text-xs text-white/50">{fmt(info.usedBytes)} dari {fmt(info.maxProjectBytes)} terpakai · {info.filesCount} file</p></div><ShieldCheck className="size-5 text-emerald-300"/></div>
     <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-300" style={{width:Math.min(100,info.usedBytes/info.maxProjectBytes*100)+'%'}}/></div>
     <div className="mt-5 rounded-xl border border-dashed border-amber-200/35 bg-amber-200/[0.04] p-5 text-center"><FileUp className="mx-auto size-7 text-amber-200"/><p className="mt-3 text-sm font-medium">Pilih file untuk dikirim</p><p className="mt-1 text-xs text-white/50">Video, gambar, audio, PDF, TXT · maksimal 1 GB per file</p><label className="mt-4 inline-flex cursor-pointer items-center rounded-lg bg-amber-200 px-4 py-2.5 text-xs font-semibold text-black">Pilih file<input type="file" multiple accept={allowed} disabled={busy} className="sr-only" onChange={e=>{upload(e.target.files);e.currentTarget.value=''}}/></label></div>
     {busy&&<p className="mt-4 text-xs text-amber-100">{progress||'Menyiapkan upload...'}</p>}
     {done.length>0&&<div className="mt-4 space-y-2">{done.map(name=><p key={name} className="flex items-center gap-2 text-xs text-emerald-200"><CheckCircle2 className="size-4"/>{name} · terverifikasi</p>)}</div>}
     {error&&<p role="alert" className="mt-4 flex items-center gap-2 text-xs text-red-200"><AlertCircle className="size-4"/>{error}</p>}
     <p className="mt-5 flex items-center gap-2 text-[11px] leading-5 text-white/40"><Clock3 className="size-3.5 shrink-0"/>Tautan berlaku sampai {new Date(info.expiresAt).toLocaleString('id-ID')}.</p>
    </section>
    <p className="text-center text-[11px] text-white/35">Gunakan hanya tautan resmi ini. Jangan unggah kata sandi, data kartu pembayaran, atau dokumen identitas yang tidak diperlukan.</p>
   </div>}
  </main>
 </div>
}
