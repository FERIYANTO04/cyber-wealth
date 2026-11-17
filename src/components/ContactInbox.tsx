import { useState } from 'react'
import { Badge, Button, EmptyState, InlineNote, List, Panel, PanelBody, PanelHead } from '@/components/ui'
import { dateTime } from '@/lib/format'

export type ContactRow = {
  id: string
  name: string
  email: string
  subject: string
  body: string
  status: string
  ownerNote: string | null
  createdAt: string
}

/** Messages that came in from the public contact page, with the reply marked by hand. */
export function ContactInbox({ messages }: { messages: ContactRow[] }) {
  const [rows, setRows] = useState(messages)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function markAnswered(id: string) {
    setBusyId(id)
    setError(null)
    try {
      const response = await fetch('/api/admin/contact', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'answered' }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Status pesan tidak tersimpan.')
        return
      }
      setRows((old) => old.map((row) => (row.id === id ? { ...row, status: 'answered' } : row)))
    } catch {
      setError('Koneksi terputus. Coba lagi.')
    } finally {
      setBusyId(null)
    }
  }

  const open = rows.filter((row) => row.status === 'new').length

  return (
    <Panel>
      <PanelHead
        label="Pesan dari halaman kontak"
        aside={<InlineNote>{open > 0 ? `${open} belum ditandai terjawab` : 'Semua pesan sudah terjawab'}</InlineNote>}
      />
      <PanelBody className="gap-block">
        {error && <InlineNote tone="danger">{error}</InlineNote>}
        {rows.length === 0 ? (
          <EmptyState
            title="Belum ada pesan"
            body="Pesan yang dikirim lewat halaman kontak publik muncul di sini, lengkap dengan alamat pengirimnya."
          />
        ) : (
          <List>
            {rows.map((row) => (
              <li key={row.id} className="flex flex-col gap-2 py-block first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="heading-tight text-[0.9375rem]">{row.subject}</p>
                    <p className="text-xs text-ink-quiet">
                      {row.name} · <span className="font-mono">{row.email}</span> · {dateTime(row.createdAt)}
                    </p>
                  </div>
                  <Badge tone={row.status === 'new' ? 'hold' : 'neutral'}>
                    {row.status === 'new' ? 'Baru' : 'Sudah dijawab'}
                  </Badge>
                </div>
                <p className="whitespace-pre-line text-xs leading-relaxed text-ink-quiet">{row.body}</p>
                {row.status === 'new' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => markAnswered(row.id)}
                      disabled={busyId === row.id}
                    >
                      {busyId === row.id ? 'Menyimpan…' : 'Tandai sudah dijawab'}
                    </Button>
                    <InlineNote>Balas langsung dari email Anda; kotak ini hanya mencatat statusnya.</InlineNote>
                  </div>
                )}
              </li>
            ))}
          </List>
        )}
      </PanelBody>
    </Panel>
  )
}
