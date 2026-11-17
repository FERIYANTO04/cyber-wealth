import { useState, type FormEvent } from 'react'
import { Button, Field, Input, Notice, Panel, PanelBody, PanelHead, Textarea } from '@/components/ui'

/** The public contact form. A sent message is stored in the app before it is emailed. */
export function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', body: '' })
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Pesan tidak terkirim. Coba lagi.')
        return
      }
      setSent(true)
      setForm({ name: '', email: '', subject: '', body: '' })
    } catch {
      setError('Koneksi terputus. Periksa jaringan lalu coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <Panel>
        <PanelHead label="Terkirim" />
        <PanelBody>
          <Notice tone="signal">
            Pesan Anda sudah kami terima. Balasan dikirim ke alamat email yang Anda tulis.
          </Notice>
          <Button variant="secondary" onClick={() => setSent(false)}>
            Kirim pesan lain
          </Button>
        </PanelBody>
      </Panel>
    )
  }

  return (
    <Panel>
      <PanelHead label="Kirim pesan" />
      <PanelBody>
        <form className="flex flex-col gap-stack" onSubmit={submit} noValidate>
          <Field label="Nama Anda">
            <Input
              name="name"
              autoComplete="name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
              minLength={2}
            />
          </Field>
          <Field label="Email">
            <Input
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
            />
          </Field>
          <Field label="Subjek">
            <Input
              name="subject"
              value={form.subject}
              onChange={(event) => setForm({ ...form, subject: event.target.value })}
              required
              minLength={3}
            />
          </Field>
          <Field label="Pesan" hint="Ceritakan apa yang Anda butuhkan.">
            <Textarea
              name="body"
              rows={6}
              value={form.body}
              onChange={(event) => setForm({ ...form, body: event.target.value })}
              required
              minLength={10}
            />
          </Field>
          {error && <Notice tone="danger">{error}</Notice>}
          <Button type="submit" disabled={busy}>
            {busy ? 'Mengirim…' : 'Kirim pesan'}
          </Button>
        </form>
      </PanelBody>
    </Panel>
  )
}
