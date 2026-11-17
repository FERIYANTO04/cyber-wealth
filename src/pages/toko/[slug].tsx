import type { GetServerSideProps } from 'next'
import { StoreFrame } from '@/components/StoreFrame'
import { CheckoutForm } from '@/components/CheckoutForm'
import { PageStack, Panel, PanelBody, PanelHead } from '@/components/ui'
import { ProductSummary } from '@/components/ProductSummary'
import { getPublishedProduct } from '@/lib/revenue'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const slug = String(ctx.params?.slug ?? '')
  const product = await getPublishedProduct(slug)
  if (!product) return { notFound: true }
  return {
    props: {
      product: {
        slug: product.slug,
        name: product.name,
        summary: product.summary,
        description: product.description,
        category: product.category,
        priceIdr: Number(product.priceIdr),
        deliverableNote: product.deliverableNote,
        hasFile: Boolean(product.fileKey),
      },
    },
  }
}

type Props = {
  product: {
    slug: string
    name: string
    summary: string
    description: string
    category: string
    priceIdr: number
    deliverableNote: string | null
    hasFile: boolean
  }
}

function ProductPage({ product }: Props) {
  return (
    <PageStack>
      <ProductSummary
        priceIdr={product.priceIdr}
        hasFile={product.hasFile}
        description={product.description}
        deliverableNote={product.deliverableNote}
      />
      <Panel>
        <PanelHead label={product.priceIdr === 0 ? 'Ambil produk' : 'Beli produk'} />
        <PanelBody>
          <CheckoutForm slug={product.slug} priceIdr={product.priceIdr} />
        </PanelBody>
      </Panel>
    </PageStack>
  )
}

const Page = ProductPage as PageWithFrame<Props>
Page.getLayout = (page, props) => (
  <StoreFrame
    eyebrow="Produk digital"
    title={props.product.name}
    intent={props.product.summary}
    back={{ href: '/toko', label: 'Semua produk' }}
  >
    {page}
  </StoreFrame>
)
export default Page
