import type { GetServerSideProps } from 'next'
import { ConsoleFrame } from '@/components/ConsoleFrame'
import { ProductManager, type OwnerProduct } from '@/components/ProductManager'
import { OrderList, type OrderRow } from '@/components/OrderList'
import { PageStack } from '@/components/ui'
import { requireOwnerPage } from '@/lib/auth'
import { getOrderCounts, getOrders, getOwnerProducts } from '@/lib/revenue'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }

  const [products, orders, counts] = await Promise.all([getOwnerProducts(), getOrders(40), getOrderCounts()])

  return {
    props: {
      products: products.map(
        (row): OwnerProduct => ({
          id: row.id,
          slug: row.slug,
          name: row.name,
          summary: row.summary,
          category: row.category,
          priceIdr: Number(row.priceIdr),
          status: row.status,
          fileName: row.fileName,
          fileKey: row.fileKey,
        })
      ),
      orders: orders.map(
        (row): OrderRow => ({
          id: row.id,
          code: row.code,
          productName: row.productName,
          buyerName: row.buyerName,
          buyerEmail: row.buyerEmail,
          amountIdr: Number(row.amountIdr),
          status: row.status,
          provider: row.provider,
          paidAt: row.paidAt ? row.paidAt.toISOString() : null,
          createdAt: row.createdAt.toISOString(),
          refundedAt: row.refundedAt ? row.refundedAt.toISOString() : null,
        })
      ),
      counts,
    },
  }
}

type Props = {
  products: OwnerProduct[]
  orders: OrderRow[]
  counts: Awaited<ReturnType<typeof getOrderCounts>>
}

function ProdukPage({ products, orders, counts }: Props) {
  return (
    <PageStack>
      <ProductManager initial={products} />
      <OrderList orders={orders} counts={counts} />
    </PageStack>
  )
}

const Page = ProdukPage as PageWithFrame<Props>
Page.getLayout = (page) => (
  <ConsoleFrame
    eyebrow="Mesin 2 · Produk digital"
    title="Katalog produk"
    intent="Kelola produk digital, lampirkan berkas serahan, dan pantau pesanan masuk."
  >
    {page}
  </ConsoleFrame>
)
export default Page
