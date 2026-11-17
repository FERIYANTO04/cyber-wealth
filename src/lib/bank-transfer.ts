/** Bank-transfer instructions are rendered from private server-side environment variables. */
export function bankTransferInstructions(reference?: string): string {
  const bank = process.env.BANK_NAME?.trim()
  const accountName = process.env.BANK_ACCOUNT_NAME?.trim()
  const accountNumber = process.env.BANK_ACCOUNT_NUMBER?.trim()
  const custom = process.env.BANK_TRANSFER_INSTRUCTIONS?.trim()
  const details = bank && accountName && accountNumber
    ? `Bank: ${bank}\nNomor rekening: ${accountNumber}\nAtas nama: ${accountName}`
    : 'Detail rekening belum tersedia. Hubungi pemilik untuk meminta rekening tujuan transfer.'
  const ref = reference ? `\nBerita transfer: ${reference}` : ''
  const note = custom || 'Cantumkan kode pesanan pada berita transfer. Pesanan aktif setelah dana masuk diverifikasi.'
  return `${details}${ref}\n${note}`
}
