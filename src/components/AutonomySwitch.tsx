import { useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui'

export function AutonomySwitch({ paused, compact }: { paused: boolean; compact?: boolean }) {
  const [isPaused, setIsPaused] = useState(paused)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggle() {
    setBusy(true)
    setError(null)
    const next = !isPaused
    try {
      const response = await fetch('/api/operations/autonomy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: next }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Tidak bisa mengubah status operasi.')
        return
      }
      setIsPaused(Boolean(data.paused))
    } catch {
      setError('Koneksi terputus.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-1">
      <Button
        variant={isPaused ? 'primary' : 'secondary'}
        size={compact ? 'sm' : 'md'}
        onClick={toggle}
        disabled={busy}
      >
        {isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
        {busy ? 'Menyimpan…' : isPaused ? 'Lanjutkan operasi' : 'Jeda operasi'}
      </Button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}
