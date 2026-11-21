import { useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'
import { Button, Field, Input, Select, Textarea } from '@/components/ui'

/** Sends a brief to the owner. Nothing is promised and nothing is charged here. */
export function ServiceBriefForm({ slug }: { slug: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [market, setMarket] = useState<'Indonesia' | 'International'>('Indonesia')
  const [brief, setBrief] = useState('')
  const [budget, setBudget] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentCode, setSentCode] = useState<string | null>(null)
  const [receiptSent, setReceiptSent] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/services/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          name,
          email,
          company: company || undefined,
          market,
          brief,
          budgetIdr: budget ? Number(budget.replace(/[^\d]/g, '')) : undefined,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Permintaan tidak terkirim. Coba lagi.')
        return
      }
      setReceiptSent(data.receiptSent === true)
      setSentCode(data.code)
    } catch {
      setError('Koneksi terputus. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  if (sentCode) {
    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-[0.8125rem] font-medium text-signal">Brief Anda sudah diterima.</p>
        <p className="text-xs leading-relaxed text-ink-quiet">
          Nomor permintaan <span className="font-mono">{sentCode}</span>. Simpan nomor ini untuk referensi.
        </p>
        <p className="text-xs leading-relaxed text-ink-quiet">
          {receiptSent
            ? 'Konfirmasi penerimaan juga sudah dikirim ke email Anda. Tim akan meninjau kebutuhan dan mengirimkan rincian harga serta pembayaran sebelum pekerjaan dimulai.'
            : 'Permintaan sudah tersimpan, tetapi email konfirmasi otomatis belum tersedia. Belum ada biaya yang dikenakan; tim perlu menghubungi Anda setelah meninjau brief.'}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-stack" noValidate>
      <div className="grid gap-stack sm:grid-cols-2">
        <Field label="Nama Anda">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </Field>
        <Field label="Perusahaan atau merek" hint="Boleh dikosongkan.">
          <Input value={company} onChange={(e) => setCompany(e.target.value)} />
        </Field>
        <Field label="Pasar">
          <Select value={market} onChange={(e) => setMarket(e.target.value as typeof market)}>
            <option value="Indonesia">Indonesia</option>
            <option value="International">Internasional</option>
          </Select>
        </Field>
      </div>
      <Field label="Apa yang Anda butuhkan?">
        <Textarea
          rows={5}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Jelaskan tujuan, tenggat, dan hal yang sudah ada saat ini."
          required
        />
      </Field>
      <Field label="Anggaran (Rp)" hint="Hanya perkiraan, tidak mengikat.">
        <Input value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="numeric" placeholder="5000000" />
      </Field>
      {error && (
        <span role="alert" className="text-xs font-medium text-danger">
          {error}
        </span>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? 'Mengirim…' : 'Kirim permintaan'}
        {!busy && <Send className="size-4" aria-hidden="true" />}
      </Button>
      <p className="text-xs leading-relaxed text-ink-quiet">
        Tidak ada biaya yang dikenakan saat mengirim permintaan. Penjual meninjau brief Anda lebih dulu.
      </p>
    </form>
  )
}
