import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

export async function clientIp(): Promise<string | undefined> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    undefined
  );
}

export interface AuditInput {
  userId: string;
  userName: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "VERIFY" | "CORRECT" | "IMPORT" | "RECALC";
  entity: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
}

export async function writeAudit(input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      userName: input.userName,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      details: input.details,
      ipAddress: input.ipAddress,
    },
  });
}

/** Wariant transakcyjny — audyt musi powstać razem z encją albo wcale. */
export async function writeAuditTx(
  tx: Prisma.TransactionClient,
  input: AuditInput,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      userId: input.userId,
      userName: input.userName,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      details: input.details,
      ipAddress: input.ipAddress,
    },
  });
}

export function describeChange(
  before: Record<string, unknown> | null,
  after: Record<string, unknown>,
): string {
  if (!before) return JSON.stringify(after);
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      diff[key] = { from: before[key], to: after[key] };
    }
  }
  return JSON.stringify(diff);
}
