import type { ReactNode } from 'react'

/**
 * Model answers arrive with light markdown — bold labels and dash bullets. This turns
 * those two shapes into real elements so nothing shows raw asterisks, and it does it by
 * building React nodes rather than injecting HTML.
 */
export function RichText({ text }: { text: string }) {
  const lines = text.split('\n')

  return (
    <>
      {lines.map((line, index) => {
        const trimmed = line.trim()
        if (!trimmed) return <span key={index} className="block h-2" aria-hidden="true" />
        const match = trimmed.match(/^([-*•]|\d+[.)])\s+(.*)$/)
        if (match) {
          return (
            <span key={index} className="flex gap-1.5">
              <span aria-hidden="true" className="shrink-0 text-ink-quiet">
                {/^\d/.test(match[1]!) ? match[1] : '•'}
              </span>
              <span className="min-w-0">{inlineBody(match[2] ?? '')}</span>
            </span>
          )
        }
        return (
          <span key={index} className="block">
            {inlineBody(trimmed)}
          </span>
        )
      })}
    </>
  )
}

/** `**bold**` becomes a strong span; everything else stays literal text. */
function inlineBody(text: string): ReactNode[] {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} className="font-semibold text-ink">
        {part}
      </strong>
    ) : (
      <span key={index}>{part}</span>
    )
  )
}
