/**
 * Tabela jednostek — JEDYNE źródło prawdy, współdzielone przez serwer i klienta.
 *
 * Ten plik nie importuje Prismy, więc wchodzi do bundla przeglądarki. Jest to
 * celowe: gdyby klient miał własną kopię listy jednostek, reguła „`mc` to
 * miesiąc, nie metr sześcienny" mogłaby się rozjechać między podglądem
 * a zapisem — a to jest dokładnie ta klasa błędu, której unikamy.
 */

export type CanonicalUnit = "kWh" | "m³" | "litr" | "kg";

export interface UnitDefinition {
  canonical: CanonicalUnit;
  /** Mnożnik do jednostki kanonicznej, jako string (nigdy float). */
  multiplier: string;
}

/**
 * Klucze znormalizowane: małe litery, bez spacji, `³`→`3`.
 * `mc`, `szt`, `usł`, `kpl` celowo NIE występują.
 */
export const UNIT_TABLE: Record<string, UnitDefinition> = {
  kwh: { canonical: "kWh", multiplier: "1" },
  mwh: { canonical: "kWh", multiplier: "1000" },
  gj: { canonical: "kWh", multiplier: "277.777778" },
  m3: { canonical: "m³", multiplier: "1" },
  nm3: { canonical: "m³", multiplier: "1" },
  l: { canonical: "litr", multiplier: "1" },
  litr: { canonical: "litr", multiplier: "1" },
  litry: { canonical: "litr", multiplier: "1" },
  litrow: { canonical: "litr", multiplier: "1" },
  dm3: { canonical: "litr", multiplier: "1" },
  kg: { canonical: "kg", multiplier: "1" },
  t: { canonical: "kg", multiplier: "1000" },
  tona: { canonical: "kg", multiplier: "1000" },
  tony: { canonical: "kg", multiplier: "1000" },
  mg: { canonical: "kg", multiplier: "1000" },
};

export function normalizeUnitKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/ /g, "")
    .replace(/\s+/g, "")
    .replace(/³/g, "3")
    .replace(/ó/g, "o")
    .replace(/\./g, "");
}

export function lookupUnit(raw: string): UnitDefinition | null {
  if (!raw) return null;
  return UNIT_TABLE[normalizeUnitKey(raw)] ?? null;
}

export function isKnownUnit(raw: string): boolean {
  return lookupUnit(raw) !== null;
}

/** "kg CO₂e/kWh" → "kWh" */
export function factorDenominatorUnit(factorUnit: string): string | null {
  const parts = factorUnit.split("/");
  if (parts.length < 2) return null;
  return parts[parts.length - 1]?.trim() || null;
}

export const SELECTABLE_UNITS = ["kWh", "MWh", "GJ", "m³", "litr", "kg", "t"] as const;
