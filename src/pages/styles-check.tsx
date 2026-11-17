import { Layout } from '@/components/Layout'

export const getStaticProps = () =>
  process.env.NODE_ENV === 'production' ? { notFound: true as const } : { props: {} }

export default function StylesCheck() {
  return (
    <Layout title="Styles check">
      <main className="mx-auto max-w-xl px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Styles check</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Every swatch is green when Tailwind compiled it and red when it emitted nothing.
        </p>

        <ul className="mt-8 space-y-3">
          <li className="flex items-center gap-4">
            <span data-check className="h-10 w-28 rounded-md bg-emerald-600" />
            <code className="text-sm">bg-emerald-600</code>
          </li>
          <li className="flex items-center gap-4">
            <span data-check className="h-10 w-28 rounded-md bg-emerald-600/30" />
            <code className="text-sm">bg-emerald-600/30</code>
            <span className="text-sm text-zinc-500">pale green</span>
          </li>
          <li className="flex items-center gap-4">
            <span data-check className="h-10 w-28 rounded-md bg-[#0f9b62]" />
            <code className="text-sm">bg-[#0f9b62]</code>
          </li>
          <li className="flex items-center gap-4">
            <span data-check className="h-10 w-28 rounded-md bg-emerald-600 dark:bg-red-600" />
            <code className="text-sm">dark:bg-red-600</code>
            <span className="text-sm text-zinc-500">stays green in a dark OS</span>
          </li>
        </ul>

        <div className="mt-6 rounded-md bg-zinc-100 p-4">
          Text with no color of its own, on a surface — must stay readable.
        </div>
      </main>
    </Layout>
  )
}
