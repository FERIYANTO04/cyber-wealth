import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/router'
import { Button, Field, Input, Panel } from '@/components/ui'

export function LoginForm({ needsSetup, restricted }: { needsSetup: boolean; restricted: boolean }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(needsSetup ? '/api/auth/setup' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(needsSetup ? { name, email, password } : { email, password }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Tidak bisa masuk. Coba lagi.')
        setSaving(false)
        return
      }
      const next = typeof router.query.next === 'string' ? router.query.next : '/dashboard'
      router.replace(next.startsWith('/') ? next : '/dashboard')
    } catch {
      setError('Koneksi terputus. Periksa jaringan lalu coba lagi.')
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-section pt-section">
      <div className="flex flex-col gap-block">
        <p className="eyebrow">Supervised autonomy · IDR</p>
        <h1 className="heading-tight text-[2rem] leading-[1.1] sm:text-[2.5rem]">
          {needsSetup ? 'Siapkan akun pemilik' : 'Masuk sebagai pemilik'}
        </h1>
        <p className="max-w-prose text-[0.9375rem] leading-relaxed text-ink-quiet">
          {needsSetup
            ? restricted
              ? 'Konsol ini hanya bisa disiapkan dengan alamat email pemilik yang sudah ditetapkan. Tidak ada pendaftaran terbuka.'
              : 'Akun ini adalah satu-satunya pintu ke konsol. Tidak ada pendaftaran terbuka setelah ini.'
            : 'Konsol ini hanya bisa dibuka oleh pemilik. Semua agen dan keputusan finansial ada di dalam.'}
        </p>
      </div>

      <Panel className="p-page">
        <form className="flex flex-col gap-stack" onSubmit={submit} noValidate>
          {needsSetup && (
            <Field label="Nama pemilik">
              <Input
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
              />
            </Field>
          )}
          <Field label="Email">
            <Input
              name="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field
            label="Kata sandi"
            hint={
              needsSetup
                ? 'Minimal 10 karakter. Simpan di tempat aman — tidak bisa dipulihkan lewat email.'
                : undefined
            }
            error={error ?? undefined}
          >
            <Input
              name="password"
              type="password"
              autoComplete={needsSetup ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={needsSetup ? 10 : 1}
            />
          </Field>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? 'Memproses…' : needsSetup ? 'Buat akun & masuk' : 'Masuk'}
          </Button>
        </form>
      </Panel>

      <p className="eyebrow leading-relaxed">
        SUPERVISED AUTONOMY · AI tidak dapat membelanjakan dana, menandatangani kontrak, atau berinvestasi tanpa
        persetujuan Anda.
      </p>
    </div>
  )
}
