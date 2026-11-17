import { and, isNotNull, lt, or } from 'drizzle-orm'
import { db } from './db'
import { customerTokens, loginAttempt } from './db/schema'

export type HousekeepingResult = {
  clearedLockouts: number
  removedTokens: number
}

/**
 * Small daily tidy-up: unlock sign-in counters whose lock has run out and delete
 * one-off links that can no longer be used. Nothing here touches money or a
 * customer's own rows.
 */
export async function runHousekeeping(): Promise<HousekeepingResult> {
  const now = new Date()

  const clearedLockouts = await db
    .delete(loginAttempt)
    .where(or(and(isNotNull(loginAttempt.lockedUntil), lt(loginAttempt.lockedUntil, now)), lt(loginAttempt.windowStart, new Date(now.getTime() - 24 * 60 * 60 * 1000))))
    .returning({ email: loginAttempt.email })

  const removedTokens = await db
    .delete(customerTokens)
    .where(or(lt(customerTokens.expiresAt, now), isNotNull(customerTokens.usedAt)))
    .returning({ id: customerTokens.id })

  return {
    clearedLockouts: clearedLockouts.length,
    removedTokens: removedTokens.length,
  }
}
