import type { GetServerSideProps } from 'next'
import { getSession } from '@/lib/auth'

/**
 * Public visitors should land on the customer-facing service catalog.
 * Authenticated owners retain the private operations dashboard.
 */
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getSession(ctx.req)
  return {
    redirect: {
      destination: session ? '/owner' : '/jasa',
      permanent: false,
    },
  }
}

export default function Home() {
  return null
}
