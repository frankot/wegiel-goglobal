import "server-only";
import { prisma } from "@/lib/prisma";
import {
  factorWarningText,
  isCovered,
  kobizeReminder,
  lastClosedPeriod,
  lineageWarnings,
  type FactorVersion,
  type FactorWarning,
  type Period,
} from "./rules";

/** Current reminders */

export interface MissingData {
  sourceId: string;
  sourceName: string;
  period: Period;
}

export interface Reminders {
  missing: MissingData[];
  factors: { kind: FactorWarning["kind"]; text: string }[];
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export async function getReminders(today = new Date()): Promise<Reminders> {
  const sources = await prisma.emissionSource.findMany({
    where: { active: true },
    select: { id: true, name: true, billingFrequency: true, createdAt: true, defaultFactorId: true },
    orderBy: { name: "asc" },
  });

  const due = sources
    .map((s) => ({ s, period: lastClosedPeriod(s.billingFrequency, today) }))
    .filter((x): x is { s: (typeof sources)[number]; period: Period } => !!x.period && iso(x.s.createdAt) <= x.period.to);

  const earliest = due.reduce((min, x) => (x.period.from < min ? x.period.from : min), iso(today));
  const entries = due.length
    ? await prisma.emissionEntry.findMany({
        where: {
          sourceId: { in: due.map((x) => x.s.id) },
          OR: [{ periodEnd: { gte: new Date(earliest) } }, { entryDate: { gte: new Date(earliest) } }],
        },
        select: { sourceId: true, periodStart: true, periodEnd: true, entryDate: true },
      })
    : [];

  const missing = due
    .filter(
      ({ s, period }) =>
        !isCovered(
          period,
          entries
            .filter((e) => e.sourceId === s.id)
            .map((e) => ({
              periodStart: e.periodStart ? iso(e.periodStart) : null,
              periodEnd: e.periodEnd ? iso(e.periodEnd) : null,
              entryDate: iso(e.entryDate),
            })),
        ),
    )
    .map(({ s, period }) => ({ sourceId: s.id, sourceName: s.name, period }));

  const defaults = await prisma.emissionFactor.findMany({
    where: { id: { in: sources.map((s) => s.defaultFactorId).filter((id): id is string => !!id) } },
    select: { id: true, parentId: true },
  });
  const rootOf = new Map(defaults.map((f) => [f.id, f.parentId ?? f.id]));
  const roots = [...new Set(rootOf.values())];
  const versions = await prisma.emissionFactor.findMany({
    where: { OR: [{ id: { in: roots } }, { parentId: { in: roots } }] },
    select: { id: true, parentId: true, name: true, source: true, validFrom: true, validTo: true },
  });

  const warnings: FactorWarning[] = [];
  let kobize: FactorWarning | null = null;
  for (const root of roots) {
    const lineage: FactorVersion[] = versions
      .filter((v) => (v.parentId ?? v.id) === root)
      .map((v) => ({ id: v.id, name: v.name, source: v.source, validFrom: iso(v.validFrom), validTo: iso(v.validTo) }));
    const users = sources.filter((s) => s.defaultFactorId && rootOf.get(s.defaultFactorId) === root).map((s) => s.name);
    warnings.push(...lineageWarnings(lineage, users, today));
    kobize ??= kobizeReminder(lineage, today);
  }
  if (kobize) warnings.push(kobize);

  return { missing, factors: warnings.map((w) => ({ kind: w.kind, text: factorWarningText(w) })) };
}
