import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Badge, Button, Input, Panel, SourceTag } from '@/components/ui'
import { dateTime, money } from '@/lib/format'

export type ProposalItem = {
  id: string
  title: string
  summary: string
  category: string
  amountIdr: number | null
  risk: string
  status: string
  decidedAt: string | null
  decisionNote: string | null
  dataSource: 'live' | 'demo'
  createdAt: string
  agentName: string | null
  agentRole: string | null
}

const CATEGORY_LABEL: Record<string, string> = {
  finance: 'Transaksi dana',
  investment: 'Investasi',
  contract: 'Kontrak',
  marketing: 'Pemasaran',
  operations: 'Operasional',
}

const RISK_TONE: Record<string, 'neutral' | 'hold' | 'danger'> = {
  low: 'neutral',
  medium: 'hold',
  high: 'danger',
}

export function ProposalCard({
  proposal,
  interactive = true,
}: {
  proposal: ProposalItem
  interactive?: boolean
}) {
  const [status, setStatus] = useState(proposal.status)
  const [busy, setBusy] = useState<'approved' | 'rejected' | null>(null)
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function decide(decision: 'approved' | 'rejected') {
    setBusy(decision)
    setError(null)
    try {
      const response = await fetch(`/api/proposals/${proposal.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, note: note.trim() || undefined }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Keputusan tidak tersimpan.')
        return
      }
      setStatus(decision)
    } catch {
      setError('Koneksi terputus. Coba lagi.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Panel className="flex flex-col">
      <div className="panel-head-row flex-wrap justify-start">
        <Badge tone={proposal.category === 'finance' || proposal.category === 'investment' ? 'hold' : 'neutral'}>
          {CATEGORY_LABEL[proposal.category] ?? proposal.category}
        </Badge>
        <Badge tone={RISK_TONE[proposal.risk] ?? 'neutral'}>Risiko {proposal.risk === 'low' ? 'rendah' : proposal.risk === 'high' ? 'tinggi' : 'sedang'}</Badge>
        <SourceTag source={proposal.dataSource} />
        {status !== 'pending' && (
          <Badge tone={status === 'approved' ? 'signal' : 'danger'}>
            {status === 'approved' ? 'Disetujui' : 'Ditolak'}
          </Badge>
        )}
        <span className="ml-auto font-mono text-[0.6875rem] text-ink-quiet">{dateTime(proposal.createdAt)}</span>
      </div>

      <div className="flex flex-1 flex-col gap-2 px-page py-page">
        <h3 className="font-display text-[0.9375rem] font-semibold leading-snug text-ink">{proposal.title}</h3>
        <p className="text-[0.8125rem] leading-relaxed text-ink-quiet">{proposal.summary}</p>
        {proposal.agentName && (
          <p className="font-mono text-[0.6875rem] text-ink-quiet">
            Diajukan oleh {proposal.agentName} · {proposal.agentRole}
          </p>
        )}
        {proposal.amountIdr !== null && (
          <p className="tnum font-mono text-[1.0625rem] font-semibold text-ink">{money(proposal.amountIdr)}</p>
        )}
        {status !== 'pending' && proposal.decisionNote && (
          <p className="border-l-2 border-line pl-2 text-xs italic text-ink-quiet">
            Catatan Anda: {proposal.decisionNote}
          </p>
        )}
        {error && <p className="text-xs font-medium text-danger">{error}</p>}
      </div>

      {interactive && status === 'pending' && (
        <div className="panel-foot flex flex-col gap-2">
          {showNote ? (
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Catatan untuk keputusan ini (opsional)"
              aria-label="Catatan keputusan"
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowNote(true)}
              className="self-start text-xs text-ink-quiet underline decoration-line underline-offset-2 hover:text-ink"
            >
              Tambahkan catatan
            </button>
          )}
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => decide('approved')} disabled={busy !== null}>
              <Check className="size-4" />
              {busy === 'approved' ? 'Menyetujui…' : 'Setujui'}
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => decide('rejected')}
              disabled={busy !== null}
            >
              <X className="size-4" />
              {busy === 'rejected' ? 'Menolak…' : 'Tolak'}
            </Button>
          </div>
        </div>
      )}
    </Panel>
  )
}
