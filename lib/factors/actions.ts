"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { getCurrentUser } from "@/lib/db/users";
import { canManage } from "@/lib/auth/permissions";
import { clientIp, writeAudit } from "@/lib/db/audit";
import { findOverlappingVersions } from "@/lib/emissions/resolve-factor";
import { calculateEmission } from "@/lib/emissions/calculate";
import { factorSchema, factorVersionSchema } from "@/schemas/factor";
import { getVersionLineage } from "@/lib/db/factors";

export async function getFactorHistory(factorId: string) {
  await getCurrentUser();
  return getVersionLineage(factorId);
}

export interface FactorResult {
  ok: boolean;
  errors?: string[];
  affectedDrafts?: number;
  factorId?: string;
}

const day = 24 * 60 * 60 * 1000;

async function lineageVersions(rootId: string) {
  return prisma.emissionFactor.findMany({
    where: { OR: [{ id: rootId }, { parentId: rootId }] },
    select: { id: true, validFrom: true, validTo: true },
  });
}

export async function createFactor(formData: FormData): Promise<FactorResult> {
  const user = await getCurrentUser();
  if (!canManage(user)) return { ok: false, errors: ["Brak uprawnień"] };

  const parsed = factorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => i.message) };
  }
  const input = parsed.data;

  if (new Date(input.validFrom) > new Date(input.validTo)) {
    return { ok: false, errors: ["Data początku nie może być późniejsza niż data końca."] };
  }

  const factor = await prisma.emissionFactor.create({
    data: {
      name: input.name,
      category: input.category,
      value: new Prisma.Decimal(input.value.replace(",", ".")),
      unit: input.unit,
      source: input.source,
      scope: input.scope,
      validFrom: new Date(input.validFrom),
      validTo: new Date(input.validTo),
    },
  });

  await writeAudit({
    userId: user.id,
    userName: user.name || user.email,
    action: "CREATE",
    entity: "EmissionFactor",
    entityId: factor.id,
    details: JSON.stringify({ name: input.name, value: input.value, unit: input.unit }),
    ipAddress: await clientIp(),
  });

  revalidatePath("/factors");
  return { ok: true, factorId: factor.id };
}

export async function createFactorVersion(formData: FormData): Promise<FactorResult> {
  const user = await getCurrentUser();
  if (!canManage(user)) return { ok: false, errors: ["Brak uprawnień"] };

  const parsed = factorVersionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => i.message) };
  }
  const input = parsed.data;

  const base = await prisma.emissionFactor.findUnique({ where: { id: input.parentId } });
  if (!base) return { ok: false, errors: ["Wskaźnik nie istnieje"] };

  const rootId = base.parentId ?? base.id;
  const validFrom = new Date(input.validFrom);
  const validTo = new Date(input.validTo);

  if (validFrom > validTo) {
    return { ok: false, errors: ["Data początku nie może być późniejsza niż data końca."] };
  }

  const previous = await prisma.emissionFactor.findFirst({
    where: {
      OR: [{ id: rootId }, { parentId: rootId }],
      validFrom: { lt: validFrom },
    },
    orderBy: { validFrom: "desc" },
  });

  const closedTo = new Date(validFrom.getTime() - day);

  const existing = await lineageVersions(rootId);
  const projected = existing.map((v) =>
    previous && v.id === previous.id ? { ...v, validTo: closedTo } : v,
  );
  const overlaps = findOverlappingVersions(projected, { validFrom, validTo });
  if (overlaps.length > 0) {
    return {
      ok: false,
      errors: [
        "Nowa wersja nachodzi na istniejącą wersję tego wskaźnika. Popraw daty obowiązywania.",
      ],
    };
  }

  const created = await prisma.$transaction(async (tx) => {
    if (previous && previous.validTo > closedTo) {
      await tx.emissionFactor.update({
        where: { id: previous.id },
        data: { validTo: closedTo },
      });
    }

    return tx.emissionFactor.create({
      data: {
        name: input.name?.trim() || base.name,
        category: base.category,
        value: new Prisma.Decimal(input.value.replace(",", ".")),
        unit: base.unit,
        source: base.source,
        scope: base.scope,
        validFrom,
        validTo,
        parentId: rootId,
      },
    });
  });

  await writeAudit({
    userId: user.id,
    userName: user.name || user.email,
    action: "CREATE",
    entity: "EmissionFactor",
    entityId: created.id,
    details: JSON.stringify({
      newVersionOf: rootId,
      from: previous?.value.toString(),
      to: input.value,
      validFrom: input.validFrom,
    }),
    ipAddress: await clientIp(),
  });

  revalidatePath("/factors");
  return { ok: true, factorId: created.id };
}

