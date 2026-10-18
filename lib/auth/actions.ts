"use server";

import { prisma } from "@/lib/prisma";
import { burnPasswordCheck, hashToken, verifyPassword } from "@/lib/auth/hash";
import { createSession, deleteSession } from "@/lib/auth/session";
import { loginSchema, inviteSchema } from "@/schemas/auth";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/users";
import { canManage } from "@/lib/auth/permissions";
import { randomBytes } from "crypto";
import { clientIp, writeAudit } from "@/lib/db/audit";
import { clearLoginFailures, loginLockedUntil, recordLoginFailure } from "@/lib/auth/login-attempts";
import { normalizeLoginEmail, retryMessage } from "@/lib/auth/rate-limit";

interface AuthResult {
  ok: boolean;
  errors?: string[];
  message?: string;
  inviteUrl?: string;
}

export async function login(
  _prevState: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const validated = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return {
      ok: false,
      errors: Object.values(validated.error.flatten().fieldErrors).flat(),
    };
  }

  const { email, password } = validated.data;
  const attemptKey = normalizeLoginEmail(email);
  const ip = await clientIp();

  const locked = await loginLockedUntil(attemptKey, ip);
  if (locked) {
    return { ok: false, errors: [retryMessage(locked, new Date())] };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  let passwordValid = false;
  if (user && user.active && user.passwordHash) {
    passwordValid = await verifyPassword(password, user.passwordHash);
  } else {
    await burnPasswordCheck(password);
  }

  if (!user || !passwordValid) {
    await recordLoginFailure(attemptKey, ip);
    return { ok: false, errors: ["Nieprawidłowy e-mail lub hasło"] };
  }

  await clearLoginFailures(attemptKey, ip);

  await createSession({
    userId: user.id,
    role: user.role as "MANAGER" | "EMPLOYEE",
  });

  await writeAudit({
    userId: user.id,
    userName: user.name || user.email,
    action: "LOGIN",
    entity: "User",
    entityId: user.id,
    ipAddress: ip,
  });

  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}

export async function inviteUser(
  _prevState: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const user = await getCurrentUser();
  if (!canManage(user)) {
    return { ok: false, errors: ["Brak uprawnień"] };
  }

  const validated = inviteSchema.safeParse({
    email: formData.get("email"),
  });

  if (!validated.success) {
    return {
      ok: false,
      errors: Object.values(validated.error.flatten().fieldErrors).flat(),
    };
  }

  const { email } = validated.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, errors: ["Użytkownik z tym adresem e-mail już istnieje"] };
  }

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await prisma.user.create({
    data: {
      email,
      passwordHash: "",
      invitationToken: hashToken(token),
      invitationExpires: expires,
      role: "EMPLOYEE",
    },
  });

  // TODO: send invite e-mail (Resend)
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/zaproszenie?token=${token}`;

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name || user.email,
      action: "CREATE",
      entity: "User",
      details: JSON.stringify({ email }),
    },
  });

  return { ok: true, message: `Zaproszenie utworzone dla ${email}`, inviteUrl };
}
