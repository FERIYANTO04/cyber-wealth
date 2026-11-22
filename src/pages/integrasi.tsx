import type { GetServerSideProps } from 'next'

/** Owner no longer has to configure external accounts from the console. */
export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: { destination: '/dashboard', permanent: false },
})

export default function IntegrasiPage() {
  return null
}
