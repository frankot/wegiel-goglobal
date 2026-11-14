"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, hashToken } from "@/lib/auth/hash";
import { clientIp, writeAudit } from "@/lib/db/audit";
import { getCompany } from "@/lib/db/company";
import { issueResetLink, recentlyIssued } from "@/lib/auth/reset-token";
import { sendPasswordResetEmail } from "@/lib/email/password-reset";
import { newPasswordSchema, resetRequestSchema } from "@/schemas/auth";

interface ResetResult {
  ok: boolean;
  errors?: string[];
  message?: string;
}

const GENERIC =
  "Jeśli konto z tym adresem istnieje, wysłaliśmy na nie link do ustawienia nowego hasła. Sprawdź skrzynkę (także folder spam).";

export async function requestPasswordReset(_prev: ResetResult | null, formData: FormData): Promise<ResetResult> {
  const parsed = resetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((i) => i.message) };

  const user = await prisma.user.findFirst({
    where: { email: { equals: parsed.data.email, mode: "insensitive" } },
    select: { id: true, email: true, name: true, active: true, passwordHash: true, passwordResetExpires: true },
  });

  if (user && user.active && user.passwordHash && !recentlyIssued(user.passwordResetExpires)) {
    const { url, expires } = await issueResetLink(user.id);
    const company = await getCompany();
    const mail = await sendPasswordResetEmail({
      to: user.email,
      url,
      expires,
      companyName: company?.shortName || company?.name,
    });
    if (!mail.sent) console.error("Nie udało się wysłać linku do zmiany hasła:", mail.reason);
    await writeAudit({
      userId: user.id,
      userName: user.name || user.email,
      action: "UPDATE",
      entity: "User",
      entityId: user.id,
      details: JSON.stringify({ email: user.email, passwordResetRequested: true, emailSent: mail.sent }),
      ipAddress: await clientIp(),
    });
  }

  return { ok: true, message: GENERIC };
}

export async function resetPassword(_prev: ResetResult | null, formData: FormData): Promise<ResetResult> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
    token: formData.get("token"),
  });
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((i) => i.message) };

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: hashToken(parsed.data.token),
      passwordResetExpires: { gte: new Date() },
      active: true,
    },
    select: { id: true, email: true, name: true },
  });
  if (!user) return { ok: false, errors: ["Link jest nieprawidłowy lub wygasł. Poproś o nowy."] };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(parsed.data.password),
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    }),
    prisma.loginAttempt.deleteMany({ where: { email: user.email } }),
  ]);

  await writeAudit({
    userId: user.id,
    userName: user.name || user.email,
    action: "UPDATE",
    entity: "User",
    entityId: user.id,
    details: JSON.stringify({ email: user.email, passwordReset: true }),
    ipAddress: await clientIp(),
  });

  redirect("/login?haslo=zmienione");
}
