import "server-only";
import { prisma } from "@/lib/prisma";
import type { FactorCandidate } from "@/lib/emissions/resolve-factor";

export interface FactorDTO {
  id: string;
  name: string;
  category: string;
  value: string;
  unit: string;
  source: "KOBIZE" | "GHG_PROTOCOL" | "CUSTOM";
  scope: "SCOPE_1" | "SCOPE_2";
  validFrom: string;
  validTo: string;
  parentId: string | null;
}

const toDTO = (f: {
  id: string;
  name: string;
  category: string;
  value: { toString(): string };
  unit: string;
  source: string;
  scope: string;
  validFrom: Date;
  validTo: Date;
  parentId: string | null;
}): FactorDTO => ({
  id: f.id,
  name: f.name,
  category: f.category,
  value: f.value.toString(),
  unit: f.unit,
  source: f.source as FactorDTO["source"],
  scope: f.scope as FactorDTO["scope"],
  validFrom: f.validFrom.toISOString(),
  validTo: f.validTo.toISOString(),
  parentId: f.parentId,
});

export async function listFactors(): Promise<FactorDTO[]> {
  const rows = await prisma.emissionFactor.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }, { validFrom: "desc" }],
  });
  return rows.map(toDTO);
}

export async function getFactorCandidates(
  category?: string,
): Promise<FactorCandidate[]> {
  const rows = await prisma.emissionFactor.findMany({
    where: category ? { category } : undefined,
    orderBy: { validFrom: "desc" },
  });
  return rows.map((f) => ({
    id: f.id,
    name: f.name,
    category: f.category,
    value: f.value.toString(),
    unit: f.unit,
    scope: f.scope as FactorCandidate["scope"],
    validFrom: f.validFrom,
    validTo: f.validTo,
    lineageId: f.parentId ?? f.id,
  }));
}

export async function getFactorById(id: string): Promise<FactorDTO | null> {
  const f = await prisma.emissionFactor.findUnique({ where: { id } });
  return f ? toDTO(f) : null;
}

export async function getVersionLineage(factorId: string): Promise<FactorDTO[]> {
  const factor = await prisma.emissionFactor.findUnique({ where: { id: factorId } });
  if (!factor) return [];
  const rootId = factor.parentId ?? factor.id;

  const rows = await prisma.emissionFactor.findMany({
    where: { OR: [{ id: rootId }, { parentId: rootId }] },
    orderBy: { validFrom: "desc" },
  });
  return rows.map(toDTO);
}

export async function countDraftEntriesUsingFactor(factorId: string): Promise<number> {
  return prisma.emissionEntry.count({ where: { factorId, status: "DRAFT" } });
}
