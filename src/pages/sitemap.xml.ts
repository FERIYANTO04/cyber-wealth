import type { GetServerSideProps } from 'next'
import { getPublishedPlans } from '@/lib/saas'
import { getStoreProducts } from '@/lib/revenue'
import { getPublishedServices } from '@/lib/services'

/** The pages a search engine should index: the public storefront only. */
function urlSet(base: string, paths: string[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths
  .map((path) => `  <url><loc>${base}${path}</loc></url>`)
  .join('\n')}
</urlset>`
}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const host = String(req.headers['x-forwarded-host'] ?? req.headers.host ?? '')
  const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? 'https'
  const base = host ? `${proto}://${host}` : ''

  const [products, plans, services] = await Promise.all([
    getStoreProducts(),
    getPublishedPlans(),
    getPublishedServices(),
  ])
  const paths = [
    '/',
    '/toko',
    '/jasa',
    '/harga',
    '/faq',
    '/contoh-konten-umkm',
    '/kontak',
    '/privasi',
    '/syarat',
    ...products.map((product) => `/toko/${product.slug}`),
    ...plans.map((plan) => `/langganan/paket/${plan.code}`),
    ...services.map((service) => `/jasa/${service.slug}`),
  ]

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.write(urlSet(base, [...new Set(paths)]))
  res.end()
  return { props: {} }
}

export default function Sitemap() {
  return null
}
