/** Runtime prerequisites for the member wallet. Never treat a local fallback DB or
 * the example JWT secret as a production configuration. */
export function memberReadinessError(): string | null {
  if (!process.env.DATABASE_URL || !/^postgres(?:ql)?:\/\//i.test(process.env.DATABASE_URL)) {
    return 'DATABASE_URL belum dikonfigurasi dengan alamat PostgreSQL yang valid.'
  }
  const secret = process.env.JWT_SECRET ?? ''
  if (secret.length < 32 || /change-me|replace|example|development/i.test(secret)) {
    return 'JWT_SECRET belum aman. Isi secret acak minimal 32 karakter di environment hosting.'
  }
  return null
}
