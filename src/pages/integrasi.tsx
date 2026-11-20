import type { GetServerSideProps } from 'next'
import { ConsoleFrame } from '@/components/ConsoleFrame'
import {
  ActivationSummary,
  IntegrationGuide,
  type CheckState,
  type ServiceCard,
} from '@/components/IntegrationGuide'
import { PageStack } from '@/components/ui'
import { SchedulerGuide } from '@/components/SchedulerGuide'
import { requireOwnerPage } from '@/lib/auth'
import { aiConfig, bankTransferStatus, storageStatus, testPaddle } from '@/lib/integrations'
import { telegramConnectionStatus } from '@/lib/telegram'
import { isPlaceholder } from '@/lib/env'
import { emailConfig } from '@/lib/email'
import { getEngineCounts } from '@/lib/data'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }

  const host = String(ctx.req.headers['x-forwarded-host'] ?? ctx.req.headers.host ?? '')
  const proto = (ctx.req.headers['x-forwarded-proto'] as string | undefined) ?? 'https'

  const ai = aiConfig()
  const email = emailConfig()
  const bank = bankTransferStatus()
  const storage = await storageStatus()
  const telegram = await telegramConnectionStatus()
  const paddle = await testPaddle()
  const engines = await getEngineCounts()

  const aiState: CheckState = isPlaceholder(ai.key) ? 'missing' : 'unverified'
  const emailState: CheckState = isPlaceholder(email.key) || isPlaceholder(email.from) ? 'missing' : 'unverified'
  const paddleState: CheckState = paddle.state


  const cards: ServiceCard[] = [
    {
      key: 'ai',
      title: 'Model AI',
      summary: `Agen menulis penawaran, draf produk, materi promosi, dan pesan pendekatan lewat ${ai.model}.`,
      state: aiState,
      message:
        aiState === 'unverified'
          ? `Kunci terpasang untuk alamat ${ai.baseUrl} dengan model ${ai.model}, tetapi belum terbukti menjawab. Tekan Uji koneksi.`
          : 'Kunci API model AI belum diisi. Selama kosong, tugas yang menulis teks akan dilewati dan mencatat alasannya — tidak ada hasil yang dibuat-buat.',
      required: ['NEON_AI_GATEWAY_TOKEN (wajib)', 'AI_BASE_URL (alamat gateway)', 'AI_MODEL (nama model)'],
      steps: [
        'Gunakan kunci API gateway AI yang sudah dibuat dan aktif.',
        'Simpan kunci tersebut di Railway Production sebagai NEON_AI_GATEWAY_TOKEN; jangan tempelkan kunci ke chat atau halaman publik.',
        'Pastikan AI_BASE_URL dan AI_MODEL sama dengan alamat gateway dan model yang disediakan penyedia AI.',
        'Publikasikan ulang, lalu tekan Uji koneksi. Status aktif baru dianggap terverifikasi setelah penyedia menjawab berhasil.',
      ],
      where:
        'Kunci hanya disimpan di server dan tidak pernah dikirim ke browser. Nilai yang tampil di aplikasi tidak pernah menampilkan isi kunci.',
      testable: true,
    },
    {
      key: 'payment',
      title: 'Transfer bank langsung',
      summary: 'Pembeli mentransfer langsung ke rekening pemilik. Tanpa payment gateway.',
      state: bank.state,
      message: bank.message,
      required: ['BANK_NAME', 'BANK_ACCOUNT_NAME', 'BANK_ACCOUNT_NUMBER'],
      steps: [
        'Isi nama bank, nama pemilik rekening, dan nomor rekening di pengaturan rahasia hosting.',
        'Atur BANK_TRANSFER_INSTRUCTIONS dengan instruksi transfer yang ingin ditampilkan kepada pembeli.',
        'Pembeli transfer dan mencantumkan kode pesanan.',
        'Pesanan hanya ditandai lunas setelah mutasi rekening benar-benar diperiksa.',
      ],
      where: 'Website tidak membaca saldo bank dan tidak mengirim transfer otomatis. Konfirmasi pembayaran dilakukan setelah bukti dana masuk diverifikasi.',
      testable: false,
    },
    {
      key: 'email',
      title: 'Email transaksional',
      summary: 'Mengirim konfirmasi pesanan, pengiriman produk setelah pembayaran, pengingat perpanjangan, dan pemberitahuan ke Anda.',
      state: emailState,
      message:
        emailState === 'unverified'
          ? `Kunci email dan alamat pengirim terpasang (${email.from}), tetapi belum terbukti dapat mengirim. Tekan Uji koneksi.`
          : 'Penyedia email belum terhubung. Setiap email tetap tercatat di kotak keluar aplikasi beserta alasannya, tetapi belum benar-benar terkirim.',
      required: ['EMAIL_API_KEY (wajib)', 'EMAIL_FROM (wajib)', 'EMAIL_API_BASE_URL (opsional)'],
      steps: [
        'Buat akun di penyedia email transaksional (misalnya Resend), lalu buat kunci API.',
        'Verifikasi domain atau alamat pengirim Anda di dasbor penyedia — tanpa itu pesan ditolak.',
        'Isi EMAIL_API_KEY dengan kunci itu dan EMAIL_FROM dengan alamat pengirim yang sudah diverifikasi.',
        'Publikasikan ulang, lalu tekan Uji koneksi di kartu ini.',
      ],
      where:
        'Email dikirim dari server aplikasi. Isi email pelanggan tidak pernah ditampilkan ke publik, dan setiap email yang gagal tercatat beserta alasannya di kotak keluar.',
      testable: true,
    },
    {
      key: 'paddle',
      title: 'Pembayaran Paddle',
      summary: 'Membuat checkout dan menerima konfirmasi pembayaran otomatis melalui webhook Paddle.',
      state: paddleState,
      message: paddle.message,
      required: ['PADDLE_API_KEY', 'PADDLE_WEBHOOK_SECRET', 'PADDLE_ENV (sandbox atau live)'],
      steps: [
        'Pastikan API key dan webhook secret berasal dari lingkungan yang sama: Sandbox atau Live.',
        'Di dashboard Paddle, daftarkan endpoint webhook: ' + `https://${host}/api/webhooks/paddle`,
        'Pilih event transaction.completed dan transaction.paid, lalu salin secret endpoint ke PADDLE_WEBHOOK_SECRET.',
        'Tekan Uji koneksi. Uji ini memeriksa API key tanpa membuat tagihan atau menarik uang.',
      ],
      where: 'Uji API yang berhasil belum membuktikan webhook sudah terdaftar. Jangan menerima pembayaran Live sampai endpoint dan event webhook cocok.',
      copyValue: { label: 'URL webhook Paddle', value: `https://${host}/api/webhooks/paddle` },
      testable: true,
    },
    {
      key: 'telegram',
      title: 'Telegram Channel',
      summary: 'Menerbitkan konten pemasaran secara langsung ke kanal Telegram bisnis.',
      state: telegram.state,
      message: telegram.message,
      required: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'],
      steps: [
        'Buat bot melalui @BotFather dan salin token bot.',
        'Buat kanal Telegram bisnis, lalu tambahkan bot sebagai admin dengan izin mengirim pesan.',
        'Isi TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID di Railway Production.',
        'Tekan Uji koneksi. Sistem memeriksa identitas bot, kanal, dan hak admin tanpa mengirim posting percobaan.',
      ],
      where: 'Publikasi hanya dinyatakan berhasil setelah Telegram mengembalikan ID pesan. X, LinkedIn, dan TikTok saat ini hanya disiapkan sebagai draf, bukan kanal penerbitan otomatis.',
      testable: true,
    },
    {
      key: 'storage',
      title: 'Penyimpanan berkas',
      summary: 'Menyimpan berkas produk digital yang diunduh pembeli setelah pembayaran dikonfirmasi.',
      state: storage.state as CheckState,
      message:
        storage.state === 'ready'
          ? storage.message
          : 'Penyimpanan berkas belum menjawab. Lampiran produk tidak bisa diunggah sampai ini siap.',
      required: ['Diatur otomatis oleh platform saat aplikasi dipublikasikan'],
      steps: [
        'Di pratinjau, berkas yang Anda unggah bersifat sementara dan hilang saat pratinjau dimulai ulang.',
        'Saat aplikasi dipublikasikan, penyimpanan berkas disiapkan untuk Anda — tidak ada yang perlu diisi sendiri.',
        'Produk tanpa berkas tetap bisa dijual; pembeli melihat catatan serahan yang Anda tulis di halaman produk.',
      ],
      where: 'Berkas disimpan privat. Pembeli menerima tautan unduhan sementara yang dibuat saat halaman pesanan dibuka.',
      testable: true,
    },
  ]

  const readyCount = cards.filter((card) => card.state === 'ready').length
  const blockers: string[] = []
  blockers.push(aiState === 'unverified' ? 'Kredensial AI terpasang, tetapi koneksinya belum lulus uji langsung.' : 'Kunci API model AI belum diisi, sehingga agen penulis belum bisa bekerja.')
  if (bank.state !== 'ready') blockers.push(bank.state === 'unverified' ? 'Detail rekening terisi, tetapi Owner belum memverifikasi kecocokannya langsung di aplikasi bank.' : 'Detail rekening penerima belum diisi, sehingga pembeli belum mendapat instruksi transfer yang benar.')
  blockers.push(emailState === 'unverified' ? 'Kredensial email terpasang, tetapi pengiriman belum lulus uji langsung.' : 'Penyedia email belum dihubungkan, sehingga konfirmasi dan pengingat belum terkirim ke pelanggan.')
  if (engines.products === 0) blockers.push('Belum ada produk digital yang terbit, jadi belum ada yang bisa dibeli.')
  if (engines.services === 0) blockers.push('Belum ada layanan jasa yang terbit, jadi calon klien belum bisa mengirim brief.')
  if (engines.plans === 0) blockers.push('Belum ada paket langganan yang terbit.')
  if (paddle.state !== 'ready') blockers.push(paddle.state === 'unverified' ? 'API Paddle merespons, tetapi webhook masih harus diverifikasi terdaftar di dashboard Paddle.' : 'Checkout Paddle belum terverifikasi; aktifkan transfer bank sebagai jalur pembayaran cadangan jika rekening sudah benar.')
  if (telegram.state !== 'ready') blockers.push(telegram.message)
  

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
  <ConsoleFrame
    eyebrow="Koneksi layanan"
    title="Integrasi"
    intent="Status setiap layanan luar, uji koneksi sungguhan, dan panduan mengisi yang belum lengkap."
  >
    {page}
  </ConsoleFrame>
)
export default Page
