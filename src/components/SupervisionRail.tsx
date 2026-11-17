import Link from 'next/link'
import { ArrowUpRight, Bot, ShieldCheck } from 'lucide-react'
import { Button, Panel } from '@/components/ui'
import { AutonomySwitch } from '@/components/AutonomySwitch'

/** The signature band: what the AI may finish alone, and what stops at the owner's desk. */
export function SupervisionRail({
  activeAgents,
  totalAgents,
  pending,
  paused,
}: {
  activeAgents: number
  totalAgents: number
  pending: number
  paused: boolean
}) {
  return (
    <Panel className="overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1px_1fr]">
        <div className="flex flex-col gap-3 px-page py-stack">
          <div className="flex items-center gap-2">
            <Bot className="size-4 text-signal" aria-hidden="true" />
            <span className="eyebrow">Dijalankan AI sendiri</span>
          </div>
          <p className="figure text-2xl leading-none">
            {activeAgents}
            <span className="ml-1 font-sans text-sm font-normal text-ink-quiet">/ {totalAgents} agen aktif</span>
          </p>
          <p className="max-w-prose text-[0.8125rem] leading-relaxed text-ink-quiet">
            Alur kerja yang sudah disetujui: riset pasar, konten, follow-up pelanggan, dan pelaporan berjalan tanpa
            menunggu Anda.
          </p>
        </div>

        <div className="mx-page h-px bg-line sm:mx-0 sm:my-stack sm:h-auto sm:w-px" aria-hidden="true" />

        <div className="flex flex-col gap-3 border-t border-line px-page py-stack sm:border-t-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-hold" aria-hidden="true" />
            <span className="eyebrow">Berhenti di meja Anda</span>
          </div>
          <p className="figure text-2xl leading-none">
            {pending}
            <span className="ml-1 font-sans text-sm font-normal text-ink-quiet">menunggu keputusan</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/approvals">
              <Button size="sm">
                Buka pusat persetujuan
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Button>
            </Link>
            <AutonomySwitch paused={paused} compact />
          </div>
        </div>
      </div>
      <p
        className={`border-t px-page py-2 font-mono text-[0.6875rem] uppercase tracking-[0.12em] ${
          paused ? 'border-danger/20 bg-danger/5 text-danger' : 'border-line bg-canvas text-ink-quiet'
        }`}
      >
        {paused
          ? 'Operasi dijeda oleh pemilik — tidak ada alur kerja yang berjalan'
          : 'Operasi berjalan · dana, kontrak, dan investasi tetap menunggu persetujuan'}
      </p>
    </Panel>
  )
}
