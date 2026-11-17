import { useEffect, useRef, useState } from 'react'
import { Loader2, Send, Sparkles } from 'lucide-react'
import {
  Button,
  InlineNote,
  Notice,
  Panel,
  PanelBody,
  PanelHead,
  Textarea,
} from '@/components/ui'
import type { ChatTurn } from '@/lib/ai-chat'
import { RichText } from '@/components/RichText'

const SUGGESTIONS = [
  'Apa langkah termudah menaikkan penjualan bulan ini?',
  'Produk saya sudah terbit, apa yang perlu saya perbaiki dulu?',
  'Susun rencana konten satu minggu untuk produk saya.',
]

/** The owner's chat with the model. Every answer comes from the server; nothing here invents text. */
export function AiChat({ configured, initialTurns }: { configured: boolean; initialTurns: ChatTurn[] }) {
  const [turns, setTurns] = useState<ChatTurn[]>(initialTurns)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = listRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [turns, busy])

  async function send(event: React.FormEvent) {
    event.preventDefault()
    const message = draft.trim()
    if (!message || busy) return
    setBusy(true)
    setError(null)
    const pendingId = `pending-${Date.now()}`
    setTurns((old) => [...old, { id: pendingId, role: 'user', content: message, createdAt: new Date().toISOString() }])
    setDraft('')
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Asisten AI tidak menjawab. Coba lagi.')
        return
      }
      setTurns((old) => [...old, data.answer as ChatTurn])
    } catch {
      setError('Koneksi terputus. Periksa jaringan lalu kirim ulang pertanyaan Anda.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel>
      <PanelHead
        label="Asisten AI"
        aside={
          <InlineNote tone={configured ? 'signal' : 'danger'}>
            {configured ? 'Terhubung ke model' : 'Kunci model belum diisi'}
          </InlineNote>
        }
      />
      <PanelBody className="gap-block">
        {!configured && (
          <Notice tone="hold">
            Asisten belum bisa menjawab karena kredensial AI Gateway belum tersedia di server. Pertanyaan Anda tetap tersimpan.
          </Notice>
        )}

        <div
          ref={listRef}
          className="flex max-h-[22rem] flex-col gap-2 overflow-y-auto"
          role="log"
          aria-live="polite"
          aria-label="Percakapan dengan asisten AI"
        >
          {turns.length === 0 && !busy ? (
            <p className="text-xs leading-relaxed text-ink-quiet">
              Tanyakan apa saja soal usaha Anda — angka yang dipakai asisten diambil dari catatan aplikasi ini, bukan
              dikarang.
            </p>
          ) : (
            turns.map((turn) => <Bubble key={turn.id} turn={turn} />)
          )}
          {busy && (
            <div className="inset-block flex items-center gap-2 text-xs text-ink-quiet">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              Asisten sedang menyusun jawaban…
            </div>
          )}
        </div>

        {error && (
          <Notice tone="danger">
            <span role="alert">{error}</span>
          </Notice>
        )}

        {turns.length === 0 && configured && (
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((text) => (
              <button
                key={text}
                type="button"
                className="chip text-left"
                onClick={() => setDraft(text)}
                disabled={busy}
              >
                {text}
              </button>
            ))}
          </div>
        )}

        <form className="flex flex-col gap-2" onSubmit={send} noValidate>
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.8125rem] font-medium text-ink">Pertanyaan untuk asisten</span>
            <Textarea
              rows={3}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Contoh: produk mana yang sebaiknya saya dorong dulu?"
              maxLength={2000}
              disabled={busy}
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={busy || draft.trim().length === 0}>
              <Send className="size-3.5" aria-hidden="true" />
              {busy ? 'Mengirim…' : 'Kirim'}
            </Button>
            <InlineNote>
              <Sparkles className="mr-1 inline size-3" aria-hidden="true" />
              Jawaban bisa salah. Periksa angkanya sebelum mengambil keputusan.
            </InlineNote>
          </div>
        </form>
      </PanelBody>
    </Panel>
  )
}

function Bubble({ turn }: { turn: ChatTurn }) {
  const mine = turn.role === 'user'
  return (
    <div className={mine ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className={
          mine
            ? 'max-w-[85%] rounded-md border border-signal/30 bg-signal-soft px-3 py-2'
            : 'max-w-[85%] rounded-md border border-line bg-canvas px-3 py-2'
        }
      >
        <div className="flex flex-col text-[0.8125rem] leading-relaxed text-ink">
          <RichText text={turn.content} />
        </div>
      </div>
    </div>
  )
}
