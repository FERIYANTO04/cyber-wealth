/** Bank-transfer instructions are rendered from private server-side environment variables. */
function customInstructionsContainAccountDetails(value: string): boolean {
  return /(?:bank|rekening|no\.?\s*rek|nomor rekening|atas nama)/i.test(value) && /\d{8,20}/.test(value)
}

export function hasConfiguredBankTransferDetails(): boolean {
  const bank = process.env.BANK_NAME?.trim()
  const accountName = process.env.BANK_ACCOUNT_NAME?.trim()
  const accountNumber = process.env.BANK_ACCOUNT_NUMBER?.trim()
  const custom = process.env.BANK_TRANSFER_INSTRUCTIONS?.trim() ?? ''
  return Boolean((bank && accountName && accountNumber) || customInstructionsContainAccountDetails(custom))
}

export function bankTransferInstructions(reference?: string): string {
  const bank = process.env.BANK_NAME?.trim()
  const accountName = process.env.BANK_ACCOUNT_NAME?.trim()
  const accountNumber = process.env.BANK_ACCOUNT_NUMBER?.trim()
  const custom = process.env.BANK_TRANSFER_INSTRUCTIONS?.trim() ?? ''
  const ref = reference ? '\nBerita transfer: ' + reference : ''

  // A custom block may contain the full bank details. In that case, don't append
  // the misleading "details unavailable" message or hide the configured account.
  if (customInstructionsContainAccountDetails(custom) && !(bank && accountName && accountNumber)) {
    return custom + ref + '\nPesanan aktif setelah dana masuk diverifikasi.'
  }

  const details = bank && accountName && accountNumber
    ? 'Bank: ' + bank + '\nNomor rekening: ' + accountNumber + '\nAtas nama: ' + accountName
    : 'Detail rekening belum tersedia. Hubungi pemilik untuk meminta rekening tujuan transfer.'
  const note = custom || 'Cantumkan kode pesanan pada berita transfer. Pesanan aktif setelah dana masuk diverifikasi.'
  return details + ref + '\n' + note
}
