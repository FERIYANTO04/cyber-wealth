import type { GetServerSideProps } from 'next'
import { ProductCatalog } from '@/components/ProductCatalog'
import { StoreFrame } from '@/components/StoreFrame'
import { SignalLink } from '@/components/ui'
import { getStoreProducts } from '@/lib/revenue'
import { getSession } from '@/lib/auth'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const [rows, session] = await Promise.all([getStoreProducts(), getSession(ctx.req)])
  return {
    props: {
      isOwner: Boolean(session),
      products: rows.map((row) => ({
        slug: row.slug,
        name: row.name,
        summary: row.summary,
        category: row.category,
        priceIdr: Number(row.priceIdr),
      })),
    },
  }
}

type Props = {
  isOwner: boolean
  products: { slug: string; name: string; summary: string; category: string; priceIdr: number }[]
}

function StorePage({ products, isOwner }: Props) {
  return <ProductCatalog products={products} isOwner={isOwner} />
}

const Page = StorePage as PageWithFrame<Props>
Page.getLayout = (page, props) => (
  <StoreFrame
    eyebrow="Katalog produk digital"
    title="Produk digital siap pakai"
    intent="Template, panduan, dan materi bisnis yang bisa Anda unduh segera setelah pembayaran terkonfirmasi."
    actions={
      props.isOwner ? (
        <SignalLink href="/produk">Kelola katalog</SignalLink>
      ) : undefined
    }
  >
    {page}
  </StoreFrame>
)
export default Page
