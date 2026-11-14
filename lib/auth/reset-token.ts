import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth/hash";
import { RESET_TTL_MS } from "@/lib/auth/reset-rules";

export { recentlyIssued } from "@/lib/auth/reset-rules";

/** Password reset tokens */

export async function issueResetLink(userId: string): Promise<{ url: string; expires: Date }> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + RESET_TTL_MS);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordResetToken: hashToken(token), passwordResetExpires: expires },
  });
  return { url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/nowe-haslo?token=${token}`, expires };
}
