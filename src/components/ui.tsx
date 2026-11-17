import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import Link from 'next/link'
import { Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Panel({
  children,
  className,
  ...rest
}: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section className={cn('panel-frame', className)} {...rest}>
      {children}
    </section>
  )
}

export function PanelHead({ label, aside }: { label: ReactNode; aside?: ReactNode }) {
  return (
    <header className="panel-head-row">
      <h2 className="font-display text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-ink-quiet">
        {label}
      </h2>
      {aside}
    </header>
  )
}

export function PanelBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-stack px-page py-stack', className)}>{children}</div>
}

export function List({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-line">{children}</ul>
}

export function SourceTag({ source }: { source: 'live' | 'demo' }) {
  if (source === 'live') {
    return (
      <span className="tag-shape border-signal/30 bg-signal-soft text-signal">
        <span className="size-1 rounded-full bg-signal" aria-hidden="true" />
        Live
      </span>
    )
  }
  return (
    <span className="tag-shape border-hold/30 bg-hold-soft text-hold">
      <span className="size-1 rounded-full bg-hold" aria-hidden="true" />
      Demo
    </span>
  )
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'signal' | 'hold' | 'danger'
}) {
  const tones = {
    neutral: 'border-line bg-canvas text-ink-quiet',
    signal: 'border-signal/30 bg-signal-soft text-signal',
    hold: 'border-hold/30 bg-hold-soft text-hold',
    danger: 'border-danger/30 bg-danger/10 text-danger',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6875rem] font-medium',
        tones[tone]
      )}
    >
      {children}
    </span>
  )
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'md' | 'sm'
}) {
  const variants = {
    primary: 'bg-signal text-white hover:bg-signal/90 disabled:bg-signal/50',
    secondary: 'border border-line bg-surface text-ink hover:bg-canvas disabled:text-ink-quiet',
    ghost: 'text-ink-quiet hover:bg-canvas hover:text-ink',
    danger: 'border border-danger/40 bg-surface text-danger hover:bg-danger/10',
  }
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed',
        size === 'md' ? 'min-h-10 px-4 text-sm' : 'min-h-8 px-3 text-[0.8125rem]',
        variants[variant],
        className
      )}
      {...rest}
    />
  )
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[0.8125rem] font-medium text-ink">{label}</span>
      {children}
      {hint && !error && <span className="text-xs text-ink-quiet">{hint}</span>}
      {error && (
        <span className="text-xs font-medium text-danger" role="alert">
          {error}
        </span>
      )}
    </label>
  )
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'field',
        className
      )}
      {...rest}
    />
  )
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-start gap-2 px-page py-section">
      <p className="heading-tight text-sm">{title}</p>
      <p className="max-w-prose text-[0.8125rem] leading-relaxed text-ink-quiet">{body}</p>
      {action}
    </div>
  )
}

export function Stat({
  label,
  value,
  context,
  source,
  tone,
}: {
  label: string
  value: ReactNode
  context?: ReactNode
  source?: 'live' | 'demo'
  tone?: 'default' | 'signal' | 'danger'
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="eyebrow">{label}</span>
        {source && <SourceTag source={source} />}
      </div>
      <span
        className={cn(
          'figure text-[1.375rem] leading-tight tracking-tight',
          tone === 'signal' && 'text-signal',
          tone === 'danger' && 'text-danger'
        )}
      >
        {value}
      </span>
      {context && <span className="text-xs leading-snug text-ink-quiet">{context}</span>}
    </div>
  )
}

/** The heading row above a block of panels — a title plus an optional link through. */
export function SectionHead({
  title,
  link,
}: {
  title: string
  link?: { href: string; label: string }
}) {
  return (
    <div className="flex items-end justify-between gap-2">
      <h2 className="heading-tight text-base">{title}</h2>
      {link && (
        <SignalLink href={link.href}>{link.label}</SignalLink>
      )}
    </div>
  )
}

