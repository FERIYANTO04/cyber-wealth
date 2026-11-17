import { useMemo, useState } from 'react'
import { ChoiceChips, CountNote, EmptyState, Panel, Segmented } from '@/components/ui'
import { ProposalCard, type ProposalItem } from '@/components/ProposalCard'

const FILTERS = [
  { value: 'all', label: 'Semua' },
  { value: 'finance', label: 'Dana' },
  { value: 'investment', label: 'Investasi' },
  { value: 'contract', label: 'Kontrak' },
  { value: 'marketing', label: 'Pemasaran' },
  { value: 'operations', label: 'Operasional' },
]

/** Two views over the owner's decision queue with a category filter. */
export function ApprovalBoard({ pending, decided }: { pending: ProposalItem[]; decided: ProposalItem[] }) {
  const [filter, setFilter] = useState<string>('all')
  const [tab, setTab] = useState<'pending' | 'decided'>('pending')

  const list = useMemo(() => {
    const source = tab === 'pending' ? pending : decided
    return filter === 'all' ? source : source.filter((item) => item.category === filter)
  }, [filter, tab, pending, decided])

  return (
    <div className="flex flex-col gap-stack">
      <Segmented
        value={tab}
        onChange={setTab}
        label="Tampilan usulan"
        options={[
          { value: 'pending', label: `Menunggu (${pending.length})` },
          { value: 'decided', label: `Sudah diputuskan (${decided.length})` },
        ]}
      />

      <ChoiceChips value={filter} options={FILTERS} onChange={setFilter} label="Saring kategori" />

      {list.length === 0 ? (
        <Panel>
          <EmptyState
            title={tab === 'pending' ? 'Tidak ada usulan yang menunggu' : 'Belum ada keputusan'}
            body={
              tab === 'pending'
                ? 'Bersih. Usulan baru muncul di sini begitu ada agen yang mengajukan transaksi, investasi, atau kontrak.'
                : 'Keputusan yang Anda ambil tercatat di sini sebagai jejak audit.'
            }
          />
        </Panel>
      ) : (
        <>
          <CountNote>{`${list.length} usulan`}</CountNote>
          <div className="grid grid-cols-1 gap-block md:grid-cols-2">
            {list.map((item) => (
              <ProposalCard key={item.id} proposal={item} interactive={tab === 'pending'} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
