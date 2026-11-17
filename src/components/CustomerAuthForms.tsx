import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/router'
import { Button, Field, Input, Notice, Panel, PanelBody, PanelHead, SignalLink } from '@/components/ui'

/** Sign in / create account, with the verification step explained where it happens. */
export function CustomerAuthForm({ mode }: { mode: 'masuk' | 'daftar' }) {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch('/api/customer/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: mode === 'masuk' ? 'login' : 'register',
          name: mode === 'daftar' ? form.name : undefined,
          email: form.email,
          password: form.password,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Tidak bisa memproses permintaan.')
        setNeedsVerification(Boolean(data.needsVerification))
        return
      }
      if (data.needsVerification) {
        setNotice(data.message ?? 'Akun dibuat. Konfirmasi email Anda lebih dulu.')
        setNeedsVerification(true)
        return
      }
      const next = typeof router.query.next === 'string' ? router.query.next : '/akun'
      router.replace(next.startsWith('/') ? next : '/akun')
    } catch {
      setError('Koneksi terputus. Periksa jaringan lalu coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    setError(null)
    const response = await fetch('/api/customer/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email }),
    })
    const data = await response.json().catch(() => ({}))
    setNotice(data.message ?? 'Permintaan dikirim.')
  }

  return (
    <Panel>
      <PanelHead
        label={mode === 'masuk' ? 'Masuk ke akun Anda' : 'Buat akun'}
        aside={
          <SignalLink href={mode === 'masuk' ? '/daftar' : '/masuk'}>
            {mode === 'masuk' ? 'Buat akun' : 'Sudah punya akun'}
          </SignalLink>
        }
      />
      <PanelBody>
        <form className="flex flex-col gap-stack" onSubmit={submit} noValidate>
          {mode === 'daftar' && (
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
          )}
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
          <Field
            label="Kata sandi"
            hint={mode === 'daftar' ? 'Minimal 8 karakter.' : undefined}
            error={error ?? undefined}
          >
            <Input
              name="password"
              type="password"
              autoComplete={mode === 'daftar' ? 'new-password' : 'current-password'}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
              minLength={8}
            />
          </Field>
          {notice && <Notice tone="signal">{notice}</Notice>}
          <Button type="submit" disabled={busy}>
            {busy ? 'Memproses…' : mode === 'masuk' ? 'Masuk' : 'Buat akun'}
          </Button>
        </form>

        {needsVerification && (
          <Button variant="secondary" onClick={resend}>
            Kirim ulang tautan konfirmasi
          </Button>
        )}

        {mode === 'masuk' && <SignalLink href="/lupa-sandi">Lupa kata sandi?</SignalLink>}
      </PanelBody>
    </Panel>
  )
}

/** Asks for an address and always answers the same way — no account discovery. */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/customer/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) setError(data.error ?? 'Permintaan tidak dapat diproses.')
      else setMessage(data.message ?? 'Permintaan diterima.')
    } catch {
      setError('Koneksi terputus. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel>
      <PanelHead label="Atur ulang kata sandi" />
      <PanelBody>
        <form className="flex flex-col gap-stack" onSubmit={submit} noValidate>
          <Field label="Email akun Anda" hint="Kami kirim tautan pengaturan ulang ke alamat ini.">
            <Input
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          {message && <Notice tone="signal">{message}</Notice>}
          {error && <Notice tone="danger">{error}</Notice>}
          <Button type="submit" disabled={busy}>
            {busy ? 'Mengirim…' : 'Kirim tautan'}
          </Button>
        </form>
        <SignalLink href="/masuk">Kembali ke halaman masuk</SignalLink>
      </PanelBody>
    </Panel>
  )
}

/** Sets the new password from a link token. */
export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/customer/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Kata sandi tidak dapat disimpan.')
        return
      }
      router.replace('/masuk?reset=1')
    } catch {
      setError('Koneksi terputus. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel>
      <PanelHead label="Kata sandi baru" />
      <PanelBody>
        <form className="flex flex-col gap-stack" onSubmit={submit} noValidate>
          <Field label="Kata sandi baru" hint="Minimal 8 karakter." error={error ?? undefined}>
            <Input
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
          </Field>
          <Button type="submit" disabled={busy}>
            {busy ? 'Menyimpan…' : 'Simpan kata sandi'}
          </Button>
        </form>
      </PanelBody>
    </Panel>
  )
}

/** Confirms an address as soon as the page opens — the link itself is the proof. */
export function VerifyEmailPanel({ token }: { token: string }) {
  const [state, setState] = useState<'working' | 'ok' | 'failed'>('working')
  const [message, setMessage] = useState('Mengonfirmasi alamat email…')

  useEffect(() => {
    if (!token) {
      setState('failed')
      setMessage('Tautan konfirmasi tidak lengkap. Buka tautan utuh dari email kami.')
      return
    }
    let cancelled = false
    fetch('/api/customer/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}))
        if (cancelled) return
        if (response.ok) {
          setState('ok')
          setMessage(data.message ?? 'Email terkonfirmasi.')
        } else {
          setState('failed')
          setMessage(data.error ?? 'Tautan tidak berlaku.')
        }
      })
      .catch(() => {
        if (cancelled) return
        setState('failed')
        setMessage('Koneksi terputus. Coba buka tautannya lagi.')
      })
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <Panel>
      <PanelHead label="Konfirmasi email" />
      <PanelBody>
        <Notice tone={state === 'ok' ? 'signal' : state === 'failed' ? 'danger' : undefined}>{message}</Notice>
        {state === 'ok' && <SignalLink href="/masuk">Lanjut masuk</SignalLink>}
        {state === 'failed' && <SignalLink href="/masuk">Minta tautan baru dari halaman masuk</SignalLink>}
      </PanelBody>
    </Panel>
  )
}

/** The quiet explanation under an account form — a page never styles its own note. */
export function FormAside({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-relaxed text-ink-quiet">{children}</p>
}
