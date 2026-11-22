import { useState, type ChangeEvent, type FormEvent } from 'react'
import Link from 'next/link'
import { ExternalLink, Package, Plus, Upload } from 'lucide-react'
import {
  Badge,
  Button,
  Field,
  InlineNote,
  Input,
  Panel,
  PanelBody,
  PanelHead,
  Select,
  SignalLink,
  Textarea,
} from '@/components/ui'
import { money } from '@/lib/format'

export type OwnerProduct = {
  id: string
  slug: string
  name: string
  summary: string
  category: string
  priceIdr: number
  status: string
  fileName: string | null
  fileKey: string | null
}

const CATEGORIES = [
  { value: 'template', label: 'Template' },
  { value: 'ebook', label: 'E-book' },
  { value: 'desain', label: 'Aset desain' },
  { value: 'materi', label: 'Materi bisnis' },
  { value: 'toolkit', label: 'Toolkit' },
  { value: 'video', label: 'Video siap jual' },
  { value: 'motion', label: 'Motion graphics & footage' },
  { value: 'audio', label: 'Audio & sound pack' },
  { value: 'social', label: 'Paket konten sosial media' },
]

export function ProductManager({ initial }: { initial: OwnerProduct[] }) {
  const [rows, setRows] = useState(initial)
  const [open, setOpen] = useState(initial.length === 0)
  const [name, setName] = useState('')
  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('template')
  const [price, setPrice] = useState('')
  const [deliverable, setDeliverable] = useState('')
  const [publishNow, setPublishNow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)
  const [securingFor, setSecuringFor] = useState<string | null>(null)

  async function create(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          summary,
          description,
          category,
          priceIdr: Number(price.replace(/[^\d]/g, '')) || 0,
          deliverableNote: deliverable || undefined,
          status: publishNow ? 'published' : 'draft',
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Produk tidak tersimpan.')
        return
      }
      setRows((old) => [
        {
          id: data.product.id,
          slug: data.product.slug,
          name,
          summary,
          category,
          priceIdr: Number(price.replace(/[^\d]/g, '')) || 0,
          status: publishNow ? 'published' : 'draft',
          fileName: null,
          fileKey: null,
        },
        ...old,
      ])
      setName('')
      setSummary('')
      setDescription('')
      setPrice('')
      setDeliverable('')
      setPublishNow(false)
      setOpen(false)
      setNote('Produk tersimpan. Lampirkan berkas agar pembeli bisa mengunduhnya.')
    } catch {
      setError('Koneksi terputus. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  async function setStatus(id: string, status: 'draft' | 'published' | 'archived') {
    setError(null)
    const response = await fetch('/api/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      setError(data.error ?? 'Status produk tidak tersimpan.')
      return
    }
    setRows((old) => old.map((row) => (row.id === id ? { ...row, status } : row)))
  }

  async function secureExisting(product: OwnerProduct) {
    setError(null)
    setNote(null)
    setSecuringFor(product.id)
    try {
      const response = await fetch('/api/products/secure-existing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Berkas belum bisa dipindahkan ke penyimpanan privat.')
        return
      }
      setRows((old) => old.map((row) => row.id === product.id ? { ...row, fileKey: data.key } : row))
      setNote(`Berkas ${product.fileName ?? ''} sudah dipindahkan ke penyimpanan privat. Produk sekarang dapat diakses pembeli setelah pembayaran terkonfirmasi.`)
    } catch {
      setError('Koneksi terputus saat mengamankan berkas.')
    } finally {
      setSecuringFor(null)
    }
  }

  async function upload(product: OwnerProduct, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    setNote(null)
    setUploadingFor(product.id)
    try {
      const signResponse = await fetch('/api/products/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
        }),
      })
      const signed = await signResponse.json().catch(() => ({}))
      if (!signResponse.ok) {
        setError(signed.error ?? 'Berkas tidak bisa diunggah.')
        return
      }
      const put = await fetch(signed.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      })
      if (!put.ok) {
        setError('Berkas gagal diunggah ke penyimpanan. Coba lagi.')
        return
      }
      setRows((old) =>
        old.map((row) => (row.id === product.id ? { ...row, fileName: file.name, fileKey: signed.key } : row))
      )
      setNote(`Berkas ${file.name} terlampir pada ${product.name}.`)
    } catch {
      setError('Koneksi terputus saat mengunggah berkas.')
    } finally {
      setUploadingFor(null)
    }
  }

  return (
    <div className="flex flex-col gap-stack">
      <div className="flex flex-wrap items-center gap-2">
        {!open && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Produk baru
          </Button>
        )}
        <SignalLink href="/toko">Lihat katalog publik</SignalLink>
      </div>

      {note && <InlineNote tone="signal">{note}</InlineNote>}
      {error && (
        <InlineNote tone="danger">
          <span role="alert">{error}</span>
        </InlineNote>
      )}

      {open && (
        <Panel>
          <PanelHead label="Produk baru" />
          <form onSubmit={create} className="flex flex-col gap-stack px-page py-stack" noValidate>
            <Field label="Nama produk">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template laporan keuangan" required />
            </Field>
            <Field label="Ringkasan singkat" hint="Muncul di katalog.">
              <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Satu kalimat tentang isi produk" required />
            </Field>
            <Field label="Deskripsi lengkap">
              <Textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Apa yang pembeli dapatkan, untuk siapa, dan bagaimana memakainya."
                required
              />
            </Field>
            <div className="grid gap-stack sm:grid-cols-2">
              <Field label="Kategori">
                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Harga (Rp)" hint="Isi 0 untuk produk gratis.">
                <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" placeholder="150000" />
              </Field>
            </div>
            <Field label="Catatan serahan" hint="Tampil di halaman pesanan pembeli setelah pembayaran.">
              <Input
                value={deliverable}
                onChange={(e) => setDeliverable(e.target.value)}
                placeholder="Berkas ZIP berisi 12 template dan panduan pemakaian"
              />
            </Field>
            <label className="flex items-start gap-2 text-[0.8125rem] text-ink">
              <input
                type="checkbox"
                checked={publishNow}
                onChange={(e) => setPublishNow(e.target.checked)}
                className="mt-0.5 size-4 rounded border-line text-signal focus:ring-signal"
              />
              <span>Terbitkan sekarang di katalog publik</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? 'Menyimpan…' : 'Simpan produk'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Batal
              </Button>
            </div>
          </form>
        </Panel>
      )}

      <Panel>
        <PanelHead label="Katalog saya" aside={<Badge>{`${rows.length} produk`}</Badge>} />
        {rows.length === 0 ? (
          <PanelBody>
            <p className="text-[0.8125rem] text-ink-quiet">
              Belum ada produk. Tambahkan produk pertama, lampirkan berkasnya, lalu terbitkan agar bisa dibeli.
            </p>
          </PanelBody>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-col gap-3 px-page py-stack">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Package className="size-4 shrink-0 text-ink-quiet" aria-hidden="true" />
                      <p className="text-[0.875rem] font-medium text-ink">{row.name}</p>
                      <Badge tone={row.status === 'published' ? 'signal' : row.status === 'archived' ? 'danger' : 'neutral'}>
                        {row.status === 'published' ? 'Terbit' : row.status === 'archived' ? 'Diarsipkan' : 'Draf'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-ink-quiet">{row.summary}</p>
                    <p className="mt-1 font-mono text-[0.6875rem] text-ink-quiet">
                      {money(row.priceIdr)} · {row.fileName ?? 'belum ada berkas'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {row.status === 'published' && (
                      <Link href={`/toko/${row.slug}`} className="nav-quiet" aria-label={`Buka halaman ${row.name}`}>
                        <ExternalLink className="size-4" aria-hidden="true" />
                        Lihat
                      </Link>
                    )}
                    {row.fileKey?.startsWith('https://raw.githubusercontent.com/FERIYANTO04/cyber-wealth/main/public/produk/') && (
                      <Button size="sm" variant="secondary" onClick={() => secureExisting(row)} disabled={securingFor === row.id}>
                        {securingFor === row.id ? 'Mengamankan…' : 'Amankan berkas'}
                      </Button>
                    )}
                    <label className="nav-quiet cursor-pointer">
                      <Upload className="size-4" aria-hidden="true" />
                      {uploadingFor === row.id ? 'Mengunggah…' : 'Berkas'}
                      <input
                        type="file"
                        className="sr-only"
                        accept=".zip,.pdf,.epub,.doc,.docx,.xlsx,.csv,.txt,.md,.png,.jpg,.jpeg,.webp,.svg,.mp4,.mov,.m4v,.webm,.mkv,.avi,.3gp"
                        onChange={(e) => upload(row, e)}
                        disabled={uploadingFor === row.id}
                      />
                    </label>
                    {row.status !== 'published' ? (
                      <Button size="sm" variant="secondary" onClick={() => setStatus(row.id, 'published')}>
                        Terbitkan
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => setStatus(row.id, 'draft')}>
                        Tarik ke draf
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
