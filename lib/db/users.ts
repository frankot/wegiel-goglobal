import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { verifySession, deleteSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true, active: true },
  });

  if (!user || !user.active) {
    await deleteSession();
    redirect("/login");
  }

  return user;
});

export type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;
