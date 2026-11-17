import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/router'
import { ArrowRight } from 'lucide-react'
import { Button, Field, Input } from '@/components/ui'

/** Buyer details → a pending subscription → direct bank transfer. */
export function SubscribeForm({ code }: { code: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/saas/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name, email, autoRenew: false }),
      })
      const data = await response.json().catch(() => ({}))
      if (data.token && !response.ok) {
        router.push(`/langganan/status/${data.token}`)
        return
      }
      if (!response.ok) {
        setError(data.error ?? 'Langganan tidak dapat dibuat. Coba lagi.')
        return
      }
      if (data.invoiceUrl) {
        window.location.href = data.invoiceUrl
        return
      }
      router.push(`/langganan/status/${data.token}`)
    } catch {
      setError('Koneksi terputus. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-stack" noValidate>
      <Field label="Nama Anda">
        <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
      </Field>
      <Field label="Email akun">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </Field>
      {error && (
        <span role="alert" className="text-xs font-medium text-danger">
          {error}
        </span>
      )}
      <p className="text-xs leading-relaxed text-ink-quiet">Pembayaran melalui transfer langsung ke rekening pemilik. Langganan aktif setelah pemilik memeriksa mutasi dan mengonfirmasi pembayaran. Perpanjangan dilakukan manual, bukan auto-debit.</p>
      <Button type="submit" disabled={busy || !name || !email}>
        {busy ? 'Menyiapkan…' : 'Lanjut ke pembayaran'}
        {!busy && <ArrowRight className="size-4" aria-hidden="true" />}
      </Button>
    </form>
  )
}
