import type { GetServerSideProps } from 'next'
import { StoreFrame } from '@/components/StoreFrame'
import { InlineNote, PageStack } from '@/components/ui'
import { OrderStatusPanel, type OrderDetail } from '@/components/OrderStatusPanel'
import { db } from '@/lib/db'
import { products } from '@/lib/db/schema'
import { getOrderByToken } from '@/lib/revenue'
import { eq } from 'drizzle-orm'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const token = String(ctx.params?.token ?? '')
  const order = await getOrderByToken(token)
  if (!order) return { notFound: true }

  let downloadUrl: string | null = null
  let deliverableNote: string | null = null
  const bankTransfer = order.provider === 'manual_transfer' ? {
    bankName: process.env.BANK_NAME?.trim() ?? '',
    accountName: process.env.BANK_ACCOUNT_NAME?.trim() ?? '',
    accountNumber: process.env.BANK_ACCOUNT_NUMBER?.trim() ?? '',
    instructions: process.env.BANK_TRANSFER_INSTRUCTIONS?.trim() ?? '',
  } : null

  if (order.status === 'paid') {
    const [product] = await db.select().from(products).where(eq(products.id, order.productId)).limit(1)
    deliverableNote = product?.deliverableNote ?? null
    if (product?.fileKey || product?.slug === 'panduan-konten-media-sosial') {
      // All paid digital products use the same token-gated download endpoint.
      // The endpoint verifies paid status and streams the private object-store file.
      downloadUrl = `/api/orders/download?token=${encodeURIComponent(token)}`
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
      bankTransfer,
    },
  }
}

type Props = { order: OrderDetail; downloadUrl: string | null; deliverableNote: string | null; bankTransfer: { bankName: string; accountName: string; accountNumber: string; instructions: string } | null }

function OrderPage({ order, downloadUrl, deliverableNote, bankTransfer }: Props) {
  return (
    <PageStack>
      <OrderStatusPanel order={order} downloadUrl={downloadUrl} deliverableNote={deliverableNote} bankTransfer={bankTransfer} />
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
