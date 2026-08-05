"use server";

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/hash";
import { createSession, deleteSession } from "@/lib/auth/session";
import { loginSchema, inviteSchema } from "@/schemas/auth";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/users";
import { canManage } from "@/lib/auth/permissions";
import { randomBytes } from "crypto";

interface AuthResult {
  ok: boolean;
  errors?: string[];
  message?: string;
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

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.active) {
    return { ok: false, errors: ["Nieprawidłowy e-mail lub hasło"] };
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    return { ok: false, errors: ["Nieprawidłowy e-mail lub hasło"] };
  }

  await createSession({
    userId: user.id,
    role: user.role as "MANAGER" | "EMPLOYEE",
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name || user.email,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
    },
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
  const expires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

  await prisma.user.create({
    data: {
      email,
      passwordHash: "",
      invitationToken: token,
      invitationExpires: expires,
      role: "EMPLOYEE",
    },
  });

  // TODO: Send email via Resend (Phase 4)
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/zaproszenie?token=${token}`;
  console.log("📧 Invitation link:", inviteUrl);

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name || user.email,
      action: "CREATE",
      entity: "User",
      details: JSON.stringify({ email }),
    },
  });

  return { ok: true, message: `Zaproszenie wysłane na adres ${email}` };
}
