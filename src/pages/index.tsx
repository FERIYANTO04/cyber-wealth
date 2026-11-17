import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import { sql } from 'drizzle-orm'
import { LandingIntro } from '@/components/LandingIntro'
import { db } from '@/lib/db'
import { ownerAccount } from '@/lib/db/schema'

export const getServerSideProps: GetServerSideProps = async () => {
  const rows = await db.select({ n: sql<number>`count(*)::int` }).from(ownerAccount)
  return { props: { needsSetup: (rows[0]?.n ?? 0) === 0 } }
}

export default function Home({ needsSetup }: { needsSetup: boolean }) {
  return (
    <div className="min-h-screen bg-canvas">
      <Head>
        <title>Cyber Wealth Autopilot — Ruang Kendali Bisnis AI</title>
        <meta name="description" content="Ruang kendali Cyber Wealth: pantau keuangan, agen AI, aktivitas, dan persetujuan owner." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="mx-auto w-full max-w-5xl px-page pb-section pt-section">
        <LandingIntro needsSetup={needsSetup} />
      </main>
    </div>
  )
}
