import { desc } from 'drizzle-orm'
import { connect as netConnect, type Socket } from 'node:net'
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
    smtpUser: (process.env.SMTP_USER ?? '').trim(),
    // Google displays App Passwords in groups of four; ignore copied whitespace.
    smtpPassword: (process.env.SMTP_APP_PASSWORD ?? '').replace(/\s+/g, ''),
  }
}

function smtpConfigured() {
  const c = emailConfig()
  return !isPlaceholder(c.smtpUser) && !isPlaceholder(c.smtpPassword)
}

function apiKeyConfigured() {
  return !isPlaceholder(emailConfig().key)
}

function apiConfigured() {
  const c = emailConfig()
  return apiKeyConfigured() && !isPlaceholder(c.from)
}

async function sendViaEmailApi(input: EmailInput): Promise<string> {
  const c = emailConfig()
  if (!apiConfigured()) throw new Error('Resend belum dikonfigurasi dengan alamat pengirim.')
  const response = await fetch(`${c.baseUrl}/emails`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${c.key}` },
    body: JSON.stringify({ from: c.from, to: [input.to.trim().toLowerCase()], subject: input.subject, text: input.body }),
    signal: AbortSignal.timeout(15000),
    cache: 'no-store',
  })
  const payload = (await response.json().catch(() => null)) as { id?: string; message?: string } | null
  if (!response.ok) throw new Error(`Resend menjawab ${response.status}${payload?.message ? ': ' + payload.message : '.'}`)
  return payload?.id ? `Resend menerima pesan (id ${payload.id}).` : 'Resend menerima pesan.'
}

export function emailConfigured(): boolean {
  // Prefer Gmail SMTP, with the configured email API as a delivery fallback.
  return smtpConfigured() || apiConfigured()
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

async function gmailSmtp(input?: EmailInput, portOverride?: number): Promise<void> {
  const c = emailConfig()
  const port = portOverride ?? c.smtpPort
  if (!smtpConfigured()) throw new Error('SMTP_USER atau SMTP_APP_PASSWORD belum diatur.')
  if (port !== 465 && port !== 587) throw new Error('Port Gmail SMTP harus 465 atau 587.')

  let socket: Socket | TLSSocket = port === 465
    ? tlsConnect({ host: c.smtpHost, port, servername: c.smtpHost, rejectUnauthorized: true })
    : netConnect({ host: c.smtpHost, port })

  const attachReader = (target: Socket | TLSSocket) => {
    let buffer = ''
    const replies: string[] = []
    const waiters: { resolve: (reply: string) => void; reject: (error: Error) => void }[] = []
    let pendingError: Error | null = null
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString('utf8')
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() ?? ''
      let current = ''
      for (const line of lines) {
        current += (current ? '\n' : '') + line
        if (/^\d{3} /.test(line)) {
          const waiter = waiters.shift()
          if (waiter) waiter.resolve(current)
          else replies.push(current)
          current = ''
        }
      }
    }
    const onError = (error: Error) => {
      pendingError = error
      const waiter = waiters.shift()
      if (waiter) waiter.reject(error)
    }
    const onClose = () => {
      const error = new Error('Koneksi SMTP terputus.')
      pendingError = error
      const waiter = waiters.shift()
      if (waiter) waiter.reject(error)
    }
    target.on('data', onData)
    target.on('error', onError)
    target.on('close', onClose)
    const readReply = () => {
      if (replies.length) return Promise.resolve(replies.shift() as string)
      if (pendingError) return Promise.reject(pendingError)
      return new Promise<string>((resolve, reject) => waiters.push({ resolve, reject }))
    }
    const command = async (value: string, accepted: number[]) => {
      target.write(value + '\r\n')
      const reply = await readReply()
      const code = Number(reply.slice(0, 3))
      if (!accepted.includes(code)) throw new Error('SMTP ' + code + ': ' + reply.slice(0, 300))
      return reply
    }
    return {
      readReply,
      command,
      detach: () => {
        target.removeListener('data', onData)
        target.removeListener('error', onError)
        target.removeListener('close', onClose)
      },
    }
  }

  socket.setTimeout(15000, () => socket.destroy(new Error('SMTP timeout')))
  let reader = attachReader(socket)
  try {
    if (port === 465) {
      await new Promise<void>((resolve, reject) => {
        (socket as TLSSocket).once('secureConnect', resolve)
        socket.once('error', reject)
      })
    } else {
      await new Promise<void>((resolve, reject) => {
        socket.once('connect', resolve)
        socket.once('error', reject)
      })
    }

    const greeting = await reader.readReply()
    if (!greeting.startsWith('220')) throw new Error('Server Gmail tidak menerima koneksi SMTP.')
    await reader.command('EHLO cyber-wealth.local', [250])

    if (port === 587) {
      await reader.command('STARTTLS', [220])
      reader.detach()
      socket = tlsConnect({
        socket: socket as Socket,
        servername: c.smtpHost,
        rejectUnauthorized: true,
      })
      socket.setTimeout(15000, () => socket.destroy(new Error('SMTP TLS timeout')))
      reader = attachReader(socket)
      await new Promise<void>((resolve, reject) => {
        socket.once('secureConnect', resolve)
        socket.once('error', reject)
      })
      await reader.command('EHLO cyber-wealth.local', [250])
    }

    await reader.command('AUTH LOGIN', [334])
    await reader.command(Buffer.from(c.smtpUser).toString('base64'), [334])
    await reader.command(Buffer.from(c.smtpPassword).toString('base64'), [235])
    if (!input) {
      await reader.command('QUIT', [221])
      return
    }
    const from = c.smtpUser
    const to = input.to.trim().toLowerCase()
    const safeSubject = input.subject.replace(/[\r\n]+/g, ' ').trim()
    await reader.command('MAIL FROM:<' + from + '>', [250])
    await reader.command('RCPT TO:<' + to + '>', [250, 251])
    await reader.command('DATA', [354])
    const encodedBody = Buffer.from(input.body, 'utf8').toString('base64').match(/.{1,76}/g)?.join('\r\n') ?? ''
    const message = [
      'From: Cyber Wealth <' + from + '>',
      'To: <' + to + '>',
      'Subject: =?UTF-8?B?' + Buffer.from(safeSubject).toString('base64') + '?=',
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      encodedBody,
      '.',
      '',
    ].join('\r\n')
    socket.write(message)
    const sent = await reader.readReply()
    if (!sent.startsWith('250')) throw new Error('Gmail menolak pesan: ' + sent.slice(0, 300))
    await reader.command('QUIT', [221])
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
  } else if (!smtpConfigured() && apiKeyConfigured() && !apiConfigured()) {
    status = 'queued'
    detail = 'Kunci API email tersedia, tetapi EMAIL_FROM belum diatur ke alamat pada domain pengirim yang sudah diverifikasi.'
  } else if (!emailConfigured()) {
    status = 'queued'
    detail = 'Email belum terkirim. Penyedia email belum dikonfigurasi.'
  } else {
    try {
      if (smtpConfigured()) {
        try {
          await gmailSmtp(input)
          status = 'sent'
          detail = 'Gmail menerima pesan melalui SMTP.'
        } catch (smtpError) {
          const errorText = (error: unknown) => error instanceof Error
            ? (error.message.trim() || error.name)
            : (String(error ?? 'error tidak diketahui').trim() || 'error tidak diketahui')
          let smtpFailure = 'Gmail SMTP port ' + c.smtpPort + ': ' + errorText(smtpError)
          if (c.smtpPort === 465) {
            try {
              await gmailSmtp(input, 587)
              status = 'sent'
              detail = 'Gmail SMTP berhasil melalui STARTTLS port 587.'
            } catch (starttlsError) {
              smtpFailure += '; STARTTLS port 587: ' + errorText(starttlsError)
            }
          }
          if (status !== 'sent') {
            if (!apiConfigured()) throw new Error(smtpFailure)
            try {
              const fallbackDetail = await sendViaEmailApi(input)
              status = 'sent'
              detail = smtpFailure + '; jalur cadangan aktif. ' + fallbackDetail
            } catch (apiError) {
              throw new Error(smtpFailure + '; ' + errorText(apiError))
            }
          }
        }
      } else {
        detail = await sendViaEmailApi(input)
        status = 'sent'
      }
    } catch (error) {
      status = 'failed'
      detail = error instanceof Error ? error.message.slice(0, 500) : String(error ?? 'Pengiriman email gagal.').slice(0, 500)
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

  // Check the transactional API first. The API key is already provisioned in
  // Railway; this makes Gmail SMTP irrelevant unless no API key exists.
  if (!smtpConfigured() && apiKeyConfigured()) {
    try {
      const response = await fetch(`${c.baseUrl}/domains`, {
        headers: { Authorization: `Bearer ${c.key}` },
        cache: 'no-store',
      })
      if (response.status === 401 || response.status === 403) {
        return { state: 'invalid', message: 'Penyedia email menolak kunci API.' }
      }
      if (!response.ok) return { state: 'error', message: `Penyedia email menjawab ${response.status}.` }
      const payload = (await response.json().catch(() => null)) as { data?: { name?: string; status?: string }[] } | null
      if (isPlaceholder(c.from)) {
        return { state: 'missing', message: 'Kunci API email valid. EMAIL_FROM belum diisi dengan alamat pada domain pengirim yang terverifikasi.' }
      }
      const senderAddress = c.from.match(/<([^>]+)>/)?.[1] ?? c.from
      const senderDomain = senderAddress.split('@').pop()?.trim().toLowerCase() ?? ''
      const verified = (payload?.data ?? []).some(d => d.name?.trim().toLowerCase() === senderDomain && d.status?.toLowerCase() === 'verified')
      return verified
        ? { state: 'ready', message: `Domain pengirim terverifikasi. Pengirim: ${c.from}.` }
        : { state: 'unverified', message: `Domain pengirim ${senderDomain || '(tidak valid)'} belum terverifikasi.` }
    } catch {
      return { state: 'error', message: 'Tidak bisa menghubungi penyedia email API.' }
    }
  }

  if (smtpConfigured()) {
    try {
      await gmailSmtp()
      return { state: 'ready', message: `Gmail SMTP berhasil diautentikasi untuk ${c.smtpUser}.` }
    } catch (error) {
      let smtpDetail = error instanceof Error
        ? (error.message.trim() || error.name)
        : (String(error ?? 'koneksi SMTP gagal').trim() || 'koneksi SMTP gagal')
      if (c.smtpPort === 465) {
        try {
          await gmailSmtp(undefined, 587)
          return { state: 'ready', message: 'Gmail SMTP berhasil diautentikasi melalui STARTTLS port 587 untuk ' + c.smtpUser + '.' }
        } catch (starttlsError) {
          const detail = starttlsError instanceof Error
            ? (starttlsError.message.trim() || starttlsError.name)
            : (String(starttlsError ?? 'error tidak diketahui').trim() || 'error tidak diketahui')
          smtpDetail += '; STARTTLS port 587: ' + detail
        }
      }
      if (apiConfigured()) {
        try {
          const response = await fetch(`${c.baseUrl}/domains`, {
            headers: { Authorization: `Bearer ${c.key}` },
            cache: 'no-store',
            signal: AbortSignal.timeout(10000),
          })
          if (response.ok) {
            const payload = (await response.json().catch(() => null)) as { data?: { id?: string; name?: string; status?: string }[] } | null
            const senderAddress = c.from.match(/<([^>]+)>/)?.[1] ?? c.from
            const senderDomain = senderAddress.split('@').pop()?.trim().toLowerCase() ?? ''
            const domain = (payload?.data ?? []).find(d => d.name?.trim().toLowerCase() === senderDomain)
            const verified = domain?.status?.toLowerCase() === 'verified'
            if (verified) return { state: 'ready', message: `Gmail SMTP gagal (${smtpDetail.slice(0, 120)}); Resend domain terverifikasi dan siap menjadi jalur cadangan untuk ${c.from}.` }
            let dnsHint = ''
            if (!domain) {
              dnsHint = ' Domain tidak ditemukan dalam daftar Resend.'
            } else if (!domain.id) {
              dnsHint = ' Resend tidak mengembalikan ID domain.'
            } else {
              try {
                const detailResponse = await fetch(`${c.baseUrl}/domains/${encodeURIComponent(domain.id)}`, {
                  headers: { Authorization: `Bearer ${c.key}` },
                  cache: 'no-store',
                  signal: AbortSignal.timeout(10000),
                })
                if (!detailResponse.ok) {
                  dnsHint = ' Detail DNS Resend menjawab HTTP ' + detailResponse.status + '.'
                } else {
                  const detailPayload = await detailResponse.json().catch(() => null) as { records?: { type?: string; name?: string; value?: string; status?: string }[]; data?: { records?: { type?: string; name?: string; value?: string; status?: string }[] } } | null
                  const records = detailPayload?.records ?? detailPayload?.data?.records ?? []
                  const pending = records.filter(record => record.status?.toLowerCase() !== 'verified')
                  if (pending.length) {
                    dnsHint = ' DNS belum lolos: ' + pending.map(record => [record.type, record.name, record.value, record.status].filter(Boolean).join(' ')).join(' | ').slice(0, 300)
                  } else if (!records.length) {
                    dnsHint = ' Resend tidak mengembalikan daftar DNS records untuk domain ini.'
                  } else {
                    dnsHint = ' Resend mengembalikan ' + records.length + ' records, tetapi status domain belum verified.'
                  }
                }
              } catch (detailError) {
                const detail = detailError instanceof Error ? detailError.message : 'timeout'
                dnsHint = ' Gagal membaca DNS Resend: ' + detail.slice(0, 120)
              }
            }
            return { state: 'unverified', message: `Gmail SMTP gagal (${smtpDetail.slice(0, 120)}); domain Resend ${senderDomain || '(tidak valid)'} belum terverifikasi.${dnsHint}` }
          }
          return { state: 'error', message: `Gmail SMTP gagal (${smtpDetail.slice(0, 120)}); Resend menjawab ${response.status}.` }
        } catch {
          return { state: 'error', message: `Gmail SMTP gagal (${smtpDetail.slice(0, 120)}); jalur cadangan Resend tidak dapat diperiksa.` }
        }
      }
      return { state: 'invalid', message: `Gmail SMTP: ${smtpDetail.slice(0, 300) || 'gagal merespons.'}` }
    }
  }

  return { state: 'missing', message: 'Email belum terhubung. Tambahkan kunci API email atau konfigurasi SMTP.' }
}
