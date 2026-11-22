import { desc } from 'drizzle-orm'
import { connect as tlsConnect, type TLSSocket } from 'node:tls'
import { db } from './db'
import { emailMessages, ownerAccount } from './db/schema'
import { isPlaceholder } from './env'

/** Supports Gmail SMTP (App Password) and the existing Resend-compatible API. */

export function emailConfig() {
  return {
    key: process.env.EMAIL_API_KEY ?? '',
    from: process.env.EMAIL_FROM ?? '',
    baseUrl: (process.env.EMAIL_API_BASE_URL || 'https://api.resend.com').replace(/\/+$/, ''),
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: Number(process.env.SMTP_PORT || 465),
    smtpUser: process.env.SMTP_USER ?? '',
    smtpPassword: process.env.SMTP_APP_PASSWORD ?? '',
  }
}

function smtpConfigured() {
  const c = emailConfig()
  return !isPlaceholder(c.smtpUser) && !isPlaceholder(c.smtpPassword)
}

export function emailConfigured(): boolean {
  const c = emailConfig()
  return smtpConfigured() || (!isPlaceholder(c.key) && !isPlaceholder(c.from))
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

async function gmailSmtp(input?: EmailInput): Promise<void> {
  const c = emailConfig()
  if (!smtpConfigured()) throw new Error('SMTP_USER atau SMTP_APP_PASSWORD belum diatur.')
  const socket: TLSSocket = tlsConnect({
    host: c.smtpHost,
    port: c.smtpPort,
    servername: c.smtpHost,
    rejectUnauthorized: true,
  })
  socket.setTimeout(15000, () => socket.destroy(new Error('SMTP timeout')))
  let buffer = ''
  const replies: string[] = []
  const waiters: Array<(reply: string) => void> = []
  socket.on('data', (chunk: Buffer) => {
    buffer += chunk.toString('utf8')
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''
    let current = ''
    for (const line of lines) {
      current += (current ? '\n' : '') + line
      if (/^\d{3} /.test(line)) {
        const waiter = waiters.shift()
        if (waiter) waiter(current)
        else replies.push(current)
        current = ''
      }
    }
  })
  const readReply = () => replies.length
    ? Promise.resolve(replies.shift() as string)
    : new Promise<string>((resolve, reject) => {
        waiters.push(resolve)
        socket.once('error', reject)
        socket.once('close', () => reject(new Error('Koneksi SMTP terputus.')))
      })
  const command = async (value: string, accepted: number[]) => {
    socket.write(value + '\r\n')
    const reply = await readReply()
    const code = Number(reply.slice(0, 3))
    if (!accepted.includes(code)) throw new Error('SMTP ' + code + ': ' + reply.slice(0, 300))
    return reply
  }
  try {
    await new Promise<void>((resolve, reject) => {
      socket.once('secureConnect', resolve)
      socket.once('error', reject)
    })
    const greeting = await readReply()
    if (!greeting.startsWith('220')) throw new Error('Server Gmail tidak menerima koneksi SMTP.')
    await command('EHLO cyber-wealth.local', [250])
    await command('AUTH LOGIN', [334])
    await command(Buffer.from(c.smtpUser).toString('base64'), [334])
    await command(Buffer.from(c.smtpPassword).toString('base64'), [235])
    if (!input) {
      await command('QUIT', [221])
      return
    }
    const from = c.smtpUser
    const to = input.to.trim().toLowerCase()
    const safeSubject = input.subject.replace(/[\r\n]+/g, ' ').trim()
    await command(`MAIL FROM:<${from}> `, [250])
    await command(`RCPT TO:<${to}>`, [250, 251])
    await command('DATA', [354])
    const encodedBody = Buffer.from(input.body, 'utf8').toString('base64').match(/.{1,76}/g)?.join('\r\n') ?? ''
    const message = [
      `From: Cyber Wealth <${from}>`,
      `To: <${to}>`,
      `Subject: =?UTF-8?B?${Buffer.from(safeSubject).toString('base64')}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      encodedBody,
      '.',
      '',
    ].join('\r\n')
    socket.write(message)
    const sent = await readReply()
    if (!sent.startsWith('250')) throw new Error('Gmail menolak pesan: ' + sent.slice(0, 300))
    await command('QUIT', [221])
  } finally {
    socket.end()
  }
}

export async function sendEmail(input: EmailInput): Promise<EmailResult> {
  const c = emailConfig()
  const to = input.to.trim().toLowerCase()
  let status = 'queued'
  let detail = 'Email tersimpan di antrean. Penyedia email belum terhubung, jadi belum ada yang terkirim.'

  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    status = 'failed'
    detail = 'Alamat email penerima tidak valid.'
  } else if (!emailConfigured()) {
    status = 'queued'
    detail = 'Email belum terkirim. Hubungkan Gmail dengan App Password atau isi konfigurasi penyedia email.'
  } else {
    try {
      if (smtpConfigured()) {
        await gmailSmtp(input)
        status = 'sent'
        detail = 'Gmail menerima pesan melalui SMTP.'
      } else {
        const response = await fetch(`${c.baseUrl}/emails`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${c.key}` },
          body: JSON.stringify({ from: c.from, to: [to], subject: input.subject, text: input.body }),
          signal: AbortSignal.timeout(15000),
          cache: 'no-store',
        })
        const payload = (await response.json().catch(() => null)) as { id?: string; message?: string } | null
        if (response.ok) {
          status = 'sent'
          detail = payload?.id ? `Diterima penyedia email (id ${payload.id}).` : 'Diterima penyedia email.'
        } else {
          status = 'failed'
          detail = `Penyedia email menjawab ${response.status}${payload?.message ? `: ${payload.message}` : ''}.`
        }
      }
    } catch (error) {
      status = 'failed'
      detail = error instanceof Error ? error.message.slice(0, 500) : 'Pengiriman email gagal.'
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
    await sendEmail({ to: owner.email, subject: input.subject, body, kind: input.kind, relatedType: 'owner', relatedId: input.relatedId })
  }
  return owners.length
}

