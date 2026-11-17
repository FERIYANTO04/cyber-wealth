import { ProductCard, type StoreProduct } from '@/components/ProductCard'
import { EmptyState, Panel, SignalLink } from '@/components/ui'

/** The public grid, with an empty state that points the owner at their own catalog. */
export function ProductCatalog({ products, isOwner }: { products: StoreProduct[]; isOwner: boolean }) {
  if (products.length === 0) {
    return (
      <Panel>
        <EmptyState
          title="Belum ada produk yang dijual"
          body={
            isOwner
              ? 'Tambahkan produk pertama dari katalog saya, lampirkan berkasnya, lalu terbitkan agar muncul di halaman ini.'
              : 'Katalog sedang disiapkan. Silakan kembali lagi nanti.'
          }
          action={
            isOwner ? (
              <SignalLink href="/produk">Buka katalog produk saya</SignalLink>
            ) : undefined
          }
        />
      </Panel>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-block sm:grid-cols-2">
      {products.map((product) => (
        <ProductCard key={product.slug} product={product} />
      ))}
    </div>
  )
}
