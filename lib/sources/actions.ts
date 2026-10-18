"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/db/users";
import { canManage } from "@/lib/auth/permissions";
import { clientIp, writeAudit } from "@/lib/db/audit";
import {
  isUnitCompatibleWithFactor,
  normalizeIdentifier,
  normalizeNip,
  scopeForType,
  supportsGridIdentifiers,
  type SourceType,
} from "@/lib/emissions/source-types";
import { sourceSchema } from "@/schemas/source";

export interface SourceResult {
  ok: boolean;
  errors?: string[];
  sourceId?: string;
}

interface Normalized {
  name: string;
  type: SourceType;
  scope: "SCOPE_1" | "SCOPE_2";
  defaultFactorId: string;
  unit: string;
  registrationNumber?: string;
  location?: string;
  ppeNumber: string | null;
  meterNumber: string | null;
  supplierNip: string | null;
}

async function normalize(
  formData: FormData,
  excludeId?: string,
): Promise<{ ok: true; data: Normalized } | { ok: false; errors: string[] }> {
  const parsed = sourceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => i.message) };
  }
  const input = parsed.data;
  const errors: string[] = [];

  const factor = await prisma.emissionFactor.findUnique({
    where: { id: input.defaultFactorId },
  });
  if (!factor) {
    return { ok: false, errors: ["Wybrany wskaźnik nie istnieje."] };
  }

  const scope = scopeForType(input.type);

  if (factor.scope !== scope) {
    errors.push(
      `Wskaźnik „${factor.name}" należy do ${factor.scope === "SCOPE_1" ? "Zakresu 1" : "Zakresu 2"}, a ten typ źródła to ${scope === "SCOPE_1" ? "Zakres 1" : "Zakres 2"}.`,
    );
  }

  if (!isUnitCompatibleWithFactor(input.unit, factor.unit)) {
    errors.push(
      `Jednostki „${input.unit}" nie da się przeliczyć na mianownik wskaźnika (${factor.unit}).`,
    );
  }

  const now = new Date();
  if (factor.validTo < now) {
    errors.push(
      `Wskaźnik „${factor.name}" stracił ważność ${factor.validTo.toLocaleDateString("pl-PL")}. Dodaj nową wersję w zakładce Współczynniki.`,
    );
  }

  const ppeNumber = input.ppeNumber ? normalizeIdentifier(input.ppeNumber) : null;
  const meterNumber = input.meterNumber
    ? normalizeIdentifier(input.meterNumber)
    : null;

  let supplierNip: string | null = null;
  if (input.supplierNip) {
    supplierNip = normalizeNip(input.supplierNip);
    if (!supplierNip) errors.push("NIP dostawcy musi składać się z 10 cyfr.");
  }

  if ((ppeNumber || meterNumber) && !supportsGridIdentifiers(input.type)) {
    errors.push(
      "PPE i numer licznika dotyczą punktów poboru energii — dla tego typu źródła zostaw je puste.",
    );
  }

  const nameTaken = await prisma.emissionSource.findFirst({
    where: { name: input.name, NOT: excludeId ? { id: excludeId } : undefined },
    select: { id: true },
  });
  if (nameTaken) errors.push(`Źródło o nazwie „${input.name}" już istnieje.`);

  if (ppeNumber) {
    const ppeTaken = await prisma.emissionSource.findFirst({
      where: { ppeNumber, NOT: excludeId ? { id: excludeId } : undefined },
      select: { name: true },
    });
    if (ppeTaken) {
      errors.push(`PPE ${ppeNumber} jest już przypisany do źródła „${ppeTaken.name}".`);
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name: input.name,
      type: input.type,
      scope,
      defaultFactorId: input.defaultFactorId,
      unit: input.unit,
      registrationNumber: input.registrationNumber,
      location: input.location,
      ppeNumber,
      meterNumber,
      supplierNip,
    },
  };
}

export async function createSource(formData: FormData): Promise<SourceResult> {
  const user = await getCurrentUser();
  if (!canManage(user)) return { ok: false, errors: ["Brak uprawnień"] };

  const result = await normalize(formData);
  if (!result.ok) return { ok: false, errors: result.errors };

  const source = await prisma.emissionSource.create({ data: result.data });

  await writeAudit({
    userId: user.id,
    userName: user.name || user.email,
    action: "CREATE",
    entity: "EmissionSource",
    entityId: source.id,
    details: JSON.stringify({
      name: source.name,
      type: source.type,
      ppeNumber: source.ppeNumber,
    }),
    ipAddress: await clientIp(),
  });

  revalidatePath("/sources");
  revalidatePath("/entries/new");
  return { ok: true, sourceId: source.id };
}

export async function updateSource(
  id: string,
  formData: FormData,
): Promise<SourceResult> {
  const user = await getCurrentUser();
  if (!canManage(user)) return { ok: false, errors: ["Brak uprawnień"] };

  const before = await prisma.emissionSource.findUnique({ where: { id } });
  if (!before) return { ok: false, errors: ["Źródło nie istnieje"] };

  const result = await normalize(formData, id);
  if (!result.ok) return { ok: false, errors: result.errors };

  await prisma.emissionSource.update({ where: { id }, data: result.data });

  await writeAudit({
    userId: user.id,
    userName: user.name || user.email,
    action: "UPDATE",
    entity: "EmissionSource",
    entityId: id,
    details: JSON.stringify({
      name: { from: before.name, to: result.data.name },
      unit: { from: before.unit, to: result.data.unit },
      ppeNumber: { from: before.ppeNumber, to: result.data.ppeNumber },
    }),
    ipAddress: await clientIp(),
  });

  revalidatePath("/sources");
  revalidatePath("/entries/new");
  return { ok: true, sourceId: id };
}

export async function setSourceActive(
  id: string,
  active: boolean,
): Promise<SourceResult> {
  const user = await getCurrentUser();
  if (!canManage(user)) return { ok: false, errors: ["Brak uprawnień"] };

  const source = await prisma.emissionSource.findUnique({ where: { id } });
  if (!source) return { ok: false, errors: ["Źródło nie istnieje"] };

  if (!active) {
    const drafts = await prisma.emissionEntry.count({
      where: { sourceId: id, status: "DRAFT" },
    });
    if (drafts > 0) {
      return {
        ok: false,
        errors: [
          `Nie można dezaktywować — ${drafts} ${drafts === 1 ? "wpis roboczy korzysta" : "wpisów roboczych korzysta"} z tego źródła. Zweryfikuj je lub usuń najpierw.`,
        ],
      };
    }
  }

  await prisma.emissionSource.update({ where: { id }, data: { active } });

  await writeAudit({
    userId: user.id,
    userName: user.name || user.email,
    action: "UPDATE",
    entity: "EmissionSource",
    entityId: id,
    details: JSON.stringify({ active: { from: source.active, to: active } }),
    ipAddress: await clientIp(),
  });

  revalidatePath("/sources");
  revalidatePath("/entries/new");
  return { ok: true };
}
