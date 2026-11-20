import type { GetServerSideProps } from 'next'
import { getSession } from '@/lib/auth'

/** Cyber Wealth is an owner-operated control room. Customer pages remain on their own routes. */
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getSession(ctx.req)
  return {
    redirect: {
      destination: session ? '/owner' : '/login?next=%2Fowner',
      permanent: false,
    },
  }
}

export default function Home() {
  return null
}
