import Head from 'next/head'
import type { ReactNode } from 'react'

/** Surface: sign-in and owner setup. One centred column, no navigation. */
export function GateFrame({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div data-frame="gate" className="flex min-h-screen flex-col bg-canvas">
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#F7F8F6" />
      </Head>
      <div className="flex flex-1 flex-col items-center px-page py-section">
        <div className="w-full max-w-[28rem]">
          <div className="mb-block flex items-center gap-2">
            <span className="brand-mark">CW</span>
            <span className="heading-tight text-sm">
              Cyber Wealth Autopilot
            </span>
          </div>
          <div className="h-px w-full bg-line" />
          {children}
        </div>
      </div>
    </div>
  )
}
