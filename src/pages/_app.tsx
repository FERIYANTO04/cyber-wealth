import type { AppProps } from 'next/app'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import '@/styles/global.css'
import { PlaygroundBridge } from '@/components/PlaygroundBridge'
import type { PageWithFrame } from '@/lib/frame'

const isPlayground = process.env.NEXT_PUBLIC_IS_PLAYGROUND === 'true'

// The bridge stays outside the frame: a frame that remounts on navigation must not
// take the preview connection with it.
export default function App({ Component, pageProps }: AppProps & { Component: PageWithFrame }) {
  const frame = Component.getLayout ?? ((page) => page)
  const router = useRouter()
  useEffect(() => {
    if (!router.isReady) return
    const path = router.asPath.split('?')[0]
    if (/^\\/(owner|login|talent-admin|api)(\\/|$)/i.test(path)) return
    void fetch('/api/analytics/view', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path }), keepalive: true, credentials: 'same-origin' }).catch(() => undefined)
  }, [router.isReady, router.asPath])
  return (
    <div className="font-sans antialiased">
      {frame(<Component {...pageProps} />, pageProps)}
      {isPlayground && <PlaygroundBridge />}
    </div>
  )
}
