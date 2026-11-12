"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword, hashToken } from "@/lib/auth/hash";
import { createSession } from "@/lib/auth/session";
import { signupSchema } from "@/schemas/auth";
import { redirect } from "next/navigation";

interface SignupResult {
  ok: boolean;
  errors?: string[];
}

export async function activateAccount(
  _prevState: SignupResult | null,
  formData: FormData,
): Promise<SignupResult> {
  const validated = signupSchema.safeParse({
    name: formData.get("name"),
    password: formData.get("password"),
    token: formData.get("token"),
  });

  if (!validated.success) {
    return {
      ok: false,
      errors: Object.values(validated.error.flatten().fieldErrors).flat(),
    };
  }

  const { name, password, token } = validated.data;

  const user = await prisma.user.findFirst({
    where: {
      invitationToken: hashToken(token),
      invitationExpires: { gte: new Date() },
      active: true,
    },
  });

  if (!user) {
    return {
      ok: false,
      errors: ["Link aktywacyjny jest nieprawidłowy lub wygasł"],
    };
  }

  const hashedPassword = await hashPassword(password);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      passwordHash: hashedPassword,
      invitationToken: null,
      invitationExpires: null,
      active: true,
    },
  });

  await createSession({
    userId: user.id,
    role: user.role,
  });

  redirect("/dashboard");
}