/** An inline link through to another page, in the one signal treatment. */
export function SignalLink({
  href,
  children,
  className,
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  return (
    <Link href={href} className={cn('link-signal', className)}>
      {children}
    </Link>
  )
}

/** A labelled block inside a panel body. */
export function InfoRow({
  title,
  body,
  aside,
}: {
  title: ReactNode
  body?: ReactNode
  aside?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-[0.8125rem] font-medium text-ink">{title}</p>
        {body && <div className="mt-0.5 max-w-prose text-xs leading-relaxed text-ink-quiet">{body}</div>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  )
}

/** Filter chips. `options` values are matched against `value`. */
export function ChoiceChips<V extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: V
  options: { value: V; label: string }[]
  onChange: (next: V) => void
  label: string
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            'chip',
            value === option.value
              ? 'border-signal bg-signal-soft text-signal'
              : 'border-line bg-surface text-ink-quiet hover:text-ink'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/** Two-to-four mutually exclusive views over the same list. */
export function Segmented<V extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: V
  options: { value: V; label: string }[]
  onChange: (next: V) => void
  label: string
}) {
  return (
    <div className="inline-flex rounded-md border border-line bg-surface p-0.5" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            'min-h-8 rounded px-3 text-[0.8125rem] font-medium transition-colors',
            value === option.value ? 'bg-signal-soft text-signal' : 'text-ink-quiet hover:text-ink'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/** Search box for lists that outgrow a screen. */
export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (next: string) => void
  placeholder: string
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="field min-h-9 text-[0.8125rem] sm:max-w-xs"
    />
  )
}

/** A quiet count in mono, for list totals and aside figures. */
export function CountNote({ children }: { children: ReactNode }) {
  return <span className="figure-note">{children}</span>
}

/** The page rhythm: one vertical stack with the named section gap. */
export function PageStack({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-stack">{children}</div>
}

/** A responsive grid of blocks; `columns` is the count from `md` up. */
export function BlockGrid({
  children,
  columns = 2,
}: {
  children: ReactNode
  columns?: 2 | 3 | 4
}) {
  const map = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-2 xl:grid-cols-3',
    4: 'grid-cols-2 xl:grid-cols-4',
  }
  return <div className={cn('grid grid-cols-1 gap-block', map[columns])}>{children}</div>
}

/** A titled column of blocks, for dashboards that pair two lists side by side. */
export function BlockColumn({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-block">{children}</div>
}

/** Pairs two block columns on wide screens and stacks them on a phone. */
export function PairColumns({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-stack lg:grid-cols-2">{children}</div>
}

/** A right-aligned action bar above a list. */
export function Toolbar({ children, align = 'end' }: { children: ReactNode; align?: 'start' | 'end' }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', align === 'end' ? 'justify-end' : 'justify-start')}>
      {children}
    </div>
  )
}

/** A bordered card used inside grids — one idea per card, with its own footer. */
export function Card({
  children,
  footer,
}: {
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="panel-frame flex flex-col justify-between">
      <div className="flex flex-col gap-2 p-page">{children}</div>
      {footer && <div className="border-t border-line px-page py-block">{footer}</div>}
    </div>
  )
}

export function Select({
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select className={cn('field min-h-10', className)} {...rest}>
      {children}
    </select>
  )
}

export function Textarea({
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn('field py-2', className)} {...rest} />
}

/** A boxed, standing notice that needs to be read — not a passing inline note. */
export function Notice({
  tone = 'quiet',
  icon,
  children,
}: {
  tone?: 'quiet' | 'hold' | 'danger' | 'signal'
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'message-box flex items-start gap-2',
        tone === 'hold' && 'border-hold/30 bg-hold-soft',
        tone === 'danger' && 'border-danger/30 bg-danger/10',
        tone === 'signal' && 'border-signal/30 bg-signal-soft',
        tone === 'quiet' && 'border-line bg-canvas'
      )}
    >
      {icon}
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/** A short inline note — status text beside a button, never a modal. */
export function InlineNote({ tone = 'quiet', children }: { tone?: 'quiet' | 'danger' | 'signal'; children: ReactNode }) {
  return (
    <span
      role="status"
      className={cn(
        'text-xs leading-relaxed',
        tone === 'danger' && 'text-danger',
        tone === 'signal' && 'text-signal',
        tone === 'quiet' && 'text-ink-quiet'
      )}
    >
      {children}
    </span>
  )
}

/** A value the owner copies into another dashboard — a callback address, an app ID. */
export function CopyValue({
  label,
  value,
  copyLabel,
}: {
  label: string
  value: string
  copyLabel?: string
}) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex flex-col gap-1">
      <span className="eyebrow">{label}</span>
      <div className="flex items-stretch gap-1.5">
        <code className="copy-value">{value}</code>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            void navigator.clipboard.writeText(value)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 2000)
          }}
          aria-label={copyLabel ?? `Salin ${label}`}
        >
          <Copy className="size-3.5" aria-hidden="true" />
          {copied ? 'Tersalin' : 'Salin'}
        </Button>
      </div>
    </div>
  )
}
