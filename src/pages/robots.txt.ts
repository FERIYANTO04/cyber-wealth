import type { GetServerSideProps } from 'next'

/** Public pages are welcome; everything behind a login and every API stays out. */
export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const host = String(req.headers['x-forwarded-host'] ?? req.headers.host ?? '')
  const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? 'https'
  const base = host ? `${proto}://${host}` : ''

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.write(
    [
      'User-agent: *',
      'Disallow: /api/',
      'Disallow: /dashboard',
      'Disallow: /approvals',
      'Disallow: /autopilot',
      'Disallow: /agents',
      'Disallow: /jasa-admin',
      'Allow: /jasa/',
      'Allow: /langganan/',
      'Disallow: /produk',
      'Disallow: /affiliate',
      'Disallow: /admin/',
      'Disallow: /saas-admin',
      'Disallow: /billing',
      'Disallow: /email',
      'Disallow: /finance',
      'Disallow: /revenue',
      'Disallow: /social',
      'Disallow: /facebook',
      'Disallow: /instagram',
      'Disallow: /integrasi',
      'Disallow: /activity',
      'Disallow: /settings',
      'Disallow: /member',
      'Disallow: /pesanan/',
      'Disallow: /langganan/status/',
      base ? `Sitemap: ${base}/sitemap.xml` : 'Sitemap: /sitemap.xml',
      '',
    ].join('\n')
  )
  res.end()
  return { props: {} }
}

export default function Robots() {
  return null
}
