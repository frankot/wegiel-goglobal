import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true, active: true },
  });

  if (!user || !user.active) redirect("/api/auth/session-expired");

  return user;
});

export type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;

export type UserStatus = "ACTIVE" | "INACTIVE" | "INVITED" | "EXPIRED";

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  status: UserStatus;
  invitationExpires: string | null;
  createdAt: string;
}

export async function listUsers(includeAdmins: boolean): Promise<UserRow[]> {
  const rows = await prisma.user.findMany({
    where: includeAdmins ? undefined : { role: { not: "ADMIN" } },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      passwordHash: true,
      invitationExpires: true,
      createdAt: true,
    },
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
  });
  const now = new Date();
  return rows.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    status: !u.active
      ? "INACTIVE"
      : u.passwordHash
        ? "ACTIVE"
        : u.invitationExpires && u.invitationExpires > now
          ? "INVITED"
          : "EXPIRED",
    invitationExpires: u.invitationExpires?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  }));
}
