import { Clock } from 'lucide-react'
import { Panel, PanelHead, Stat } from '@/components/ui'
import { dayLabel, money } from '@/lib/format'

export type DailyReport = {
  liveRevenue: number
  liveExpenses: number
  demoRevenue: number
  demoExpenses: number
  decisionsToday: number
}

export function TodayReport({ report }: { report: DailyReport }) {
  return (
    <Panel>
      <PanelHead
        label={`Laporan hari ini · ${dayLabel(new Date())}`}
        aside={<Clock className="size-4 text-ink-quiet" aria-hidden="true" />}
      />
      <div className="grid grid-cols-2 gap-stack px-page py-stack lg:grid-cols-4">
        <Stat
          label="Pemasukan"
          value={money(report.liveRevenue)}
          source="live"
          tone="signal"
          context="tercatat hari ini"
        />
        <Stat label="Pengeluaran" value={money(report.liveExpenses)} source="live" context="tercatat hari ini" />
        <Stat label="Keputusan Anda" value={String(report.decisionsToday)} context="usulan diputuskan hari ini" />
        <Stat
          label="Contoh hari ini"
          value={money(report.demoRevenue - report.demoExpenses)}
          source="demo"
          context="arus kas demo, bukan pendapatan asli"
        />
      </div>
    </Panel>
  )
}
