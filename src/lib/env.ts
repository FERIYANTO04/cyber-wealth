/** A value counts as unset when it is empty or an obvious placeholder. */
export function isPlaceholder(value: string | undefined | null): boolean {
  if (!value) return true
  return /placeholder|XXXX|your[-_ ]?key|changeme|not-for-production/i.test(value)
}
