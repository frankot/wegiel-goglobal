/** Roles */

export type Role = "ADMIN" | "ANALYST" | "USER";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrator",
  ANALYST: "Analityk",
  USER: "Użytkownik",
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role as Role] ?? role;
}

export function isManagerRole(role: string): boolean {
  return role === "ADMIN" || role === "ANALYST";
}

export function canManage(user: { role: string }): boolean {
  return isManagerRole(user.role);
}

export function canEditEntry(
  user: { id: string; role: string },
  entryAuthorId: string,
  entryStatus: string,
): boolean {
  if (isManagerRole(user.role)) return true;
  return user.id === entryAuthorId && entryStatus === "DRAFT";
}

export function canVerifyEntry(user: { role: string }): boolean {
  return isManagerRole(user.role);
}

export function canCorrectEntry(user: { role: string }): boolean {
  return isManagerRole(user.role);
}

export function canDeleteEntry(user: { role: string }): boolean {
  return isManagerRole(user.role);
}

/* Users */

export function assignableRoles(actor: { role: string }): Role[] {
  if (actor.role === "ADMIN") return ["ADMIN", "ANALYST", "USER"];
  if (actor.role === "ANALYST") return ["ANALYST", "USER"];
  return [];
}

export function canManageUser(actor: { id: string; role: string }, target: { id: string; role: string }): boolean {
  if (!isManagerRole(actor.role) || actor.id === target.id) return false;
  return actor.role === "ADMIN" || target.role !== "ADMIN";
}

export function canSeeUser(actor: { role: string }, target: { role: string }): boolean {
  return actor.role === "ADMIN" || target.role !== "ADMIN";
}
