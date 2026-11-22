import { useState, type FormEvent } from 'react'
import { ArrowUpRight, BriefcaseBusiness, Film, Palette, Sparkles } from 'lucide-react'
import { StoreFrame } from '@/components/StoreFrame'
import { PageStack } from '@/components/ui'
import type { PageWithFrame } from '@/lib/frame'

function CareersPage() {
  const [name,setName]=useState('')
  const [email,setEmail]=useState('')
  const [role,setRole]=useState('Video editor')
  const [portfolio,setPortfolio]=useState('')
  const [experience,setExperience]=useState('')
  const [message,setMessage]=useState('')
  const [consent,setConsent]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [code,setCode]=useState('')
  async function submit(e:FormEvent){
    e.preventDefault();setBusy(true);setError('')
    try{
      const r=await fetch('/api/careers/apply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,role,portfolio,experience,message,consent})})
      const d=await r.json().catch(()=>({}))
      if(!r.ok){setError(d.error||'Lamaran belum bisa dikirim.');return}
      setCode(d.code)
    }catch{setError('Koneksi terputus. Coba lagi.')}finally{setBusy(false)}
  }
  return <PageStack>
    <section className="grid gap-8 border border-[#b99a5b]/25 bg-[#101113] p-7 sm:p-10 lg:grid-cols-[.8fr_1.2fr]">
      <div><p className="font-mono text-[10px] uppercase tracking-[.22em] text-[#c5a66a]">Careers & collaboration</p><h2 className="mt-4 text-3xl font-medium leading-tight tracking-[-.04em] text-[#f3f0e9]">Work with a team building what’s next.</h2><p className="mt-4 text-sm leading-7 text-[#aaa69e]">Kami membangun jaringan talenta kreatif untuk proyek video, desain, motion graphics, dan produksi digital. Kolaborasi dapat berbentuk proyek freelance atau posisi yang dibuka secara resmi.</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[{I:Film,t:'Video editor',d:'Editing short-form, long-form, dan konten brand.'},{I:Palette,t:'Graphic designer',d:'Desain grafis, brand identity, dan materi kampanye.'},{I:Sparkles,t:'AI creative operator',d:'Workflow kreatif berbantuan AI dengan pemeriksaan manusia.'},{I:BriefcaseBusiness,t:'Creative producer',d:'Koordinasi brief, timeline, kualitas, dan serahan proyek.'}].map(({I,t,d})=><div key={t} className="border border-white/10 p-5"><I className="size-5 text-[#c5a66a]"/><h3 className="mt-4 text-sm font-semibold text-[#f3f0e9]">{t}</h3><p className="mt-2 text-xs leading-5 text-[#9e998f]">{d}</p></div>)}
      </div>
    </section>
    <section className="grid gap-8 lg:grid-cols-[.7fr_1.3fr]">
      <div><p className="font-mono text-[10px] uppercase tracking-[.22em] text-[#c5a66a]">Submit your profile</p><h3 className="mt-3 text-2xl text-[#f3f0e9]">Bergabung dalam jaringan talenta.</h3><p className="mt-3 text-xs leading-6 text-[#9e998f]">Kirim profil dan contoh pekerjaan. Tim akan meninjau kebutuhan proyek dan kecocokan keahlian. Pengiriman lamaran tidak menjamin perekrutan atau kontrak kerja.</p></div>
      {code?<div className="border border-[#b99a5b]/30 bg-[#101113] p-7"><p className="text-sm font-semibold text-[#d8bd83]">Profil berhasil diterima.</p><p className="mt-2 text-xs text-[#aaa69e]">Kode referensi: {code}. Simpan kode ini untuk komunikasi berikutnya.</p></div>:<form onSubmit={submit} className="grid gap-4 border border-white/10 bg-[#101113] p-6 sm:grid-cols-2">
        <label className="grid gap-2 text-xs text-[#aaa69e]">Nama lengkap<input required value={name} onChange={e=>setName(e.target.value)} className="rounded-lg border border-white/15 bg-[#08090b] px-3 py-3 text-sm text-white outline-none focus:border-[#c5a66a]"/></label>
        <label className="grid gap-2 text-xs text-[#aaa69e]">Email aktif<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="rounded-lg border border-white/15 bg-[#08090b] px-3 py-3 text-sm text-white outline-none focus:border-[#c5a66a]"/></label>
        <label className="grid gap-2 text-xs text-[#aaa69e] sm:col-span-2">Bidang yang diminati<select value={role} onChange={e=>setRole(e.target.value)} className="rounded-lg border border-white/15 bg-[#08090b] px-3 py-3 text-sm text-white"><option>Video editor</option><option>Graphic designer</option><option>Motion designer</option><option>AI creative operator</option><option>Creative producer</option><option>Freelance specialist</option></select></label>
        <label className="grid gap-2 text-xs text-[#aaa69e] sm:col-span-2">Link portofolio (opsional)<input value={portfolio} onChange={e=>setPortfolio(e.target.value)} placeholder="https://..." className="rounded-lg border border-white/15 bg-[#08090b] px-3 py-3 text-sm text-white outline-none focus:border-[#c5a66a]"/></label>
        <label className="grid gap-2 text-xs text-[#aaa69e] sm:col-span-2">Pengalaman dan keahlian<textarea required minLength={20} value={experience} onChange={e=>setExperience(e.target.value)} rows={3} className="rounded-lg border border-white/15 bg-[#08090b] px-3 py-3 text-sm text-white outline-none focus:border-[#c5a66a]"/></label>
        <label className="grid gap-2 text-xs text-[#aaa69e] sm:col-span-2">Pesan tambahan<textarea required minLength={20} value={message} onChange={e=>setMessage(e.target.value)} rows={3} className="rounded-lg border border-white/15 bg-[#08090b] px-3 py-3 text-sm text-white outline-none focus:border-[#c5a66a]"/></label>
        <label className="flex items-start gap-2 text-xs leading-5 text-[#aaa69e] sm:col-span-2"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} required className="mt-0.5"/><span>Saya setuju data profil digunakan untuk proses peninjauan kandidat Cyber Wealth.</span></label>
        {error&&<p role="alert" className="text-xs text-red-400 sm:col-span-2">{error}</p>}
        <button disabled={busy} className="inline-flex items-center justify-center gap-2 bg-[#c5a66a] px-5 py-3 text-xs font-semibold uppercase tracking-[.14em] text-[#101010] disabled:opacity-50 sm:col-span-2">{busy?'Mengirim…':'Kirim profil'} <ArrowUpRight className="size-4"/></button>
      </form>}
    </section>
  </PageStack>
}
const Page=CareersPage as PageWithFrame
Page.getLayout=(page)=><StoreFrame eyebrow="Careers / Creative network" title="Talenta terbaik membangun karya terbaik." intent="Terhubung dengan Cyber Wealth sebagai kreator, spesialis, atau kolaborator proyek." variant="wide">{page}</StoreFrame>
export default Page
