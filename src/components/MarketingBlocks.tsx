import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowRight, Check, ShieldCheck } from 'lucide-react'
import { Button, Panel, SignalLink } from '@/components/ui'

/** The landing page's opening statement: what this is, who it is for, and the one action. */
export function MarketingHero({
  eyebrow,
  headline,
  subhead,
  primary,
  secondary,
  proof,
}: {
  eyebrow: string
  headline: ReactNode
  subhead: string
  primary: { href: string; label: string }
  secondary: { href: string; label: string }
  proof: string[]
}) {
  return (
    <section className="flex flex-col gap-stack border-b border-line pb-section">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="heading-tight max-w-3xl text-[2rem] leading-[1.1] sm:text-[2.75rem] lg:text-[3.25rem]">
        {headline}
      </h1>
      <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-ink-quiet sm:text-base">{subhead}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Link href={primary.href} className="w-full sm:w-auto">
          <Button size="md" className="w-full sm:w-auto">
            {primary.label}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </Link>
        <Link href={secondary.href} className="w-full sm:w-auto">
          <Button variant="secondary" size="md" className="w-full sm:w-auto">
            {secondary.label}
          </Button>
        </Link>
      </div>
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
        {proof.map((item) => (
          <li key={item} className="flex items-center gap-1.5 text-xs text-ink-quiet">
            <Check className="size-3.5 shrink-0 text-signal" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** The heading above a marketing block. One size across the public front. */
function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="heading-tight text-[1.25rem] leading-tight sm:text-[1.5rem]">{children}</h2>
}

export type MarketingFeature = { title: string; body: string }

/** Three or four things the product does, each one sentence, no ornament. */
export function FeatureGrid({ features }: { features: MarketingFeature[] }) {
  return (
    <section className="flex flex-col gap-stack">
      <SectionHeading>Semua yang dibutuhkan untuk menjual, di satu tempat</SectionHeading>
      <div className="grid grid-cols-1 gap-block sm:grid-cols-2">
        {features.map((feature) => (
          <Panel key={feature.title}>
            <div className="flex flex-col gap-1.5 p-page">
              <p className="text-[0.875rem] font-medium text-ink">{feature.title}</p>
              <p className="text-[0.8125rem] leading-relaxed text-ink-quiet">{feature.body}</p>
            </div>
          </Panel>
        ))}
      </div>
    </section>
  )
}

/** How buying works, numbered because the steps really are ordered. */
export function HowItWorks({ steps }: { steps: { title: string; body: string }[] }) {
  return (
    <section className="flex flex-col gap-stack">
      <SectionHeading>Cara kerjanya</SectionHeading>
      <ol className="grid grid-cols-1 gap-block sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <li key={step.title} className="flex flex-col gap-1.5 border-t border-line pt-block">
            <span className="figure text-[0.75rem] text-signal">{String(index + 1).padStart(2, '0')}</span>
            <span className="text-[0.875rem] font-medium text-ink">{step.title}</span>
            <span className="text-[0.8125rem] leading-relaxed text-ink-quiet">{step.body}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** The closing call to action — one button, one sentence of reason. */
export function ClosingCta({
  headline,
  body,
  href,
  label,
}: {
  headline: string
  body: string
  href: string
  label: string
}) {
  return (
    <section className="flex flex-col items-start gap-3 border-t border-line pt-section">
      <SectionHeading>{headline}</SectionHeading>
      <p className="max-w-2xl text-[0.875rem] leading-relaxed text-ink-quiet">{body}</p>
      <Link href={href}>
        <Button size="md">
          {label}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </Link>
    </section>
  )
}

/** A plain, honest block of prose for the FAQ and the legal pages. */
export function ProseSection({
  title,
  paragraphs,
}: {
  title: string
  paragraphs: string[]
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="heading-tight text-base">{title}</h2>
      {paragraphs.map((paragraph) => (
        <p key={paragraph} className="max-w-prose text-[0.875rem] leading-relaxed text-ink-quiet">
          {paragraph}
        </p>
      ))}
    </section>
  )
}

/** A titled list of questions, so a page never assembles the heading itself. */
export function FaqSection({
  title,
  items,
}: {
  title: string
  items: { question: string; answer: string }[]
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="heading-tight text-base">{title}</h2>
      <FaqList items={items} />
    </section>
  )
}

/** Numbered questions that open where they are — no route, no modal. */
export function FaqList({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <div className="flex flex-col divide-y divide-line border-y border-line">
      {items.map((item) => (
        <details key={item.question} className="group py-block">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-[0.875rem] font-medium text-ink">
            {item.question}
            <span className="mt-0.5 shrink-0 font-mono text-xs text-ink-quiet group-open:hidden">+</span>
            <span className="mt-0.5 hidden shrink-0 font-mono text-xs text-ink-quiet group-open:block">−</span>
          </summary>
          <p className="mt-2 max-w-prose text-[0.8125rem] leading-relaxed text-ink-quiet">{item.answer}</p>
        </details>
      ))}
    </div>
  )
}

/** The contact page's promise beside its form, plus the one honest caveat. */
export function ContactIntro({ email }: { email: string | null }) {
  return (
    <Panel>
      <div className="flex flex-col gap-2 p-page">
        <p className="flex items-center gap-2 text-[0.875rem] font-medium text-ink">
          <ShieldCheck className="size-4 shrink-0 text-signal" aria-hidden="true" />
          Kami balas lewat email
        </p>
        <p className="text-[0.8125rem] leading-relaxed text-ink-quiet">
          Tulis pertanyaan Anda di formulir. Pesan tersimpan di aplikasi ini dan diteruskan ke pemilik, jadi tidak
          hilang meski pengiriman email belum diatur.
        </p>
        {email ? (
          <p className="text-[0.8125rem] leading-relaxed text-ink-quiet">
            Anda juga bisa menulis langsung ke <span className="text-ink">{email}</span>.
          </p>
        ) : (
          <p className="text-[0.8125rem] leading-relaxed text-ink-quiet">
            Alamat email kontak belum diisi pemilik; gunakan formulir di samping.
          </p>
        )}
        <SignalLink href="/faq">Lihat tanya jawab yang sering ditanyakan</SignalLink>
      </div>
    </Panel>
  )
}
