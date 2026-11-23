import { getFile } from './storage'

export type DeliverableInspection = {
  passed: boolean
  wordCount: number
  headingCount: number
  byteCount: number
  issues: string[]
}

/**
 * Verifies that a digital product has a real, readable, sufficiently structured
 * private deliverable before checkout. This integrity gate does not replace
 * editorial review or client acceptance.
 */
export async function inspectProductDeliverable(
  fileKey: string | null | undefined,
  fileName: string | null | undefined,
): Promise<DeliverableInspection> {
  const issues: string[] = []
  if (!fileKey) return { passed: false, wordCount: 0, headingCount: 0, byteCount: 0, issues: ['Berkas unduhan belum terpasang.'] }
  if (/^https?:\/\//i.test(fileKey)) return { passed: false, wordCount: 0, headingCount: 0, byteCount: 0, issues: ['Berkas harus tersimpan privat di object storage.'] }
  if (/(?:draft|draf|placeholder|temp)/i.test(fileName ?? '')) issues.push('Nama berkas masih menandakan draf atau placeholder.')

  let stored: Awaited<ReturnType<typeof getFile>>
  try {
    stored = await getFile(fileKey)
  } catch {
    return { passed: false, wordCount: 0, headingCount: 0, byteCount: 0, issues: [...issues, 'Object storage gagal diperiksa.'] }
  }
  if (!stored) return { passed: false, wordCount: 0, headingCount: 0, byteCount: 0, issues: [...issues, 'Berkas tidak ditemukan atau tidak dapat diakses di object storage.'] }

  const bytes = new Uint8Array(stored.data)
  const byteCount = bytes.byteLength
  const isText = /\.(md|markdown|txt)$/i.test(fileName ?? '') || stored.contentType.startsWith('text/')
  if (!isText) return { passed: false, wordCount: 0, headingCount: 0, byteCount, issues: [...issues, 'Format berkas belum didukung pemeriksaan isi otomatis; perlu pemeriksaan isi sebelum dijual.'] }
  if (byteCount < 1200) issues.push('Berkas terlalu pendek untuk dianggap sebagai produk digital lengkap.')

  const content = new TextDecoder('utf-8', { fatal: false }).decode(bytes).replace(/\u0000/g, '').trim()
  const words = content.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []
  const headings = content.match(/^#{1,3}\s+\S.+$/gm) ?? []
  const wordCount = words.length
  const headingCount = headings.length
  if (wordCount < 220) issues.push('Isi kurang dari 220 kata; materi perlu dilengkapi.')
  if (headingCount < 4) issues.push('Struktur kurang dari 4 bagian utama; materi perlu ditata.')
  if (/(?:^|\n)\s*(?:TODO|TBD|LOREM IPSUM|ISI DI SINI|TULIS DI SINI|BELUM DILENGKAPI|PLACEHOLDER)\b/im.test(content)) issues.push('Masih ditemukan teks placeholder atau instruksi penyusunan.')
  if (/\uFFFD{3,}/.test(content)) issues.push('Terdapat indikasi teks rusak atau encoding bermasalah.')

  return { passed: issues.length === 0, wordCount, headingCount, byteCount, issues }
}
