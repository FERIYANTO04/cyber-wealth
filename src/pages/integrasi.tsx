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
import { bankTransferStatus, storageStatus } from '@/lib/integrations'
import { aiConfig as runtimeAiConfig } from '@/lib/ai'
import { isPlaceholder } from '@/lib/env'
import { emailConfig } from '@/lib/email'
import { getActiveFacebookAccount, metaConfig } from '@/lib/meta'
import { getActiveInstagramAccount } from '@/lib/instagram'
import { getEngineCounts } from '@/lib/data'
import type { PageWithFrame } from '@/lib/frame'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const guard = await requireOwnerPage(ctx)
  if ('redirectTo' in guard) return { redirect: { destination: guard.redirectTo, permanent: false } }

  const host = String(ctx.req.headers['x-forwarded-host'] ?? ctx.req.headers.host ?? '')
  const proto = (ctx.req.headers['x-forwarded-proto'] as string | undefined) ?? 'https'

  const ai = runtimeAiConfig()
  const email = emailConfig()
  const meta = metaConfig()
  const facebook = await getActiveFacebookAccount()
  const instagram = await getActiveInstagramAccount()
  const bank = bankTransferStatus()
  const storage = await storageStatus()
  const engines = await getEngineCounts()

  const aiState: CheckState = isPlaceholder(ai.key) ? 'missing' : 'ready'
  const emailState: CheckState = isPlaceholder(email.key) || isPlaceholder(email.from) ? 'missing' : 'ready'
  const metaState: CheckState = !meta.configured
    ? 'missing'
    : facebook
      ? facebook.status === 'connected'
        ? 'ready'
        : 'invalid'
      : 'missing'

  const cards: ServiceCard[] = [
    {
      key: 'ai',
      title: 'Model AI',
      summary: `Agen menulis penawaran, draf produk, materi promosi, dan pesan pendekatan lewat ${ai.model}.`,
      state: aiState,
      message:
        aiState === 'ready'
          ? `Kunci terpasang untuk alamat ${ai.baseUrl} dengan model ${ai.model}. Tekan uji koneksi untuk memastikan kuncinya berlaku.`
          : 'Kunci API model AI belum diisi. Selama kosong, tugas yang menulis teks akan dilewati dan mencatat alasannya — tidak ada hasil yang dibuat-buat.',
      required: [ai.key ? 'Kunci AI sudah tersimpan di server' : 'Kunci AI belum diisi', 'Model dan alamat API mengikuti konfigurasi agen yang aktif'],
      steps: [
        'Gunakan penyedia AI yang dikonfigurasi untuk agen pada server ini.',
        'Pastikan kunci API dan alamat penyedia sesuai dengan akun serta model yang dipilih.',
        'Jangan menaruh kunci API di browser atau membagikannya kepada siapa pun.',
        'Simpan konfigurasi server, lalu tekan Uji koneksi di kartu ini.',
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
        emailState === 'ready'
          ? `Kunci email terpasang. Pengirim: ${email.from}. Tekan uji koneksi untuk memastikan kuncinya berlaku.`
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
      key: 'social',
      title: 'Akun kanal sosial',
      summary: 'Mengirim konten yang sudah Anda setujui ke Facebook Page dan Instagram Bisnis; X, LinkedIn, dan TikTok belum terhubung.',
      state: metaState === 'missing' ? 'missing' : instagram ? 'ready' : 'missing',
      message:
        metaState === 'missing'
          ? 'Meta App ID dan App Secret belum diisi, jadi Instagram Bisnis belum bisa dihubungkan.'
          : instagram
            ? `Akun Instagram ${instagram.name} terhubung ke Halaman induknya. Konten Instagram yang Anda setujui dan beri foto atau video akan dikirim lewat Meta Graph API.`
            : 'Halaman Facebook sudah terhubung, tetapi akun Instagram Bisnisnya belum. Buka menu Instagram Bisnis untuk menautkannya.',
      channels: [
        {
          key: 'facebook',
          label: 'Facebook Page',
          state: !meta.configured ? 'missing' : facebook ? (facebook.status === 'connected' ? 'ready' : 'invalid') : 'missing',
          detail: !meta.configured
            ? 'App ID dan App Secret belum diisi.'
            : facebook
              ? `${facebook.name} tersimpan, terhubung ${facebook.connectedAt.toISOString().slice(0, 10)}.`
              : 'Belum ada halaman yang terhubung.',
        },
        {
          key: 'instagram',
          label: 'Instagram Bisnis',
          state: !meta.configured ? 'missing' : instagram ? (instagram.status === 'connected' ? 'ready' : 'invalid') : 'missing',
          detail: !meta.configured
            ? 'App ID dan App Secret belum diisi.'
            : instagram
              ? `${instagram.name} tertaut pada halaman induknya.`
              : 'Belum tertaut; hubungkan halaman Facebook dulu.',
        },
      ],
      required: [
        'META_APP_ID dan META_APP_SECRET (wajib)',
        'Akun Instagram yang sudah diubah menjadi Bisnis dan tertaut ke Halaman',
        'Izin instagram_basic dan instagram_content_publish',
      ],
      steps: [
        'Ubah akun Instagram Anda menjadi akun Bisnis, lalu tautkan ke Halaman Facebook melalui aplikasi Instagram.',
        'Pakai aplikasi Meta yang sama dengan halaman Facebook; tambahkan produk Instagram Graph API.',
        'Hubungkan Halaman Facebook Anda di menu Facebook Page, lalu buka menu Instagram Bisnis.',
        'Tekan Hubungkan Instagram; akun hanya disebut terhubung setelah Meta menyebutkan nama akunnya.',
      ],
      where:
        'Token kanal hanya dipakai di server. Konten baru disebut terbit setelah kanal mengembalikan nomor kiriman; bila gagal, alasannya dicatat dan konten tetap belum terbit.',
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
  if (aiState !== 'ready') blockers.push('Kunci API model AI belum diisi, sehingga agen penulis belum bisa bekerja.')
  if (bank.state !== 'ready') blockers.push('Detail rekening penerima belum diisi, sehingga pembeli belum mendapat instruksi transfer yang benar.')
  if (emailState !== 'ready') blockers.push('Penyedia email belum dihubungkan, sehingga konfirmasi dan pengingat belum terkirim ke pelanggan.')
  if (engines.products === 0) blockers.push('Belum ada produk digital yang terbit, jadi belum ada yang bisa dibeli.')
  if (engines.services === 0) blockers.push('Belum ada layanan jasa yang terbit, jadi calon klien belum bisa mengirim brief.')
  if (engines.plans === 0) blockers.push('Belum ada paket langganan yang terbit.')
  if (!meta.configured) blockers.push('Meta App ID dan App Secret belum diisi, sehingga Halaman Facebook dan Instagram belum bisa dihubungkan.')
  else if (!facebook) blockers.push('Belum ada Halaman Facebook yang terhubung, jadi konten Facebook dan Instagram belum bisa terbit.')
  else if (!instagram) blockers.push('Akun Instagram Bisnis belum tertaut, jadi konten Instagram belum bisa terbit.')

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
      <IntegrationGuide cards={cards} />
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
