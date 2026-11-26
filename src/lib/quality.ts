import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
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

  let rawBytes: Uint8Array
  let contentType = ''
  // This one bundled interactive tool is intentionally shipped with the app,
  // rather than Object Storage. Validate the exact allow-listed asset instead
  // of incorrectly reporting it as missing from private storage.
  if (
    fileKey === 'bundled:kalkulator-hpp-umkm.html' &&
    fileName === 'Cyber-Wealth-Kalkulator-HPP-UMKM.html'
  ) {
    try {
      rawBytes = new Uint8Array(await readFile(join(process.cwd(), 'public', 'downloads', 'kalkulator-hpp-umkm.html')))
      contentType = 'text/html'
    } catch {
      return { passed: false, wordCount: 0, headingCount: 0, byteCount: 0, issues: [...issues, 'Berkas HTML bawaan aplikasi tidak ditemukan.'] }
    }
  } else {
    let stored: Awaited<ReturnType<typeof getFile>>
    try {
      stored = await getFile(fileKey)
    } catch {
      return { passed: false, wordCount: 0, headingCount: 0, byteCount: 0, issues: [...issues, 'Object storage gagal diperiksa.'] }
    }
    if (!stored) return { passed: false, wordCount: 0, headingCount: 0, byteCount: 0, issues: [...issues, 'Berkas tidak ditemukan atau tidak dapat diakses di object storage.'] }
    rawBytes = new Uint8Array(stored.data)
    contentType = stored.contentType
  }

  const byteCount = rawBytes.byteLength
  const isHtml = /\.html?$/i.test(fileName ?? '') && contentType.startsWith('text/')
  const isText = /\.(md|markdown|txt)$/i.test(fileName ?? '') || contentType.startsWith('text/')
  if (!isText) return { passed: false, wordCount: 0, headingCount: 0, byteCount, issues: [...issues, 'Format berkas belum didukung pemeriksaan isi otomatis; perlu pemeriksaan isi sebelum dijual.'] }
  if (byteCount < 1200) issues.push('Berkas terlalu pendek untuk dianggap sebagai produk digital lengkap.')

  let content = new TextDecoder('utf-8', { fatal: false }).decode(rawBytes).replace(/\u0000/g, '').trim()
  let headingCount = 0
  if (isHtml) {
    const headings = content.match(/<h[1-3]\b[^>]*>[\s\S]*?<\/h[1-3]>/gi) ?? []
    const sections = content.match(/<section\b/gi) ?? []
    const inputs = content.match(/<input\b/gi) ?? []
    const hasWorkingCalculator = /function\s+calc\s*\(/i.test(content) && /addEventListener\(['"]input['"]/i.test(content)
    headingCount = headings.length
    content = content
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;|&#160;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;|&#34;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
    if (sections.length < 2 || inputs.length < 5 || !hasWorkingCalculator) {
      issues.push('Alat HTML belum memiliki struktur interaktif dan fungsi kalkulasi yang cukup.')
    }
  } else {
    const headings = content.match(/^#{1,3}\s+\S.+$/gm) ?? []
    headingCount = headings.length
  }

  const words = content.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []
  const wordCount = words.length
  if (wordCount < (isHtml ? 100 : 220)) issues.push(isHtml ? 'Konten alat interaktif terlalu minim untuk menjelaskan penggunaan.' : 'Isi kurang dari 220 kata; materi perlu dilengkapi.')
  if (!isHtml && headingCount < 4) issues.push('Struktur kurang dari 4 bagian utama; materi perlu ditata.')
  if (/(?:^|\n)\s*(?:TODO|TBD|LOREM IPSUM|ISI DI SINI|TULIS DI SINI|BELUM DILENGKAPI|PLACEHOLDER)\b/im.test(content)) issues.push('Masih ditemukan teks placeholder atau instruksi penyusunan.')
  if (/\uFFFD{3,}/.test(content)) issues.push('Terdapat indikasi teks rusak atau encoding bermasalah.')

  return { passed: issues.length === 0, wordCount, headingCount, byteCount, issues }
}
