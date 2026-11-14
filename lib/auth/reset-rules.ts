/** Password reset rules */

export const RESET_TTL_MS = 60 * 60 * 1000;
export const RESET_COOLDOWN_MS = 5 * 60 * 1000;

/** True when a link was issued less than RESET_COOLDOWN_MS ago. */
export function recentlyIssued(expires: Date | null, now = new Date()): boolean {
  if (!expires) return false;
  const issuedAt = expires.getTime() - RESET_TTL_MS;
  return now.getTime() - issuedAt < RESET_COOLDOWN_MS;
}
