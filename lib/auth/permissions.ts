import { UserRole } from "@/lib/generated/prisma/client";

export function canManage(user: { role: UserRole }): boolean {
  return user.role === "MANAGER";
}

export function canEditEntry(
  user: { id: string; role: UserRole },
  entryAuthorId: string,
  entryStatus: string,
): boolean {
  if (user.role === "MANAGER") return true;
  return user.id === entryAuthorId && entryStatus === "DRAFT";
}

export function canVerifyEntry(user: { role: UserRole }): boolean {
  return user.role === "MANAGER";
}

export function canCorrectEntry(user: { role: UserRole }): boolean {
  return user.role === "MANAGER";
}

export function canDeleteEntry(user: { role: UserRole }): boolean {
  return user.role === "MANAGER";
}
