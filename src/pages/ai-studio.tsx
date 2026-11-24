import { useEffect, useState, type FormEvent } from 'react'
import type { GetServerSideProps } from 'next'
import Link from 'next/link'
import { ArrowLeft, Bot, LoaderCircle, Send, Sparkles } from 'lucide-react'
import { requireOwnerPage } from '@/lib/auth'
import type { PageWithFrame } from '@/lib/frame'

type Turn = { id: string; role: 'user' | 'assistant'; content: string; createdAt: string }

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const access = await requireOwnerPage(ctx)
  if ('redirectTo' in access) return { redirect: { destination: access.redirectTo, permanent: false } }
  ctx.res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  return { props: {} }
}

function AIStudio() {
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const response = await fetch('/api/ai/chat')
    if (!response.ok) throw new Error('Tidak dapat memuat ruang kerja AI.')
    const data = await response.json()
    setTurns(Array.isArray(data.turns) ? data.turns : [])
    setConfigured(Boolean(data.configured))
  }

  useEffect(() => { void load().catch(err => setError(err.message)) }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const message = draft.trim()
    if (!message || busy) return
    setDraft('')
    setTurns(current => [...current, { id: 'pending-' + Date.now(), role: 'user', content: message, createdAt: new Date().toISOString() }])
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'AI gagal merespons.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="mx-auto max-w-5xl">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <Link href="/owner" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white"><ArrowLeft size={14}/> Executive overview</Link>
      <span className={configured ? 'rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-[10px] text-emerald-300' : 'rounded-full border border-amber-300/20 bg-amber-300/5 px-3 py-1.5 text-[10px] text-amber-200'}>{configured ? 'AI provider configured' : 'AI provider not connected'}</span>
    </div>
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1420]">
      <header className="flex items-center gap-3 border-b border-white/10 px-5 py-5 sm:px-7">
        <div className="flex size-11 items-center justify-center rounded-xl border border-[#55d6b5]/30 bg-[#55d6b5]/10 text-[#55d6b5]"><Bot size={21}/></div>
        <div><h2 className="text-sm font-semibold text-white">Cyber Wealth AI Workbench</h2><p className="mt-1 text-[11px] text-slate-500">Private AI workspace · owner session</p></div>
      </header>
      <div className="min-h-[420px] space-y-4 p-5 sm:p-7">
        {turns.length === 0 && <div className="mx-auto flex max-w-lg flex-col items-center py-16 text-center"><Sparkles size={28} className="text-[#55d6b5]"/><h3 className="mt-5 text-xl font-semibold text-white">AI workspace perusahaan</h3><p className="mt-2 text-sm leading-6 text-slate-400">Gunakan untuk analisis bisnis, perencanaan produk, riset, dan pekerjaan internal.</p></div>}
        {turns.map(turn => <div key={turn.id} className={turn.role === 'user' ? 'ml-auto max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-[#17342f] px-4 py-3 text-sm leading-6 text-[#e5fff7]' : 'mr-auto max-w-[92%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-white/10 bg-[#131d2a] px-4 py-3 text-sm leading-6 text-slate-200'}>{turn.content}</div>)}
        {busy && <div className="flex items-center gap-2 text-xs text-slate-500"><LoaderCircle size={15} className="animate-spin"/> AI sedang memproses…</div>}
        {error && <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-3 text-xs leading-5 text-rose-200">{error}</div>}
        {configured === false && <div className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-xs leading-5 text-amber-100">Gateway AI belum memiliki kredensial valid. Chat tidak akan mengaku berhasil sampai provider benar-benar terhubung.</div>}
      </div>
      <form onSubmit={submit} className="border-t border-white/10 p-4 sm:p-5">
        <div className="flex items-end gap-3 rounded-xl border border-white/10 bg-[#080d15] p-2 focus-within:border-[#55d6b5]/40">
          <textarea value={draft} onChange={e=>setDraft(e.target.value)} rows={2} maxLength={2000} placeholder="Tulis instruksi untuk Cyber Wealth AI…" className="max-h-40 min-h-12 flex-1 resize-y bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600"/>
          <button type="submit" disabled={busy || !draft.trim() || configured === false} aria-label="Kirim pesan" className="mb-1 flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#55d6b5] text-[#07110f] hover:bg-[#7ce7cb] disabled:cursor-not-allowed disabled:opacity-40">{busy ? <LoaderCircle size={16} className="animate-spin"/> : <Send size={16}/>}</button>
        </div>
        <p className="mt-2 px-1 text-[10px] text-slate-600">Riwayat tersimpan pada akun owner. Biaya penggunaan mengikuti provider AI yang dikonfigurasi.</p>
      </form>
    </section>
  </div>
}

const Page = AIStudio as PageWithFrame
Page.getLayout = page => page
export default Page
