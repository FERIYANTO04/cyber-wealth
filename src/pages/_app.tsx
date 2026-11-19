import type { AppProps } from 'next/app'
import '@/styles/global.css'
import { PlaygroundBridge } from '@/components/PlaygroundBridge'
import type { PageWithFrame } from '@/lib/frame'

const isPlayground = process.env.NEXT_PUBLIC_IS_PLAYGROUND === 'true'

// The bridge stays outside the frame: a frame that remounts on navigation must not
// take the preview connection with it.
export default function App({ Component, pageProps }: AppProps & { Component: PageWithFrame }) {
  const frame = Component.getLayout ?? ((page) => page)
  return (
    <div className="font-sans antialiased">
      {frame(<Component {...pageProps} />, pageProps)}
      {isPlayground && <PlaygroundBridge />}
    </div>
  )
}
