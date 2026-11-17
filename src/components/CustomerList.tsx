import { useMemo, useState } from 'react'
import { Badge, CountNote, EmptyState, List, Panel, PanelBody, PanelHead, SearchInput } from '@/components/ui'
import { dateTime, money } from '@/lib/format'

export type CustomerRow = {
  id: string
  name: string
  email: string
  verified: boolean
  createdAt: string
  orderCount: number
  spentIdr: number
  activeSubscriptions: number
}

/** Everyone who created a buyer account, with what each actually paid. */
export function CustomerList({ customers }: { customers: CustomerRow[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return customers
    return customers.filter(
      (row) => row.name.toLowerCase().includes(needle) || row.email.toLowerCase().includes(needle)
    )
  }, [customers, query])

  return (
    <Panel>
      <PanelHead
        label="Pelanggan"
        aside={<CountNote>{filtered.length} dari {customers.length}</CountNote>}
      />
      <div className="filter-bar">
        <SearchInput value={query} onChange={setQuery} placeholder="Cari nama atau email pelanggan…" />
      </div>
      <PanelBody>
        {filtered.length === 0 ? (
          <EmptyState
            title={customers.length === 0 ? 'Belum ada pelanggan' : 'Tidak ada yang cocok'}
            body={
              customers.length === 0
                ? 'Setiap orang yang membuat akun pembeli di toko Anda akan tercatat di sini.'
                : 'Coba kata lain, atau kosongkan pencarian untuk melihat semua pelanggan.'
            }
          />
        ) : (
          <List>
            {filtered.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-block first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="heading-tight text-[0.9375rem]">{row.name}</p>
                  <p className="text-xs text-ink-quiet">
                    <span className="font-mono">{row.email}</span> · sejak {dateTime(row.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tnum font-mono text-xs text-ink-quiet">
                    {row.orderCount} pesanan · {money(row.spentIdr)}
                  </span>
                  {row.activeSubscriptions > 0 && <Badge tone="signal">{row.activeSubscriptions} langganan aktif</Badge>}
                  <Badge tone={row.verified ? 'neutral' : 'hold'}>{row.verified ? 'Email terkonfirmasi' : 'Belum konfirmasi'}</Badge>
                </div>
              </li>
            ))}
          </List>
        )}
      </PanelBody>
    </Panel>
  )
}
