import type { AppProps } from 'next/app'
import { Inter, Sora, IBM_Plex_Mono } from 'next/font/google'
import '@/styles/global.css'
import { PlaygroundBridge } from '@/components/PlaygroundBridge'
import type { PageWithFrame } from '@/lib/frame'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const sora = Sora({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-sora' })
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
})

const isPlayground = process.env.NEXT_PUBLIC_IS_PLAYGROUND === 'true'

// The bridge stays outside the frame: a frame that remounts on navigation must not
// take the preview connection with it.
export default function App({ Component, pageProps }: AppProps & { Component: PageWithFrame }) {
  const frame = Component.getLayout ?? ((page) => page)
  return (
    <div className={`${inter.variable} ${sora.variable} ${plexMono.variable} font-sans antialiased`}>
      {frame(<Component {...pageProps} />, pageProps)}
      {isPlayground && <PlaygroundBridge />}
    </div>
  )
}