export async function updateFactor(
  id: string,
  formData: FormData,
): Promise<FactorResult> {
  const user = await getCurrentUser();
  if (!canManage(user)) return { ok: false, errors: ["Brak uprawnień"] };

  const parsed = factorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => i.message) };
  }
  const input = parsed.data;

  const before = await prisma.emissionFactor.findUnique({ where: { id } });
  if (!before) return { ok: false, errors: ["Wskaźnik nie istnieje"] };

  const validFrom = new Date(input.validFrom);
  const validTo = new Date(input.validTo);
  if (validFrom > validTo) {
    return { ok: false, errors: ["Data początku nie może być późniejsza niż data końca."] };
  }

  const rootId = before.parentId ?? before.id;
  const siblings = await lineageVersions(rootId);
  const overlaps = findOverlappingVersions(siblings, { id, validFrom, validTo });
  if (overlaps.length > 0) {
    return {
      ok: false,
      errors: ["Okres ważności nachodzi na inną wersję tego wskaźnika."],
    };
  }

  await prisma.emissionFactor.update({
    where: { id },
    data: {
      name: input.name,
      category: input.category,
      value: new Prisma.Decimal(input.value.replace(",", ".")),
      unit: input.unit,
      source: input.source,
      scope: input.scope,
      validFrom,
      validTo,
    },
  });

  await writeAudit({
    userId: user.id,
    userName: user.name || user.email,
    action: "UPDATE",
    entity: "EmissionFactor",
    entityId: id,
    details: JSON.stringify({
      value: { from: before.value.toString(), to: input.value },
      unit: { from: before.unit, to: input.unit },
    }),
    ipAddress: await clientIp(),
  });

  const affectedDrafts = await prisma.emissionEntry.count({
    where: { factorId: id, status: "DRAFT" },
  });

  revalidatePath("/factors");
  return { ok: true, affectedDrafts };
}

export async function recalculateDrafts(factorId: string): Promise<FactorResult> {
  const user = await getCurrentUser();
  if (!canManage(user)) return { ok: false, errors: ["Brak uprawnień"] };

  const factor = await prisma.emissionFactor.findUnique({ where: { id: factorId } });
  if (!factor) return { ok: false, errors: ["Wskaźnik nie istnieje"] };

  const drafts = await prisma.emissionEntry.findMany({
    where: { factorId, status: "DRAFT" },
  });

  let updated = 0;
  for (const entry of drafts) {
    try {
      const r = calculateEmission({
        quantity: (entry.originalQuantity ?? entry.quantity).toString(),
        quantityUnit: entry.originalUnit ?? entry.unit,
        factorValue: factor.value.toString(),
        factorUnit: factor.unit,
      });
      await prisma.emissionEntry.update({
        where: { id: entry.id },
        data: {
          quantity: new Prisma.Decimal(r.quantity.toString()),
          unit: r.unit,
          factorSnapshotValue: factor.value,
          factorSnapshotUnit: factor.unit,
          co2eKg: new Prisma.Decimal(r.co2eKg.toString()),
          co2eTon: new Prisma.Decimal(r.co2eTon.toString()),
        },
      });
      updated++;
    } catch (e) {
      console.error(`Nie udało się przeliczyć wpisu ${entry.id}:`, e);
    }
  }

  await writeAudit({
    userId: user.id,
    userName: user.name || user.email,
    action: "RECALC",
    entity: "EmissionFactor",
    entityId: factorId,
    details: JSON.stringify({ drafts: drafts.length, updated }),
    ipAddress: await clientIp(),
  });

  revalidatePath("/factors");
  revalidatePath("/entries");
  revalidatePath("/dashboard");
  return { ok: true, affectedDrafts: updated };
}
