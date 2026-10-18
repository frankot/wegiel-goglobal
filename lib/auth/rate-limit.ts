/** Login rate limit */

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILURES_PER_ACCOUNT_IP = 5;
export const MAX_FAILURES_PER_IP = 20;

export function lockedUntil(failures: Date[], limit: number, now: Date): Date | null {
  const inWindow = failures
    .filter((d) => now.getTime() - d.getTime() < LOGIN_WINDOW_MS)
    .sort((a, b) => a.getTime() - b.getTime());
  if (inWindow.length < limit) return null;
  return new Date(inWindow[inWindow.length - limit]!.getTime() + LOGIN_WINDOW_MS);
}

export function normalizeLoginEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function retryMessage(until: Date, now: Date): string {
  const minutes = Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 60_000));
  return `Zbyt wiele nieudanych prób logowania. Spróbuj ponownie za ${minutes} min.`;
}
