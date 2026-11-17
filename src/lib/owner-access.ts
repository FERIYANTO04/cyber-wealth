import { isPlaceholder } from './env'

/**
 * Who may hold the owner account. When OWNER_EMAILS names one or more addresses,
 * only those addresses can create or use the owner console — so publishing the app
 * can never hand the console to whichever stranger opens /login first.
 *
 * Left unset (or still the example value), the app keeps the simple first-visitor
 * rule, which is what makes a preview usable before the owner has decided.
 */
export function ownerEmails(): string[] {
  const raw = process.env.OWNER_EMAILS
  if (!raw || isPlaceholder(raw)) return []
  return raw
    .split(/[,\s]+/)
    .map((value) => value.trim().toLowerCase())
    .filter((value) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value))
}

export function isRestricted(): boolean {
  return ownerEmails().length > 0
}

export function isAllowedOwnerEmail(email: string): boolean {
  const list = ownerEmails()
  if (list.length === 0) return true
  return list.includes(email.trim().toLowerCase())
}
