/** Reminder rules */

export type Frequency = "MONTHLY" | "QUARTERLY" | "YEARLY" | "NONE";

export const GRACE_DAYS = 10;
export const EXPIRY_WARNING_DAYS = 30;

const MONTHS = [
  "styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec",
  "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień",
];
const ROMAN = ["I", "II", "III", "IV"];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
const addDays = (s: string, n: number) => iso(new Date(Date.parse(`${s}T00:00:00Z`) + n * 86_400_000));

export interface Period {
  from: string;
  to: string;
  label: string;
}

/** Last full period that ended at least GRACE_DAYS ago. */
export function lastClosedPeriod(freq: Frequency, today: Date, graceDays = GRACE_DAYS): Period | null {
  if (freq === "NONE") return null;
  const ref = new Date(today.getTime() - graceDays * 86_400_000);
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  if (freq === "MONTHLY") {
    const from = utc(y, m - 1, 1);
    return { from: iso(from), to: iso(utc(y, m, 0)), label: `${MONTHS[from.getUTCMonth()]} ${from.getUTCFullYear()}` };
  }
  if (freq === "QUARTERLY") {
    const q = Math.floor(m / 3);
    const from = utc(y, q * 3 - 3, 1);
    const qi = Math.floor(from.getUTCMonth() / 3);
    return { from: iso(from), to: iso(utc(y, q * 3, 0)), label: `${ROMAN[qi]} kwartał ${from.getUTCFullYear()}` };
  }
  return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31`, label: `rok ${y - 1}` };
}

export interface EntrySpan {
  periodStart: string | null;
  periodEnd: string | null;
  entryDate: string;
}

export function isCovered(period: Period, entries: EntrySpan[]): boolean {
  return entries.some((e) => {
    if (e.periodStart && e.periodEnd) return e.periodStart <= period.to && e.periodEnd >= period.from;
    return e.entryDate >= period.from && e.entryDate <= period.to;
  });
}

/* Factors */

export interface FactorVersion {
  id: string;
  name: string;
  source: string;
  validFrom: string;
  validTo: string;
}

export type FactorWarning =
  | { kind: "noValid"; factor: string; sources: string[] }
  | { kind: "expiring"; factor: string; validTo: string; daysLeft: number }
  | { kind: "gap"; factor: string; from: string; to: string }
  | { kind: "kobize"; year: number };

const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

/** Warnings for one factor lineage used by active sources. */
export function lineageWarnings(versions: FactorVersion[], sourceNames: string[], today: Date): FactorWarning[] {
  if (versions.length === 0) return [];
  const day = iso(today);
  const sorted = [...versions].sort((a, b) => a.validFrom.localeCompare(b.validFrom));
  const name = sorted.at(-1)!.name;
  const out: FactorWarning[] = [];

  if (!sorted.some((v) => v.validFrom <= day && v.validTo >= day)) {
    out.push({ kind: "noValid", factor: name, sources: sourceNames });
  }

  const latestEnd = sorted.reduce((max, v) => (v.validTo > max ? v.validTo : max), sorted[0]!.validTo);
  const daysLeft = daysBetween(day, latestEnd);
  if (latestEnd >= day && daysLeft <= EXPIRY_WARNING_DAYS) {
    out.push({ kind: "expiring", factor: name, validTo: latestEnd, daysLeft });
  }

  const relevantFrom = `${today.getUTCFullYear() - 1}-01-01`;
  let coveredTo = sorted[0]!.validTo;
  for (const v of sorted.slice(1)) {
    const gapFrom = addDays(coveredTo, 1);
    if (v.validFrom > gapFrom) {
      const gapTo = addDays(v.validFrom, -1);
      if (gapTo >= relevantFrom) out.push({ kind: "gap", factor: name, from: gapFrom, to: gapTo });
    }
    if (v.validTo > coveredTo) coveredTo = v.validTo;
  }
  return out;
}

/** In January: no KOBiZE factor version starts this year yet. */
export function kobizeReminder(versions: FactorVersion[], today: Date): FactorWarning | null {
  if (today.getUTCMonth() !== 0) return null;
  const year = today.getUTCFullYear();
  const kobize = versions.filter((v) => v.source === "KOBIZE");
  if (kobize.length === 0) return null;
  return kobize.some((v) => v.validFrom >= `${year}-01-01`) ? null : { kind: "kobize", year };
}

const pl = (s: string) => s.split("-").reverse().join(".");

export function factorWarningText(w: FactorWarning): string {
  switch (w.kind) {
    case "noValid":
      return `Wskaźnik „${w.factor}” nie ma wersji ważnej na dziś — dotyczy: ${w.sources.join(", ")}.`;
    case "expiring":
      return w.daysLeft === 0
        ? `Wskaźnik „${w.factor}” wygasa dziś — dodaj nową wersję.`
        : `Wskaźnik „${w.factor}” wygasa ${pl(w.validTo)} (za ${w.daysLeft} ${plural(w.daysLeft, "dzień", "dni", "dni")}) — dodaj nową wersję.`;
    case "gap":
      return `Wskaźnik „${w.factor}” nie ma ważnej wersji od ${pl(w.from)} do ${pl(w.to)} — faktury z tego okresu nie dostaną wskaźnika.`;
    case "kobize":
      return `Styczeń: sprawdź, czy KOBiZE opublikował nowy wskaźnik dla energii elektrycznej na ${w.year} r., i dodaj nową wersję.`;
  }
}

export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const tens = n % 100;
  return n % 10 >= 2 && n % 10 <= 4 && (tens < 12 || tens > 14) ? few : many;
}
