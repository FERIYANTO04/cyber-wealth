import { useState } from 'react'
import { Copy, FileText } from 'lucide-react'
import { Button, EmptyState, List, Panel, PanelBody, PanelHead, Badge } from '@/components/ui'
import { dateTime } from '@/lib/format'

export type CampaignRow = {
  id: string
  title: string
  channel: string
  audience: string
  body: string
  source: string
  createdAt: string
}

/** Marketing copy the agents wrote from the real catalog. Copying is the only action. */
export function CampaignDrafts({ drafts }: { drafts: CampaignRow[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  return (
    <Panel>
      <PanelHead label="Materi promosi dari agen" aside={<Badge tone="neutral">{drafts.length} draf</Badge>} />
      <PanelBody>
        {drafts.length === 0 ? (
          <EmptyState
            title="Belum ada materi promosi"
            body="Jalankan agen pemasaran dan ia menulis draf promosi untuk setiap produk atau layanan yang sudah terbit."
          />
        ) : (
          <List>
            {drafts.map((draft) => (
              <li key={draft.id} className="flex flex-col gap-2 py-block first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="heading-tight text-[0.9375rem]">{draft.title}</p>
                    <p className="figure-note">
                      {draft.channel} · {draft.audience} · {dateTime(draft.createdAt)}
                    </p>
                  </div>
                  <Badge tone={draft.source.startsWith('ai:') ? 'signal' : 'neutral'}>
                    {draft.source.startsWith('ai:') ? 'Ditulis AI' : 'Template'}
                  </Badge>
                </div>
                <div className="inset-block">
                  <p className="whitespace-pre-line text-[0.8125rem] leading-relaxed text-ink">{draft.body}</p>
                </div>
                <div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      void navigator.clipboard.writeText(draft.body)
                      setCopiedId(draft.id)
                      window.setTimeout(() => setCopiedId(null), 2000)
                    }}
                  >
                    {copiedId === draft.id ? <FileText className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
                    {copiedId === draft.id ? 'Tersalin' : 'Salin teks'}
                  </Button>
                </div>
              </li>
            ))}
          </List>
        )}
      </PanelBody>
    </Panel>
  )
}