export async function getEmailLog(limit = 40) {
  return db.select().from(emailMessages).orderBy(desc(emailMessages.createdAt)).limit(limit)
}

export async function testEmail(): Promise<{ state: 'ready' | 'missing' | 'invalid' | 'error' | 'unverified'; message: string }> {
  const c = emailConfig()
  if (smtpConfigured()) {
    try {
      await gmailSmtp()
      return { state: 'ready', message: `Gmail SMTP berhasil diautentikasi untuk ${c.smtpUser}.` }
    } catch (error) {
      return { state: 'invalid', message: error instanceof Error && error.message.trim() ? error.message.slice(0, 300) : 'Gmail SMTP gagal merespons. Periksa SMTP_USER, App Password Gmail, SMTP_HOST, dan SMTP_PORT.' }
    }
  }
  if (isPlaceholder(c.key)) {
    return { state: 'missing', message: 'Email belum terhubung. Gmail SMTP membutuhkan SMTP_USER dan SMTP_APP_PASSWORD (App Password Google).' }
  }
  try {
    const response = await fetch(`${c.baseUrl}/domains`, {
      headers: { Authorization: `Bearer ${c.key}` },
      cache: 'no-store',
    })
    if (response.status === 401 || response.status === 403) return { state: 'invalid', message: 'Penyedia email menolak kunci API.' }
    if (!response.ok) return { state: 'error', message: `Penyedia email menjawab ${response.status}.` }
    const payload = (await response.json().catch(() => null)) as { data?: { name?: string; status?: string }[] } | null
    if (isPlaceholder(c.from)) return { state: 'missing', message: 'EMAIL_FROM belum diisi.' }
    const senderDomain = c.from.split('@').pop()?.trim().toLowerCase() ?? ''
    const verified = (payload?.data ?? []).some(d => d.name?.trim().toLowerCase() === senderDomain && d.status?.toLowerCase() === 'verified')
    return verified
      ? { state: 'ready', message: `Domain pengirim terverifikasi. Pengirim: ${c.from}.` }
      : { state: 'unverified', message: `Domain pengirim ${senderDomain || '(tidak valid)'} belum terverifikasi.` }
  } catch {
    return { state: 'error', message: 'Tidak bisa menghubungi penyedia email.' }
  }
}
