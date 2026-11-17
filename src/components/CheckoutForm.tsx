import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/router'
import { ArrowRight } from 'lucide-react'
import { Button, Field, InlineNote, Input } from '@/components/ui'

/** Buyer details → a pending order. Payment is made by direct bank transfer. */
export function CheckoutForm({ slug, priceIdr }: { slug: string; priceIdr: number }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      const response = await fetch('/api/store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, name, email }),
      })
      const data = await response.json().catch(() => ({}))
      if (data.token && !response.ok) {
        router.push(`/pesanan/${data.token}`)
        return
      }
      if (!response.ok) {
        setError(data.error ?? 'Pesanan tidak dapat dibuat. Coba lagi.')
        return
      }
      if (priceIdr === 0) {
        router.push(`/pesanan/${data.token}`)
        return
      }
      setNote('Pesanan dibuat. Buka halaman pesanan untuk melihat instruksi transfer manual.')
      router.push(`/pesanan/${data.token}`)
    } catch {
      setError('Koneksi terputus. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-stack" noValidate>
      <Field label="Nama Anda">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama lengkap"
          autoComplete="name"
          required
        />
      </Field>
      <Field label="Email untuk menerima produk" hint="Tautan unduhan dikirim ke alamat ini.">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@email.com"
          autoComplete="email"
          required
        />
      </Field>
      {error && (
        <span role="alert" className="text-xs font-medium text-danger">
          {error}
        </span>
      )}
      {note && <InlineNote>{note}</InlineNote>}
      <Button type="submit" disabled={busy || !name || !email}>
        {busy ? 'Menyiapkan…' : priceIdr === 0 ? 'Ambil produk gratis' : 'Lanjut ke pembayaran'}
        {!busy && <ArrowRight className="size-4" aria-hidden="true" />}
      </Button>
      <p className="text-xs leading-relaxed text-ink-quiet">
        Pembayaran dilakukan melalui transfer manual. Produk dikirim setelah pemilik memverifikasi dana masuk.
      </p>
    </form>
  )
}
