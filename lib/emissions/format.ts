/**
 * Formatowanie liczb i dat dla UI (pl-PL).
 * Wejściem są stringi z warstwy DAL — `Prisma.Decimal` nie przechodzi
 * przez granicę RSC, więc do komponentów trafiają wyłącznie stringi.
 */

const nf = (min: number, max: number) =>
  new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });

/** 1577.156 → „1 577,156" */
export function formatKg(value: string | number): string {
  return nf(0, 3).format(Number(value));
}

/** 1.577156 → „1,577156" — tony pokazujemy z pełną precyzją kolumny. */
export function formatTon(value: string | number): string {
  return nf(0, 6).format(Number(value));
}

/** 2852 → „2 852" ; 2852.5 → „2 852,5" */
export function formatQuantity(value: string | number): string {
  return nf(0, 4).format(Number(value));
}

/** 0.553 → „0,553" */
export function formatFactor(value: string | number): string {
  return nf(0, 6).format(Number(value));
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("pl-PL");
}

export function formatPeriod(
  from: Date | string | null | undefined,
  to: Date | string | null | undefined,
): string {
  if (!from && !to) return "—";
  return `${formatDate(from)} – ${formatDate(to)}`;
}

/**
 * Parsuje liczbę zapisaną po polsku ("2 852,000", z twardą spacją) lub
 * po angielsku ("2852.000") na string bezpieczny dla `Prisma.Decimal`.
 * Zwraca null, gdy wejście nie jest liczbą — nigdy NaN.
 */
export function parseDecimalInput(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw
    .trim()
    .replace(/[\s  ]/g, "")
    .replace(",", ".");
  if (cleaned === "") return null;
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return cleaned;
}
