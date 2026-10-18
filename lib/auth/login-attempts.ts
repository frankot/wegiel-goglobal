import "server-only";
import { prisma } from "@/lib/prisma";
import {
  LOGIN_WINDOW_MS,
  MAX_FAILURES_PER_ACCOUNT_IP,
  MAX_FAILURES_PER_IP,
  lockedUntil,
} from "./rate-limit";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function loginLockedUntil(email: string, ip: string | undefined): Promise<Date | null> {
  const now = new Date();
  const since = new Date(now.getTime() - LOGIN_WINDOW_MS);

  const [accountFailures, ipFailures] = await Promise.all([
    prisma.loginAttempt.findMany({
      where: { email, ipAddress: ip ?? null, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    ip
      ? prisma.loginAttempt.findMany({
          where: { ipAddress: ip, createdAt: { gte: since } },
          select: { createdAt: true },
        })
      : Promise.resolve([]),
  ]);

  const until = [
    lockedUntil(accountFailures.map((f) => f.createdAt), MAX_FAILURES_PER_ACCOUNT_IP, now),
    lockedUntil(ipFailures.map((f) => f.createdAt), MAX_FAILURES_PER_IP, now),
  ].filter((d): d is Date => d !== null);

  return until.length ? new Date(Math.max(...until.map((d) => d.getTime()))) : null;
}

export async function recordLoginFailure(email: string, ip: string | undefined): Promise<void> {
  await prisma.$transaction([
    prisma.loginAttempt.create({ data: { email, ipAddress: ip ?? null } }),
    prisma.loginAttempt.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - DAY_MS) } },
    }),
  ]);
}

export async function clearLoginFailures(email: string, ip: string | undefined): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { email, ipAddress: ip ?? null } });
}
