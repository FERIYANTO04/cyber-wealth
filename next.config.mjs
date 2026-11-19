import path from 'node:path'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Baseline browser security headers for the public web app and API routes.
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'X-DNS-Prefetch-Control', value: 'off' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      ],
    }]
  },
  // The Dockerfile ships .next/standalone: only the modules the app imports.
  // Netlify's Next.js runtime needs the regular .next server output.
  // Keep standalone output for Docker/container deployments elsewhere.
  output: process.env.NETLIFY ? undefined : 'standalone',
  // The platform's build and preview own `.next`. A throwaway smoke-test dev
  // server sets NEXT_DIST_DIR so it writes somewhere else — `next dev` wipes and
  // rewrites its dist dir on startup, which would otherwise fail with EBUSY (or
  // corrupt the output) whenever it overlaps a platform build of the same tree.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // The preview runs behind the sandbox proxy/iframe. Allow cross-origin dev
  // requests from the proxy so HMR and asset requests are not rejected.
  allowedDevOrigins: ['*'],
  // The live preview IS a dev server, so Next's dev tools indicator would float
  // over the app the user is looking at and read as part of their product.
  devIndicators: false,
  // postgres-js is a pure-JS driver — keep it external so Next does not try to
  // bundle the database client into the server output.
  serverExternalPackages: ['postgres'],
  // Dev only: stamps DOM elements with data-loc="file:line:col" so the preview's
  // element picker can point the agent at the exact source line. `next build`
  // never runs it, so published HTML carries no such attributes.
  webpack(config, { dev }) {
    if (dev) {
      config.module.rules.unshift({
        test: /\.(jsx|tsx)$/,
        include: path.resolve('src'),
        enforce: 'pre',
        use: path.resolve('scripts/jsx-loc-loader.cjs'),
      })
    }
    return config
  },
}

export default nextConfig
