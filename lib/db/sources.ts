import "server-only";
import type { BillingFrequency } from "@/lib/emissions/source-types";
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
  billingFrequency: BillingFrequency;
}

export interface SourceRow extends SourceDTO {
  defaultFactorName: string | null;
  defaultFactorUnit: string | null;
  entryCount: number;
  draftCount: number;
}

export async function listSourceRows(): Promise<SourceRow[]> {
  const rows = await prisma.emissionSource.findMany({
    include: {
      defaultFactor: { select: { name: true, unit: true } },
      _count: { select: { entries: true } },
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  const drafts = await prisma.emissionEntry.groupBy({
    by: ["sourceId"],
    where: { status: "DRAFT" },
    _count: { _all: true },
  });
  const draftBySource = new Map(drafts.map((d) => [d.sourceId, d._count._all]));

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
    billingFrequency: s.billingFrequency,
    defaultFactorName: s.defaultFactor?.name ?? null,
    defaultFactorUnit: s.defaultFactor?.unit ?? null,
    entryCount: s._count.entries,
    draftCount: draftBySource.get(s.id) ?? 0,
  }));
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
    billingFrequency: s.billingFrequency,
  }));
}

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
