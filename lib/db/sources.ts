import "server-only";
import { prisma } from "@/lib/prisma";
import type { SourceCandidate } from "@/lib/emissions/match-source";

export interface SourceDTO {
  id: string;
  name: string;
  type: SourceCandidate["type"];
  scope: SourceCandidate["scope"];
  unit: string;
  active: boolean;
  ppeNumber: string | null;
  meterNumber: string | null;
  supplierNip: string | null;
  defaultFactorId: string | null;
  location: string | null;
  registrationNumber: string | null;
}

export async function listSources(includeInactive = false): Promise<SourceDTO[]> {
  const rows = await prisma.emissionSource.findMany({
    where: includeInactive ? undefined : { active: true },
    orderBy: { name: "asc" },
  });
  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type as SourceDTO["type"],
    scope: s.scope as SourceDTO["scope"],
    unit: s.unit,
    active: s.active,
    ppeNumber: s.ppeNumber,
    meterNumber: s.meterNumber,
    supplierNip: s.supplierNip,
    defaultFactorId: s.defaultFactorId,
    location: s.location,
    registrationNumber: s.registrationNumber,
  }));
}

/** Kandydaci dla `matchSource` — ten sam kształt, węższy typ. */
export async function getSourceCandidates(): Promise<SourceCandidate[]> {
  const rows = await listSources(false);
  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    scope: s.scope,
    unit: s.unit,
    active: s.active,
    ppeNumber: s.ppeNumber,
    meterNumber: s.meterNumber,
    supplierNip: s.supplierNip,
    defaultFactorId: s.defaultFactorId,
  }));
}

/**
 * Zapamiętuje PPE na źródle po ręcznym przypisaniu przez użytkownika.
 * To jest mechanizm, dzięki któremu kolejne faktury tego dostawcy wchodzą
 * automatycznie (§5.4). Nie nadpisuje PPE przypisanego do innego źródła.
 */
export async function rememberPpeForSource(
  sourceId: string,
  ppeNumber: string,
): Promise<{ ok: boolean; error?: string }> {
  const taken = await prisma.emissionSource.findFirst({
    where: { ppeNumber, NOT: { id: sourceId } },
    select: { name: true },
  });
  if (taken) {
    return {
      ok: false,
      error: `PPE ${ppeNumber} jest już przypisany do źródła „${taken.name}".`,
    };
  }

  await prisma.emissionSource.update({
    where: { id: sourceId },
    data: { ppeNumber },
  });
  return { ok: true };
}
