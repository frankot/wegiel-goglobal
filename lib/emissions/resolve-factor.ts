/**
 * Wybór wersji wskaźnika emisji obowiązującej dla danego wpisu (D9).
 *
 * Zasada: okres rozliczeniowy może przechodzić przez granicę wersji
 * (np. 15.12.2026–14.01.2027, gdy KOBIZE zmienia się 01.01). Bierzemy wersję
 * właściwą dla KOŃCA okresu — jeden wpis, jeden wskaźnik, decyzja odtwarzalna
 * w audycie. Karta faktury pokazuje wybraną wersję i pozwala ją nadpisać.
 *
 * Funkcja jest czysta — kandydaci przychodzą z warstwy DAL, nie z Prismy.
 */

export interface FactorCandidate {
  id: string;
  name: string;
  category: string;
  /** Wartość jako string — Decimal nie przechodzi przez granicę RSC. */
  value: string;
  unit: string;
  scope: "SCOPE_1" | "SCOPE_2";
  validFrom: Date;
  validTo: Date;
}

export type FactorResolution =
  | {
      status: "RESOLVED";
      factor: FactorCandidate;
      reason: "ONLY_MATCH" | "SOURCE_DEFAULT";
    }
  | { status: "AMBIGUOUS"; candidates: FactorCandidate[]; message: string }
  | { status: "NONE"; message: string };

/**
 * Data, wg której dobieramy wersję wskaźnika: koniec okresu rozliczeniowego,
 * a gdy go nie ma — data wpisu.
 */
export function factorRefDate(
  periodEnd: Date | null | undefined,
  entryDate: Date,
): Date {
  return periodEnd ?? entryDate;
}

const pl = (d: Date) => d.toLocaleDateString("pl-PL");

export function resolveFactor(params: {
  /** Wskaźniki już zawężone do właściwej kategorii/zakresu. */
  candidates: FactorCandidate[];
  refDate: Date;
  /** Domyślny wskaźnik źródła emisji — rozstrzyga remis. */
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

  return {
    status: "AMBIGUOUS",
    candidates: valid,
    message: `Dla daty ${pl(refDate)} obowiązuje ${valid.length} wskaźników — wybierz właściwy.`,
  };
}

/**
 * Walidacja nakładania się wersji w jednej linii wersji (§9).
 * Bez niej `resolveFactor` zwracałby AMBIGUOUS przy każdym imporcie.
 */
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
