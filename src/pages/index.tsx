import type { GetServerSideProps } from 'next'
import { getSession } from '@/lib/auth'

/**
 * Public visitors land directly in the digital-products storefront.
 * Authenticated owners retain the private operations dashboard.
 */
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getSession(ctx.req)
  return {
    redirect: {
      destination: session ? '/owner' : '/toko',
      permanent: false,
    },
  }
}

export default function Home() {
  return null
}
