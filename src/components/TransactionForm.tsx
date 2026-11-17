import { useState, type FormEvent } from 'react'
import { Plus, X } from 'lucide-react'
import { Button, Field, Input, Panel, PanelHead } from '@/components/ui'

export function TransactionForm({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<'revenue' | 'expense'>('revenue')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/finance/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          category,
          description,
          amountIdr: Number(amount.replace(/[^\d]/g, '')),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Catatan tidak tersimpan.')
        return
      }
      setCategory('')
      setDescription('')
      setAmount('')
      setOpen(false)
      onSaved()
    } catch {
      setError('Koneksi terputus. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="size-4" aria-hidden="true" />
        Catat transaksi
      </Button>
    )
  }

  return (
    <Panel className="w-full">
      <PanelHead
        label="Catatan baru"
        aside={
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Tutup formulir"
            className="text-ink-quiet hover:text-ink"
          >
            <X className="size-4" />
          </button>
        }
      />
      <form className="flex flex-col gap-stack px-page py-stack" onSubmit={submit} noValidate>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Jenis transaksi">
          {(['revenue', 'expense'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setKind(option)}
              aria-pressed={kind === option}
              className={`min-h-10 rounded-md border text-[0.8125rem] font-medium transition-colors ${
                kind === option
                  ? 'border-signal bg-signal-soft text-signal'
                  : 'border-line bg-surface text-ink-quiet hover:text-ink'
              }`}
            >
              {option === 'revenue' ? 'Pemasukan' : 'Pengeluaran'}
            </button>
          ))}
        </div>
        <Field label="Kategori">
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Langganan produk, iklan, gaji…"
            required
          />
        </Field>
        <Field label="Keterangan">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Apa transaksi ini?"
            required
          />
        </Field>
        <Field label="Jumlah (Rp)" error={error ?? undefined}>
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
            placeholder="1500000"
            required
          />
        </Field>
        <Button type="submit" disabled={saving}>
          {saving ? 'Menyimpan…' : 'Simpan transaksi'}
        </Button>
      </form>
    </Panel>
  )
}
