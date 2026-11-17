import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { Panel, PanelHead, SourceTag } from '@/components/ui'
import { dateTime, money } from '@/lib/format'
import { cn } from '@/lib/utils'

export type LedgerRow = {
  id: string
  kind: string
  category: string
  description: string
  amountIdr: number
  occurredAt: string
  dataSource: 'live' | 'demo'
}

function LedgerList({ rows, compact }: { rows: LedgerRow[]; compact?: boolean }) {
  return (
    <ul className="divide-y divide-line">
      {rows.map((row) => (
        <li key={row.id} className="flex items-start justify-between gap-3 px-page py-block">
          <div className="flex min-w-0 items-start gap-2.5">
            <span
              className={cn(
                'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full',
                row.kind === 'revenue' ? 'bg-signal-soft text-signal' : 'bg-danger/10 text-danger'
              )}
            >
              {row.kind === 'revenue' ? (
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              ) : (
                <ArrowDownLeft className="size-3.5" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0">
              <p className="item-title">{row.description}</p>
              <p className="truncate text-xs text-ink-quiet">
                {row.category}
                {!compact && ` · ${dateTime(row.occurredAt)}`}
              </p>
            </div>
          </div>
          <span
            className={cn(
              'tnum shrink-0 font-mono text-[0.8125rem] font-medium',
              compact ? 'text-ink-quiet' : row.kind === 'revenue' ? 'text-signal' : 'text-danger'
            )}
          >
            {row.kind === 'revenue' ? '+' : '−'}
            {money(row.amountIdr)}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** The owner's real ledger and, folded away, the sample rows shown beside it. */
export function FinanceLedger({ live, demo }: { live: LedgerRow[]; demo: LedgerRow[] }) {
  const [showDemo, setShowDemo] = useState(false)

  return (
    <div className="grid grid-cols-1 gap-block lg:grid-cols-3">
      <Panel className="lg:col-span-2">
        <PanelHead label="Catatan asli" aside={<SourceTag source="live" />} />
        {live.length === 0 ? (
          <div className="flex flex-col gap-2 px-page py-section">
            <p className="heading-tight text-sm">Belum ada catatan</p>
            <p className="max-w-prose text-[0.8125rem] leading-relaxed text-ink-quiet">
              Setiap pemasukan dan pengeluaran yang Anda catat di sini membentuk kekayaan bersih yang sebenarnya —
              tidak dicampur data contoh.
            </p>
          </div>
        ) : (
          <LedgerList rows={live} />
        )}
      </Panel>

      <div className="flex flex-col gap-block">
        <div className="flex items-center justify-between gap-2">
          <h2 className="heading-tight text-base">Contoh data</h2>
          <button
            type="button"
            onClick={() => setShowDemo((value) => !value)}
            aria-expanded={showDemo}
            className="text-xs font-medium text-signal hover:underline"
          >
            {showDemo ? 'Sembunyikan' : 'Tampilkan'}
          </button>
        </div>
        {showDemo && (
          <Panel>
            <PanelHead label="Data demo" aside={<SourceTag source="demo" />} />
            {demo.length === 0 ? (
              <p className="px-page py-stack text-xs text-ink-quiet">Tidak ada data contoh.</p>
            ) : (
              <LedgerList rows={demo} compact />
            )}
            <p className="panel-foot text-xs leading-relaxed text-ink-quiet">
              Baris ini hanya untuk memperlihatkan tampilan. Tidak dihitung ke kekayaan bersih Anda.
            </p>
          </Panel>
        )}
      </div>
    </div>
  )
}
