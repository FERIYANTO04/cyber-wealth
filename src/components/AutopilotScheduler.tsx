import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Nudges the daily pass along when the owner opens the console after a day without
 * one. It posts once per mount, and the API decides whether a run is actually due.
 */
export function AutopilotScheduler({ enabled }: { enabled: boolean }) {
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle')

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setState('running')
    fetch('/api/autopilot/due', { method: 'POST' })
      .then((response) => response.json().catch(() => ({})))
      .then((data) => {
        if (cancelled) return
        setState('done')
        if (data?.ran) window.setTimeout(() => window.location.reload(), 800)
      })
      .catch(() => {
        if (!cancelled) setState('done')
      })
    return () => {
      cancelled = true
    }
  }, [enabled])

  if (state !== 'running') return null

  return (
    <p role="status" className="flex items-center gap-2 font-mono text-[0.6875rem] text-ink-quiet">
      <Loader2 className="size-3 animate-spin" aria-hidden="true" />
      Putaran harian agen sedang berjalan…
    </p>
  )
}
