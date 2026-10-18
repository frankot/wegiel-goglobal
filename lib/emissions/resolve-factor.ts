/** Factor version resolution */

export interface FactorCandidate {
  id: string;
  name: string;
  category: string;
  value: string;
  unit: string;
  scope: "SCOPE_1" | "SCOPE_2";
  validFrom: Date;
  validTo: Date;
  lineageId: string;
}

export type FactorResolution =
  | {
      status: "RESOLVED";
      factor: FactorCandidate;
      reason: "ONLY_MATCH" | "SOURCE_DEFAULT" | "SOURCE_DEFAULT_VERSION";
    }
  | { status: "AMBIGUOUS"; candidates: FactorCandidate[]; message: string }
  | { status: "NONE"; message: string };

export function factorRefDate(
  periodEnd: Date | null | undefined,
  entryDate: Date,
): Date {
  return periodEnd ?? entryDate;
}

const pl = (d: Date) => d.toLocaleDateString("pl-PL");

export function resolveFactor(params: {
  candidates: FactorCandidate[];
  refDate: Date;
  defaultFactorId?: string | null;
}): FactorResolution {
  const { candidates, refDate, defaultFactorId } = params;

  const valid = candidates.filter(
    (f) => f.validFrom <= refDate && refDate <= f.validTo,
  );

  if (valid.length === 0) {
    return {
      status: "NONE",
      message: `Brak wskaźnika obowiązującego dla daty ${pl(refDate)}. Dodaj wersję wskaźnika w zakładce Współczynniki.`,
    };
  }

  if (valid.length === 1) {
    return { status: "RESOLVED", factor: valid[0]!, reason: "ONLY_MATCH" };
  }

  const preferred = defaultFactorId
    ? valid.find((f) => f.id === defaultFactorId)
    : undefined;

  if (preferred) {
    return { status: "RESOLVED", factor: preferred, reason: "SOURCE_DEFAULT" };
  }

  const defaultLineage = defaultFactorId
    ? candidates.find((f) => f.id === defaultFactorId)?.lineageId
    : undefined;
  const sameLine = defaultLineage
    ? valid.filter((f) => f.lineageId === defaultLineage)
    : [];

  if (sameLine.length === 1) {
    return { status: "RESOLVED", factor: sameLine[0]!, reason: "SOURCE_DEFAULT_VERSION" };
  }

  return {
    status: "AMBIGUOUS",
    candidates: valid,
    message: `Dla daty ${pl(refDate)} obowiązuje ${valid.length} wskaźników — wybierz właściwy.`,
  };
}

export function findOverlappingVersions(
  versions: Array<{ id: string; validFrom: Date; validTo: Date }>,
  candidate: { id?: string; validFrom: Date; validTo: Date },
): Array<{ id: string; validFrom: Date; validTo: Date }> {
  return versions.filter(
    (v) =>
      v.id !== candidate.id &&
      v.validFrom <= candidate.validTo &&
      candidate.validFrom <= v.validTo,
  );
}
