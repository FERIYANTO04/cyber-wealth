import { desc } from 'drizzle-orm'
import { db } from './db'
import { emailMessages, ownerAccount } from './db/schema'
import { isPlaceholder } from './env'

/**
 * Transactional email through an HTTP provider (Resend-compatible). Nothing here
 * throws: an email that could not be sent is written to the log as `queued` or
 * `failed` with the reason, so the owner sees the truth instead of a silent gap.
 */

export function emailConfig() {
  return {
    key: process.env.EMAIL_API_KEY ?? '',
    from: process.env.EMAIL_FROM ?? '',
    baseUrl: (process.env.EMAIL_API_BASE_URL || 'https://api.resend.com').replace(/\/+$/, ''),
  }
}

export function emailConfigured(): boolean {
  const { key, from } = emailConfig()
  return !isPlaceholder(key) && !isPlaceholder(from)
}

export type EmailInput = {
  to: string
  subject: string
  body: string
  kind: string
  relatedType?: string
  relatedId?: string
  dataSource?: 'live' | 'demo'
}

export type EmailResult = { sent: boolean; status: string; detail: string }

export async function sendEmail(input: EmailInput): Promise<EmailResult> {
  const { key, from, baseUrl } = emailConfig()
  const to = input.to.trim().toLowerCase()
  let status = 'queued'
  let detail = 'Email tersimpan di antrean. Penyedia email belum terhubung, jadi belum ada yang terkirim.'

  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    status = 'failed'
    detail = 'Alamat email penerima tidak valid.'
  } else if (!emailConfigured()) {
    status = 'queued'
    detail =
      'Penyedia email belum terhubung (kunci API atau alamat pengirim belum diisi). Isi di layar publikasi agar email ini benar-benar terkirim.'
  } else {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15_000)
    try {
      const response = await fetch(`${baseUrl}/emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ from, to: [to], subject: input.subject, text: input.body }),
        signal: controller.signal,
        cache: 'no-store',
      })
      const payload = (await response.json().catch(() => null)) as { id?: string; message?: string } | null
      if (response.ok) {
        status = 'sent'
        detail = payload?.id ? `Diterima penyedia email (id ${payload.id}).` : 'Diterima penyedia email.'
      } else if (response.status === 401 || response.status === 403) {
        status = 'failed'
        detail = 'Penyedia email menolak kunci API. Periksa kuncinya di layar publikasi.'
      } else if (response.status === 422) {
        status = 'failed'
        detail = `Penyedia email menolak pesan ini${payload?.message ? `: ${payload.message}` : ''}. Periksa alamat pengirim yang sudah diverifikasi.`
      } else {
        status = 'failed'
        detail = `Penyedia email menjawab ${response.status}${payload?.message ? `: ${payload.message}` : ''}.`
      }
    } catch (error) {
      status = 'failed'
      detail =
        error instanceof Error && error.name === 'AbortError'
          ? 'Penyedia email tidak menjawab dalam 15 detik.'
          : 'Tidak bisa menghubungi penyedia email.'
    } finally {
      clearTimeout(timer)
    }
  }

  await db.insert(emailMessages).values({
    toEmail: to || input.to,
    kind: input.kind,
    subject: input.subject,
    body: input.body,
    status,
    detail,
    relatedType: input.relatedType ?? null,
    relatedId: input.relatedId ?? null,
    dataSource: input.dataSource ?? 'live',
  })

  return { sent: status === 'sent', status, detail }
}

/** Tells the owner about money moving. Owner addresses come from the app's own accounts. */
export async function notifyOwner(input: { subject: string; lines: string[]; kind: string; relatedId?: string }) {
  const body = ['Ringkasan dari Cyber Wealth Autopilot:', '', ...input.lines].join('\n')
  const owners = await db.select({ email: ownerAccount.email }).from(ownerAccount)
  for (const owner of owners) {
    await sendEmail({
      to: owner.email,
      subject: input.subject,
      body,
      kind: input.kind,
      relatedType: 'owner',
      relatedId: input.relatedId,
    })
  }
  return owners.length
}

export async function getEmailLog(limit = 40) {
  return db.select().from(emailMessages).orderBy(desc(emailMessages.createdAt)).limit(limit)
}

/** Checks the provider really answers for this key — the cheapest honest proof. */
export async function testEmail(): Promise<{ state: 'ready' | 'missing' | 'invalid' | 'error' | 'unverified'; message: string }> {
  const { key, from, baseUrl } = emailConfig()
  if (isPlaceholder(key)) {
    return {
      state: 'missing',
      message:
        'Kunci API penyedia email belum diisi. Email konfirmasi, pengingat, dan pemberitahuan pemilik hanya tercatat di kotak keluar aplikasi, belum terkirim.',
    }
  }
  if (isPlaceholder(from)) {
    return { state: 'missing', message: 'Alamat pengirim email belum diisi, jadi penyedia email belum bisa menerima pesan.' }
  }
  try {
    const response = await fetch(`${baseUrl}/domains`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
    })
    if (response.status === 401 || response.status === 403) {
      return { state: 'invalid', message: 'Penyedia email menolak kunci ini. Salin ulang kunci API-nya.' }
    }
    if (!response.ok) {
      return { state: 'error', message: `Penyedia email menjawab ${response.status}. Periksa alamat API dan alamat pengirim.` }
    }

    const payload = (await response.json().catch(() => null)) as
      | { data?: { name?: string; status?: string }[] }
      | null
    const senderDomain = from.split('@').pop()?.trim().toLowerCase() ?? ''
    const verified = (payload?.data ?? []).some(
      (domain) => domain.name?.trim().toLowerCase() === senderDomain && domain.status?.toLowerCase() === 'verified',
    )
    if (!verified) {
      return {
        state: 'unverified',
        message: `Kunci API diterima, tetapi domain pengirim ${senderDomain || '(tidak valid)'} belum terbukti berstatus verified di penyedia email.`,
      }
    }
    return { state: 'ready', message: `Kunci API dan domain pengirim terverifikasi. Pengirim: ${from}.` }
  } catch {
    return { state: 'error', message: 'Tidak bisa menghubungi penyedia email. Periksa alamat API dan koneksi keluar.' }
  }
}
