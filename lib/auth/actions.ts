"use server";

import { prisma } from "@/lib/prisma";
import { burnPasswordCheck, verifyPassword } from "@/lib/auth/hash";
import { createSession, deleteSession } from "@/lib/auth/session";
import { loginSchema } from "@/schemas/auth";
import { redirect } from "next/navigation";
import { clientIp, writeAudit } from "@/lib/db/audit";
import { clearLoginFailures, loginLockedUntil, recordLoginFailure } from "@/lib/auth/login-attempts";
import { normalizeLoginEmail, retryMessage } from "@/lib/auth/rate-limit";

interface AuthResult {
  ok: boolean;
  errors?: string[];
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

  const user = await prisma.user.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" } },
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
    role: user.role,
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
