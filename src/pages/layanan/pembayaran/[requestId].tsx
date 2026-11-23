import { useState } from 'react'
import { useRouter } from 'next/router'
import { StoreFrame } from '@/components/StoreFrame'
import { PageStack } from '@/components/ui'
import type { PageWithFrame } from '@/lib/frame'

function ServicePaymentPage() {
  const router = useRouter()
  const requestId = typeof router.query.requestId === 'string' ? router.query.requestId : ''
  const returned = router.query.status === 'returned'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function continueToPayment() {
    if (!requestId || loading) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/services/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.paymentUrl) {
        throw new Error(payload.error || 'Pembayaran belum dapat diproses. Silakan hubungi tim Cyber Wealth.')
      }
      window.location.assign(payload.paymentUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kendala. Silakan coba kembali.')
      setLoading(false)
    }
  }

  return (
    <PageStack>
      <section className="mx-auto w-full max-w-2xl rounded-3xl border border-white/10 bg-[#111214] p-7 text-white shadow-2xl sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">Cyber Wealth · Secure Checkout</p>
        {returned ? (
          <>
            <h1 className="mt-5 text-2xl font-semibold">Pembayaran sedang diverifikasi</h1>
            <p className="mt-3 text-sm leading-7 text-white/65">Kami sedang menunggu konfirmasi resmi dari penyedia pembayaran. Status pesanan hanya akan berubah setelah transaksi terverifikasi.</p>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-2xl font-semibold">Lanjutkan pesanan layanan Anda</h1>
            <p className="mt-3 text-sm leading-7 text-white/65">Periksa kembali penawaran yang dikirim Cyber Wealth melalui email. Setelah Anda melanjutkan, Anda akan diarahkan ke halaman pembayaran resmi Midtrans.</p>
            <button
              type="button"
              onClick={continueToPayment}
              disabled={!requestId || loading}
              className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-amber-300 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Menyiapkan pembayaran…' : 'Lanjutkan ke pembayaran aman'}
            </button>
            {error ? <p role="alert" className="mt-4 text-sm text-red-300">{error}</p> : null}
          </>
        )}
        <p className="mt-7 border-t border-white/10 pt-5 text-xs leading-6 text-white/45">Cyber Wealth tidak akan memulai produksi premium sebelum pembayaran terkonfirmasi. Jangan bagikan tautan pribadi ini kepada orang lain.</p>
      </section>
    </PageStack>
  )
}

const Page = ServicePaymentPage as PageWithFrame
Page.getLayout = (page) => (
  <StoreFrame eyebrow="Pembayaran aman" title="Secure checkout" intent="Layanan profesional Cyber Wealth" back={{ href: '/', label: 'Kembali ke beranda' }}>
    {page}
  </StoreFrame>
)

export default Page
