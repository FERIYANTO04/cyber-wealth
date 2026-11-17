import { money } from './format'

/**
 * Email copy, in one place. Every message states only what the app knows for
 * certain — money is never described as received before the provider confirmed it.
 */

type OrderLike = {
  code: string
  productName: string
  buyerName: string
  amountIdr: number
  link: string
  downloadUrl?: string | null
  deliverableNote?: string | null
}

export function orderPaidEmail(order: OrderLike) {
  const lines = [
    `Halo ${order.buyerName},`,
    '',
    `Pembayaran Anda untuk "${order.productName}" sudah diverifikasi pemilik setelah dana masuk.`,
    `Nomor pesanan: ${order.code}`,
    `Jumlah: ${money(order.amountIdr)}`,
    '',
    'Unduhan dan rincian pesanan ada di halaman berikut:',
    order.link,
  ]
  if (order.downloadUrl) {
    lines.push('', 'Tautan unduhan langsung (berlaku sementara):', order.downloadUrl)
  }
  if (order.deliverableNote) {
    lines.push('', `Yang Anda terima: ${order.deliverableNote}`)
  }
  lines.push('', 'Simpan email ini sebagai bukti pembelian.')
  return { subject: `Pesanan ${order.code} sudah lunas`, body: lines.join('\n') }
}

export function orderPendingEmail(order: OrderLike) {
  return {
    subject: `Pesanan ${order.code} menunggu pembayaran`,
    body: [
      `Halo ${order.buyerName},`,
      '',
      `Pesanan "${order.productName}" sudah kami catat dengan nomor ${order.code}.`,
      `Jumlah: ${money(order.amountIdr)}`,
      '',
      'Pesanan menjadi lunas setelah pemilik memverifikasi dana masuk pembayaran Anda.',
      'Rincian pesanan:',
      order.link,
    ].join('\n'),
  }
}

export function subscriptionPaidEmail(args: {
  name: string
  planName: string
  amountIdr: number
  periodEnd: string
  link: string
  interval: 'month' | 'year'
}) {
  return {
    subject: `Langganan ${args.planName} aktif`,
    body: [
      `Halo ${args.name},`,
      '',
      `Pembayaran langganan ${args.planName} sudah diverifikasi pemilik setelah dana masuk.`,
      `Jumlah: ${money(args.amountIdr)} per ${args.interval === 'year' ? 'tahun' : 'bulan'}`,
      `Berlaku sampai: ${args.periodEnd}`,
      '',
      'Kelola langganan, riwayat pembayaran, dan pengaturan perpanjangan di halaman berikut:',
      args.link,
    ].join('\n'),
  }
}

export function cycleReminderEmail(args: {
  name: string
  planName: string
  amountIdr: number
  dueLabel: string
  link: string
  final: boolean
}) {
  return {
    subject: args.final
      ? `Tagihan ${args.planName} jatuh tempo besok`
      : `Pengingat perpanjangan ${args.planName}`,
    body: [
      `Halo ${args.name},`,
      '',
      args.final
        ? `Langganan ${args.planName} berakhir besok, ${args.dueLabel}.`
        : `Langganan ${args.planName} akan diperpanjang pada ${args.dueLabel}.`,
      `Jumlah tagihan berikutnya: ${money(args.amountIdr)}`,
      '',
      'Rincian dan tautan pembayaran:',
      args.link,
      '',
      'Tidak ingin diperpanjang? Matikan perpanjangan otomatis dari halaman yang sama — tidak ada tagihan yang dibuat setelah itu.',
    ].join('\n'),
  }
}

export function cycleInvoiceEmail(args: {
  name: string
  planName: string
  amountIdr: number
  dueLabel: string
  invoiceUrl: string
  link: string
}) {
  return {
    subject: `Tagihan perpanjangan ${args.planName}`,
    body: [
      `Halo ${args.name},`,
      '',
      `Tagihan perpanjangan ${args.planName} sebesar ${money(args.amountIdr)} sudah dibuat untuk periode mulai ${args.dueLabel}.`,
      '',
      'Transfer langsung ke rekening pemilik:',
      args.invoiceUrl,
      '',
      'Status langganan:',
      args.link,
    ].join('\n'),
  }
}

export function cyclePaidEmail(args: {
  name: string
  planName: string
  amountIdr: number
  periodEnd: string
  link: string
}) {
  return {
    subject: `Pembayaran perpanjangan ${args.planName} diterima`,
    body: [
      `Halo ${args.name},`,
      '',
      `Pembayaran perpanjangan ${args.planName} sebesar ${money(args.amountIdr)} sudah diverifikasi pemilik setelah dana masuk.`,
      `Langganan berlaku sampai ${args.periodEnd}.`,
      '',
      'Riwayat pembayaran dan pengaturan langganan:',
      args.link,
    ].join('\n'),
  }
}

export function paymentFailedEmail(args: { name: string; planName: string; amountIdr: number; link: string; reason: string }) {
  return {
    subject: `Pembayaran ${args.planName} belum berhasil`,
    body: [
      `Halo ${args.name},`,
      '',
      `Pembayaran ${money(args.amountIdr)} untuk ${args.planName} tidak berhasil diselesaikan (${args.reason}).`,
      'Tidak ada dana yang tercatat masuk untuk tagihan ini.',
      '',
      'Anda bisa mencoba lagi dari halaman langganan:',
      args.link,
    ].join('\n'),
  }
}

export function requestDecisionEmail(args: {
  name: string
  kind: 'cancel' | 'refund'
  approved: boolean
  note?: string | null
  link: string
}) {
  const what = args.kind === 'cancel' ? 'pembatalan langganan' : 'permintaan refund'
  return {
    subject: args.approved ? `Permintaan ${what} disetujui` : `Permintaan ${what} belum dapat disetujui`,
    body: [
      `Halo ${args.name},`,
      '',
      `Permintaan ${what} Anda ${args.approved ? 'sudah disetujui pemilik.' : 'belum dapat disetujui.'}`,
      args.note ? `Catatan pemilik: ${args.note}` : '',
      args.approved && args.kind === 'refund'
        ? 'Refund dikirim manual oleh pemilik melalui transfer bank setelah disetujui.'
        : '',
      '',
      'Rincian langganan:',
      args.link,
    ]
      .filter(Boolean)
      .join('\n'),
  }
}
