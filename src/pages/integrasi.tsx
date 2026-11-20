import type { GetServerSideProps } from 'next'
import { ConsoleFrame } from '@/components/ConsoleFrame'
import { ActivationSummary, IntegrationGuide, type CheckState, type ServiceCard } from '@/components/IntegrationGuide'
import { PageStack } from '@/components/ui'
import { SchedulerGuide } from '@/components/SchedulerGuide'
import { requireOwnerPage } from '@/lib/auth'
import { aiConfig, storageStatus, testPaddle } from '@/lib/integrations'
import { isPlaceholder } from '@/lib/env'
import { emailConfig } from '@/lib/email'
import { telegramConnectionStatus } from '@/lib/telegram'
import { getEngineCounts } from '@/lib/data'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }

  const host = String(ctx.req.headers['x-forwarded-host'] ?? ctx.req.headers.host ?? '')
  const proto = (ctx.req.headers['x-forwarded-proto'] as string | undefined) ?? 'https'
  const ai = aiConfig()
  const email = emailConfig()
  const storage = await storageStatus()
  const paddle = await testPaddle(`https://${host}/api/webhooks/paddle`)
  const telegram = await telegramConnectionStatus()
  const engines = await getEngineCounts()

  const aiState: CheckState = isPlaceholder(ai.key) ? 'missing' : 'unverified'
  const emailState: CheckState = isPlaceholder(email.key) || isPlaceholder(email.from) ? 'missing' : 'unverified'

  const cards: ServiceCard[] = [
    {
      key: 'ai',
      title: 'Model AI',
      summary: `Agen menjalankan analisis dan menyiapkan pekerjaan bisnis melalui ${ai.model}.`,
      state: aiState,
      message: aiState === 'unverified'
        ? `Kredensial tersedia untuk ${ai.baseUrl}, tetapi belum terbukti menjawab. Tekan Uji koneksi.`
        : 'Koneksi model AI belum aktif. Agen yang membutuhkan model akan mencatat kegagalan, bukan mengarang hasil.',
      required: ['Kredensial penyedia model AI', 'AI_BASE_URL dan AI_MODEL sesuai penyedia'],
      steps: [
        'Gunakan API key dari penyedia model AI yang benar-benar aktif.',
        'Simpan kredensial hanya di Railway Production.',
        'Pastikan alamat API dan nama model cocok.',
        'Tekan Uji koneksi untuk memeriksa respons langsung.',
      ],
      where: 'Kredensial hanya disimpan di server dan tidak dikirim ke browser.',
      testable: true,
    },
    {
      key: 'email',
      title: 'Email transaksional',
      summary: 'Mengirim konfirmasi pesanan, pengiriman produk, pengingat langganan, dan pemberitahuan owner.',
      state: emailState,
      message: emailState === 'unverified'
        ? `Kunci email dan alamat pengirim tersedia (${email.from}), tetapi pengiriman belum diverifikasi.`
        : 'Penyedia email belum terhubung. Email tercatat di kotak keluar, tetapi belum benar-benar terkirim.',
      required: ['EMAIL_API_KEY', 'EMAIL_FROM'],
      steps: [
        'Gunakan penyedia email transaksional dan buat API key.',
        'Verifikasi domain pengirim di dashboard penyedia.',
        'Simpan EMAIL_API_KEY dan EMAIL_FROM di Railway Production.',
        'Tekan Uji koneksi.',
      ],
      where: 'Email dikirim dari server aplikasi. Kunci tidak pernah ditampilkan kepada pengunjung.',
      testable: true,
    },
    {
      key: 'paddle',
      title: 'Paddle — satu-satunya payment gateway',
      summary: 'Membuat checkout dan menerima konfirmasi pembayaran melalui webhook Paddle yang diverifikasi.',
      state: paddle.state,
      message: paddle.message,
      required: ['PADDLE_API_KEY', 'PADDLE_WEBHOOK_SECRET', 'PADDLE_ENV'],
      steps: [
        'Pastikan API key dan webhook secret berasal dari lingkungan yang sama (Sandbox atau Live).',
        'Daftarkan endpoint webhook: ' + `https://${host}/api/webhooks/paddle`,
        'Pilih event transaction.completed dan transaction.paid.',
        'Tekan Uji koneksi. Pemeriksaan ini tidak membuat transaksi atau menarik uang.',
      ],
      where: 'Pesanan hanya menjadi lunas setelah webhook Paddle lolos verifikasi tanda tangan.',
      copyValue: { label: 'URL webhook Paddle', value: `https://${host}/api/webhooks/paddle` },
      testable: true,
    },
    {
      key: 'telegram',
      title: 'Telegram — kanal publikasi tanpa Meta',
      summary: 'Menerbitkan konten yang disetujui owner ke kanal Telegram melalui Bot API.',
      state: telegram.state,
      message: telegram.message,
      required: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'],
      steps: [
        'Buat bot melalui @BotFather dan salin tokennya.',
        'Tambahkan bot ke kanal Telegram sebagai admin dengan izin mengirim pesan.',
        'Simpan TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID di Railway Production.',
        'Tekan Uji koneksi. Pemeriksaan hanya memeriksa identitas bot dan hak admin; tidak mengirim pesan.',
      ],
      where: 'Token hanya dibaca server. Konten baru diterbitkan setelah disetujui dan dijadwalkan.',
      testable: true,
    },
    {
      key: 'storage',
      title: 'Penyimpanan berkas privat',
      summary: 'Menyimpan file produk digital untuk diunduh pembeli setelah pembayaran dikonfirmasi.',
      state: storage.state as CheckState,
      message: storage.state === 'ready'
        ? storage.message
        : 'Penyimpanan belum menjawab. File produk tidak dapat diunggah sampai layanan siap.',
      required: ['Object Storage endpoint', 'Access key dan secret key', 'Nama bucket'],
      steps: [
        'Penyimpanan berkas berjalan melalui layanan Object Storage yang terhubung ke aplikasi.',
        'Uji koneksi akan membuat lalu menghapus file pemeriksaan.',
        'Pastikan status koneksi aktif sebelum menerbitkan produk digital.',
      ],
      where: 'File produk disimpan privat dan tautan unduhan dibuat sementara.',
      testable: true,
    },
  ]

  const readyCount = cards.filter((card) => card.state === 'ready').length
  const blockers: string[] = []
  blockers.push('Koneksi model AI perlu lulus uji langsung.')
  blockers.push('Pengiriman email transaksional perlu lulus uji langsung.')
  if (telegram.state !== 'ready') blockers.push('Telegram belum terhubung sebagai kanal publikasi non-Meta.')
  if (engines.products === 0) blockers.push('Belum ada produk digital yang terbit.')
  if (engines.services === 0) blockers.push('Belum ada layanan jasa yang terbit.')
  if (engines.plans === 0) blockers.push('Belum ada paket langganan yang terbit.')
  if (paddle.state !== 'ready') blockers.push('Checkout Paddle belum terverifikasi; transaksi tidak boleh dianggap berhasil.')
  if (storage.state !== 'ready') blockers.push('Penyimpanan file privat belum lulus uji.')

  const endpoint = `${proto}://${host}/api/cron/autopilot`
  const schedulerConfigured = !isPlaceholder(process.env.CRON_SECRET) && (process.env.CRON_SECRET?.length ?? 0) >= 32

  return { props: { cards, readyCount, blockers, endpoint, schedulerConfigured } }
}

type Props = {
  cards: ServiceCard[]
  readyCount: number
  blockers: string[]
  endpoint: string
  schedulerConfigured: boolean
}

function IntegrasiPage({ cards, readyCount, blockers, endpoint, schedulerConfigured }: Props) {
  return (
    <PageStack>
      <ActivationSummary blockers={blockers} />
      <IntegrationGuide cards={cards} readyCount={readyCount} />
      <SchedulerGuide endpoint={endpoint} configured={schedulerConfigured} />
    </PageStack>
  )
}

const Page = IntegrasiPage as PageWithFrame<Props>
Page.getLayout = (page) => (
  <ConsoleFrame eyebrow="Koneksi layanan" title="Integrasi" intent="Hanya layanan inti yang dipakai untuk menjalankan website dan operasional bisnis.">
    {page}
  </ConsoleFrame>
)
export default Page
