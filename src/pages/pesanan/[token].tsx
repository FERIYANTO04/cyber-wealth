import { bankTransferInstructions } from '@/lib/bank-transfer'
import type { GetServerSideProps } from 'next'
import { StoreFrame } from '@/components/StoreFrame'
import { InlineNote, PageStack } from '@/components/ui'
import { OrderStatusPanel, type OrderDetail } from '@/components/OrderStatusPanel'
import { db } from '@/lib/db'
import { products } from '@/lib/db/schema'
import { getOrderByToken } from '@/lib/revenue'
import { eq } from 'drizzle-orm'
import { fileUrl } from '@/lib/storage'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const token = String(ctx.params?.token ?? '')
  const order = await getOrderByToken(token)
  if (!order) return { notFound: true }

  let downloadUrl: string | null = null
  let deliverableNote: string | null = null

  if (order.status === 'paid') {
    const [product] = await db.select().from(products).where(eq(products.id, order.productId)).limit(1)
    deliverableNote = product?.deliverableNote ?? null
    if (product?.slug === 'panduan-konten-media-sosial') {
      // This bundled product has a real PDF deliverable; the API route checks the
      // paid order token before streaming the file.
      downloadUrl = `/api/orders/download?token=${encodeURIComponent(token)}`
    } else if (product?.fileKey) {
      downloadUrl = await fileUrl(product.fileKey, { download: product.fileName ?? undefined }).catch(() => null)
    }
  }

  return {
    props: {
      order: {
        code: order.code,
        productName: order.productName,
        productSlug: order.productSlug,
        buyerName: order.buyerName,
        buyerEmail: order.buyerEmail,
        amountIdr: Number(order.amountIdr),
        status: order.status,
        provider: order.provider,
        invoiceUrl: order.invoiceUrl,
        paidAt: order.paidAt ? order.paidAt.toISOString() : null,
        createdAt: order.createdAt.toISOString(),
      } satisfies OrderDetail,
      downloadUrl,
      deliverableNote,
      paymentInstructions: bankTransferInstructions(order.code),
    },
  }
}

type Props = { order: OrderDetail; downloadUrl: string | null; deliverableNote: string | null; paymentInstructions: string }

function OrderPage({ order, downloadUrl, deliverableNote, paymentInstructions }: Props) {
  return (
    <PageStack>
      <OrderStatusPanel order={order} downloadUrl={downloadUrl} deliverableNote={deliverableNote} paymentInstructions={paymentInstructions} />
      <InlineNote>
        Simpan halaman ini. Alamatnya adalah kunci pesanan Anda dan hanya bisa dibuka oleh siapa pun yang memilikinya.
      </InlineNote>
    </PageStack>
  )
}

const Page = OrderPage as PageWithFrame<Props>
Page.getLayout = (page, props) => (
  <StoreFrame
    eyebrow="Status pesanan"
    title="Pesanan Anda"
    intent={`${props.order.productName} · ${props.order.code}`}
    back={{ href: '/toko', label: 'Kembali ke katalog' }}
  >
    {page}
  </StoreFrame>
)
export default Page
