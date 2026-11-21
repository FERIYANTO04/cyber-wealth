import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const VERSION = 'v1'

function key(): Buffer {
  const secret = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY
  if (!secret || secret.length < 32) {
    throw new Error('SOCIAL_TOKEN_ENCRYPTION_KEY harus diisi dengan rahasia acak minimal 32 karakter.')
  }
  return createHash('sha256').update(secret, 'utf8').digest()
}

/** AES-256-GCM authenticated encryption; the plaintext token never reaches the browser. */
export function sealSocialToken(value: unknown): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.')
}

export function openSocialToken<T>(sealed: string): T {
  const [version, ivPart, tagPart, dataPart, extra] = sealed.split('.')
  if (version !== VERSION || !ivPart || !tagPart || !dataPart || extra) {
    throw new Error('Format token media sosial tidak valid.')
  }
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivPart, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'))
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
  return JSON.parse(plaintext) as T
}
