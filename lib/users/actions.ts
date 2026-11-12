"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, type CurrentUser } from "@/lib/db/users";
import { getCompany } from "@/lib/db/company";
import { clientIp, writeAudit } from "@/lib/db/audit";
import { hashToken } from "@/lib/auth/hash";
import { assignableRoles, canManage, canManageUser, type Role } from "@/lib/auth/permissions";
import { sendInviteEmail } from "@/lib/email/invite";
import { inviteSchema } from "@/schemas/auth";

export interface UserActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: { email?: string; role?: string };
  message?: string;
  inviteUrl?: string;
}

const INVITE_DAYS = 7;

async function audit(actor: CurrentUser, action: "CREATE" | "UPDATE" | "DELETE", entityId: string, details: object) {
  await writeAudit({
    userId: actor.id,
    userName: actor.name || actor.email,
    action,
    entity: "User",
    entityId,
    details: JSON.stringify(details),
    ipAddress: await clientIp(),
  });
}

async function issueInvite(
  actor: CurrentUser,
  target: { id: string; email: string; role: string },
): Promise<UserActionResult> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);
  await prisma.user.update({
    where: { id: target.id },
    data: { invitationToken: hashToken(token), invitationExpires: expires },
  });

  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/zaproszenie?token=${token}`;
  const company = await getCompany();
  const mail = await sendInviteEmail({
    to: target.email,
    url,
    role: target.role,
    inviterName: actor.name || actor.email,
    companyName: company?.shortName || company?.name,
    expires,
  });

  revalidatePath("/admin");
  return mail.sent
    ? { ok: true, message: `Wysłano zaproszenie na adres ${target.email}.` }
    : {
        ok: true,
        message: `Konto utworzone, ale e-mail nie został wysłany: ${mail.reason} Przekaż link osobie zapraszanej.`,
        inviteUrl: url,
      };
}

async function loadTarget(actor: CurrentUser, userId: string) {
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, active: true, passwordHash: true },
  });
  if (!target || !canManageUser(actor, target)) return null;
  return target;
}

export async function inviteUser(formData: FormData): Promise<UserActionResult> {
  const actor = await getCurrentUser();
  if (!canManage(actor)) return { ok: false, error: "Brak uprawnień" };

  const parsed = inviteSchema.safeParse({ email: formData.get("email"), role: formData.get("role") });
  if (!parsed.success) {
    const fieldErrors: UserActionResult["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as "email" | "role";
      fieldErrors[field] ??= issue.message;
    }
    return { ok: false, fieldErrors };
  }
  const { email, role } = parsed.data;
  if (!assignableRoles(actor).includes(role)) {
    return { ok: false, fieldErrors: { role: "Nie możesz nadać tej roli" } };
  }

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { passwordHash: true },
  });
  if (existing) {
    return {
      ok: false,
      fieldErrors: {
        email: existing.passwordHash
          ? "Konto z tym adresem już istnieje"
          : "Zaproszenie dla tego adresu już istnieje — użyj „Wyślij ponownie” na liście",
      },
    };
  }

  const user = await prisma.user.create({
    data: { email, role, passwordHash: "", active: true },
    select: { id: true, email: true, role: true },
  });
  await audit(actor, "CREATE", user.id, { email, role, invitedBy: actor.email });
  return issueInvite(actor, user);
}

export async function resendInvite(userId: string): Promise<UserActionResult> {
  const actor = await getCurrentUser();
  const target = await loadTarget(actor, userId);
  if (!target) return { ok: false, error: "Brak uprawnień" };
  if (target.passwordHash) return { ok: false, error: "Konto jest już aktywne" };
  if (!target.active) return { ok: false, error: "Konto jest dezaktywowane" };

  await audit(actor, "UPDATE", target.id, { resendInvite: target.email });
  return issueInvite(actor, target);
}

export async function cancelInvite(userId: string): Promise<UserActionResult> {
  const actor = await getCurrentUser();
  const target = await loadTarget(actor, userId);
  if (!target) return { ok: false, error: "Brak uprawnień" };
  if (target.passwordHash) return { ok: false, error: "Konta aktywnego nie można usunąć — dezaktywuj je" };

  await prisma.user.delete({ where: { id: target.id } });
  await audit(actor, "DELETE", target.id, { cancelInvite: target.email });
  revalidatePath("/admin");
  return { ok: true, message: `Anulowano zaproszenie dla ${target.email}.` };
}

export async function changeUserRole(userId: string, role: Role): Promise<UserActionResult> {
  const actor = await getCurrentUser();
  const target = await loadTarget(actor, userId);
  if (!target) return { ok: false, error: "Brak uprawnień" };
  if (!assignableRoles(actor).includes(role)) return { ok: false, error: "Nie możesz nadać tej roli" };
  if (target.role === role) return { ok: true };

  await prisma.user.update({ where: { id: target.id }, data: { role } });
  await audit(actor, "UPDATE", target.id, { email: target.email, role: { from: target.role, to: role } });
  revalidatePath("/admin");
  return { ok: true };
}

export async function setUserActive(userId: string, active: boolean): Promise<UserActionResult> {
  const actor = await getCurrentUser();
  const target = await loadTarget(actor, userId);
  if (!target) return { ok: false, error: "Brak uprawnień" };

  await prisma.user.update({ where: { id: target.id }, data: { active } });
  await audit(actor, "UPDATE", target.id, { email: target.email, active: { from: target.active, to: active } });
  revalidatePath("/admin");
  return { ok: true };
}
