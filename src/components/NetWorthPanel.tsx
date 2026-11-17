import Link from 'next/link'
import { Button, Panel, PanelBody, PanelHead, SourceTag, Stat } from '@/components/ui'
import { compactMoney, money, percent } from '@/lib/format'

export type Ledger = {
  revenue: number
  expenses: number
  netCash: number
  assets: number
  netWorth: number
  rows: number
}

/** The live figure beside the clearly-separated sample figure. */
export function WealthRow({ live, demo, target }: { live: Ledger; demo: Ledger; target: number }) {
  return (
    <div className="grid grid-cols-1 gap-block lg:grid-cols-3">
      <NetWorthPanel live={live} target={target} />
      <DemoNetWorthPanel demo={demo} target={target} />
    </div>
  )
}

export function NetWorthPanel({ live, target }: { live: Ledger; target: number }) {
  const share = percent(live.netWorth, target)
  return (
    <Panel className="lg:col-span-2">
      <PanelHead label="Kekayaan bersih" aside={<SourceTag source="live" />} />
      <PanelBody>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="figure text-[1.75rem] leading-none">{money(live.netWorth)}</p>
            <p className="mt-1 text-xs text-ink-quiet">
              Aset {compactMoney(live.assets)} · arus kas bersih {compactMoney(live.netCash)}
            </p>
          </div>
          <div className="text-right">
            <p className="eyebrow">Tujuan jangka panjang</p>
            <p className="tnum font-mono text-sm font-medium text-ink">{compactMoney(target)}</p>
          </div>
        </div>

        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-signal transition-[width] duration-500"
              style={{ width: `${live.netWorth > 0 ? Math.max(share, 1) : 0}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between font-mono text-[0.6875rem] text-ink-quiet">
            <span>{share.toFixed(share < 1 && share > 0 ? 2 : 0)}% dari tujuan</span>
            <span>{money(Math.max(0, target - live.netWorth))} lagi</span>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-ink-quiet">
          Angka ini hanya dihitung dari transaksi dan aset yang sudah Anda catat sendiri. Tujuan ini sasaran jangka
          panjang, bukan jaminan hasil.
        </p>

        {live.rows === 0 && (
          <div className="inset-box border-dashed px-page py-block">
            <p className="text-[0.8125rem] font-medium text-ink">Belum ada catatan keuangan milik Anda</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-quiet">
              Kekayaan bersih muncul setelah Anda mencatat pemasukan, pengeluaran, atau aset pertama. Angka demo di
              sebelah tidak dihitung ke dalamnya.
            </p>
            <Link href="/finance" className="mt-2 inline-block">
              <Button size="sm" variant="secondary">
                Catat keuangan pertama
              </Button>
            </Link>
          </div>
        )}
      </PanelBody>
    </Panel>
  )
}

export function DemoNetWorthPanel({ demo, target }: { demo: Ledger; target: number }) {
  const share = percent(demo.netWorth, target)
  return (
    <Panel>
      <PanelHead label="Data demo" aside={<SourceTag source="demo" />} />
      <PanelBody>
        <Stat
          label="Kekayaan bersih (contoh)"
          value={compactMoney(demo.netWorth)}
          context={`${demo.rows} catatan contoh untuk memperlihatkan tampilan saat data asli sudah terisi.`}
        />
        <div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-hold/70" style={{ width: `${Math.max(share, 1)}%` }} />
          </div>
          <p className="mt-1.5 font-mono text-[0.6875rem] text-ink-quiet">
            {share.toFixed(2)}% dari tujuan (contoh)
          </p>
        </div>
        <p className="text-xs leading-relaxed text-ink-quiet">
          Data contoh tidak pernah digabung dengan angka asli dan tidak dihitung sebagai pendapatan.
        </p>
      </PanelBody>
    </Panel>
  )
}
