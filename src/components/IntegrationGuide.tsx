import { useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, Copy, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { Badge, Button, CopyValue, InlineNote, Panel, PanelBody, PanelHead, Stat } from '@/components/ui'
import { cn } from '@/lib/utils'

export type CheckState = 'ready' | 'missing' | 'invalid' | 'error'

export type ServiceCard = {
  key: 'ai' | 'payment' | 'webhook' | 'email' | 'social' | 'social-other' | 'storage'
  title: string
  summary: string
  state: CheckState
  message: string
  required: string[]
  steps: string[]
  where: string
  /** Shown as a copyable value when the owner has to paste it into a dashboard. */
  copyValue?: { label: string; value: string }
  /** Per-channel state, when one card covers several accounts (the social channels). */
  channels?: { key: string; label: string; state: CheckState; detail: string }[]
  testable: boolean
  /** A second, deeper check on the same card (a real invoice, for example). */
  extraTest?: { key: string; label: string }
}

const TONE: Record<CheckState, { label: string; tone: 'signal' | 'hold' | 'danger'; icon: typeof CheckCircle2 }> = {
  ready: { label: 'Aktif', tone: 'signal', icon: CheckCircle2 },
  missing: { label: 'Belum terhubung', tone: 'hold', icon: AlertTriangle },
  invalid: { label: 'Ditolak', tone: 'danger', icon: XCircle },
  error: { label: 'Gagal', tone: 'danger', icon: AlertTriangle },
}

function ServiceCardBody({
  card,
  testing,
  testNote,
  channelResults,
  onTest,
  onExtraTest,
}: {
  card: ServiceCard
  testing: boolean
  testNote?: { state: CheckState; message: string }
  channelResults?: Record<string, { state: CheckState; message: string }>
  onTest: () => void
  onExtraTest: (key: string) => void
}) {
  const [open, setOpen] = useState(card.state !== 'ready')
  const live = testNote ?? { state: card.state, message: card.message }
  const effectiveState = live.state
  const tone = TONE[effectiveState]
  const Icon = tone.icon
  const liveTone = TONE[live.state]
  const LiveIcon = liveTone.icon

  return (
    <>
      <PanelHead
        label={card.title}
        aside={<Badge tone={tone.tone}>{tone.label}</Badge>}
      />
      <PanelBody>
        <div className="flex items-start gap-2">
          <Icon className={cn('mt-0.5 size-4 shrink-0', effectiveState === 'ready' ? 'text-signal' : 'text-hold')} aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[0.8125rem] leading-relaxed text-ink">{card.summary}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-quiet">{live.message}</p>
          </div>
        </div>

        {(card.channels?.length ?? 0) > 0 && (
          <ul className="flex flex-col gap-1.5">
            {card.channels?.map((channel) => {
              const result = channelResults?.[channel.key]
              const live = result ?? { state: channel.state, message: channel.detail }
              const tone = TONE[live.state]
              return (
                <li key={channel.label} className="flex flex-wrap items-baseline gap-2">
                  <span className="text-[0.8125rem] text-ink">{channel.label}</span>
                  <Badge tone={tone.tone}>{tone.label}</Badge>
                  <span className="text-[0.6875rem] leading-relaxed text-ink-quiet">{live.message}</span>
                </li>
              )
            })}
          </ul>
        )}

        {testNote && (
          <InlineNote tone={liveTone.tone === 'danger' ? 'danger' : liveTone.tone === 'signal' ? 'signal' : 'quiet'}>
            <span className="flex items-start gap-1.5">
              <LiveIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Hasil pemeriksaan: {testNote.message}
            </span>
          </InlineNote>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {card.testable && (
            <Button size="sm" variant="secondary" onClick={onTest} disabled={testing}>
              {testing ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="size-3.5" aria-hidden="true" />
              )}
              {testing ? 'Menguji…' : 'Uji koneksi'}
            </Button>
          )}
          {card.extraTest && (
            <Button size="sm" variant="ghost" onClick={() => onExtraTest(card.extraTest!.key)} disabled={testing}>
              {card.extraTest.label}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
            <ChevronDown
              className={cn('size-3.5 transition-transform', open && 'rotate-180')}
              aria-hidden="true"
            />
            {open ? 'Sembunyikan panduan' : 'Cara mengisi'}
          </Button>
        </div>

        {open && (
          <div className="inset-block flex flex-col gap-3">
            <div>
              <p className="eyebrow mb-1">Yang perlu Anda isi</p>
              <ul className="flex flex-col gap-1">
                {card.required.map((item) => (
                  <li key={item} className="value-line">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="eyebrow mb-1">Langkahnya</p>
              <ol className="flex flex-col gap-1.5">
                {card.steps.map((step, index) => (
                  <li key={step} className="flex gap-2 text-xs leading-relaxed text-ink-quiet">
                    <span className="mt-px flex size-4 shrink-0 items-center justify-center rounded-full bg-surface font-mono text-[0.5625rem] text-ink-quiet">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {card.copyValue && <CopyValue label={card.copyValue.label} value={card.copyValue.value} />}

            <p className="text-xs leading-relaxed text-ink-quiet">{card.where}</p>
          </div>
        )}
      </PanelBody>
    </>
  )
}

/** Everything the owner must connect, each with a live status and a real test. */
export function IntegrationGuide({ cards }: { cards: ServiceCard[] }) {
  const [results, setResults] = useState<Record<string, { state: CheckState; message: string }>>({})
  const [channelResults, setChannelResults] = useState<Record<string, { state: CheckState; message: string }>>({})
  const [testingKey, setTestingKey] = useState<string | null>(null)
  const [allBusy, setAllBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function test(target: string) {
    setError(null)
    if (target === 'all') setAllBusy(true)
    else setTestingKey(target)
    try {
      const response = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Pemeriksaan tidak bisa dijalankan.')
        return
      }
      const incoming: Record<string, { state: CheckState; message: string }> = data.results ?? {}
      setResults((old) => ({ ...old, ...incoming }))
      setChannelResults((old) => ({
        ...old,
        ...(incoming.facebook ? { facebook: incoming.facebook } : {}),
        ...(incoming.instagram ? { instagram: incoming.instagram } : {}),
      }))
    } catch {
      setError('Koneksi terputus saat memeriksa. Coba lagi.')
    } finally {
      setTestingKey(null)
      setAllBusy(false)
    }
  }

  const total = cards.length
  const currentReadyCount = cards.filter((card) => (results[card.key]?.state ?? card.state) === 'ready').length

  return (
    <div className="flex flex-col gap-stack">
      <Panel>
        <PanelBody>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <Stat
              label="Layanan terhubung"
              value={`${currentReadyCount} / ${total}`}
              tone={currentReadyCount === total ? 'signal' : undefined}
              context={currentReadyCount === total ? 'semua siap dipakai' : 'sisanya masih perlu diisi'}
            />
            <ul className="flex flex-col gap-1">
              {cards.map((card) => (
                <li key={card.key} className="flex items-center gap-2 text-xs text-ink-quiet">
                  <span
                    className={cn(
                      'size-1.5 rounded-full',
                      (results[card.key]?.state ?? card.state) === 'ready' ? 'bg-signal' : (results[card.key]?.state ?? card.state) === 'missing' ? 'bg-hold' : 'bg-danger'
                    )}
                    aria-hidden="true"
                  />
                  {card.title}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => test('all')} disabled={allBusy}>
              {allBusy ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-3.5" aria-hidden="true" />}
              {allBusy ? 'Memeriksa semua…' : 'Periksa semua koneksi'}
            </Button>
            {error && (
              <InlineNote tone="danger">
                <span role="alert">{error}</span>
              </InlineNote>
            )}
          </div>
          <p className="text-xs leading-relaxed text-ink-quiet">
            Pemeriksaan benar-benar memanggil setiap layanan. Selama sebuah layanan belum terhubung, fitur yang
            memakainya akan mengatakannya terus terang, bukan menampilkan hasil palsu.
          </p>
        </PanelBody>
      </Panel>

      {cards.map((card) => (
        <Panel key={card.key}>
          <ServiceCardBody
            card={card}
            testing={testingKey === card.key}
            testNote={results[card.key]}
            channelResults={channelResults}
            onExtraTest={test}
            onTest={() => test(card.key)}
          />
        </Panel>
      ))}
    </div>
  )
}

/** A dismissible-free summary band: what is still blocking go-live. */
export function ActivationSummary({ blockers }: { blockers: string[] }) {
  if (blockers.length === 0) {
    return (
      <Panel>
        <PanelBody>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden="true" />
            <div>
              <p className="text-[0.8125rem] font-medium text-signal">Semua layanan terhubung</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-quiet">
                Agen, checkout, dan konfirmasi pembayaran siap dipakai. Uji satu pesanan dan satu tugas agen sebelum
                mengumumkan toko Anda.
              </p>
            </div>
          </div>
        </PanelBody>
      </Panel>
    )
  }

  return (
    <Panel>
      <PanelBody>
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-hold" aria-hidden="true" />
          <div>
            <p className="text-[0.8125rem] font-medium text-ink">
              {blockers.length} hal belum selesai sebelum sistem bisa disebut aktif
            </p>
            <ul className="mt-1 flex flex-col gap-1">
              {blockers.map((blocker) => (
                <li key={blocker} className="text-xs leading-relaxed text-ink-quiet">
                  · {blocker}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </PanelBody>
    </Panel>
  )
}
