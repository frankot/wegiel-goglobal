/**
 * Typy źródeł emisji i reguły domenowe wokół nich.
 * Bez zależności serwerowych — używane też po stronie klienta w formularzu.
 */
import { lookupUnit, factorDenominatorUnit } from "./unit-table";

export type SourceType =
  | "STATIONARY_INSTALLATION"
  | "COMPANY_VEHICLE"
  | "ELECTRICITY"
  | "HEAT"
  | "COOLING";

export type Scope = "SCOPE_1" | "SCOPE_2";

/**
 * Zakres WYNIKA z typu źródła — to definicja GHG Protocol, nie preferencja:
 * spalanie u siebie to Zakres 1, zakup energii to Zakres 2.
 * Dlatego zakres jest wyliczany, a nie wybierany — inaczej dałoby się zapisać
 * „pojazd firmowy w Zakresie 2", co jest sprzeczne z metodyką.
 */
const SCOPE_BY_TYPE: Record<SourceType, Scope> = {
  STATIONARY_INSTALLATION: "SCOPE_1",
  COMPANY_VEHICLE: "SCOPE_1",
  ELECTRICITY: "SCOPE_2",
  HEAT: "SCOPE_2",
  COOLING: "SCOPE_2",
};

export function scopeForType(type: SourceType): Scope {
  return SCOPE_BY_TYPE[type];
}

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  STATIONARY_INSTALLATION: "Instalacja stacjonarna",
  COMPANY_VEHICLE: "Pojazd firmowy",
  ELECTRICITY: "Energia elektryczna",
  HEAT: "Energia cieplna",
  COOLING: "Energia chłodnicza",
};

export const SOURCE_TYPE_HINTS: Record<SourceType, string> = {
  STATIONARY_INSTALLATION: "kocioł, piec, agregat prądotwórczy",
  COMPANY_VEHICLE: "samochód, wózek widłowy, ciągnik",
  ELECTRICITY: "licznik energii elektrycznej",
  HEAT: "ciepło sieciowe, węzeł cieplny",
  COOLING: "klimatyzacja, chłodnictwo",
};

/** Jednostki sensowne dla danego typu — podpowiedź w formularzu. */
export const UNITS_BY_TYPE: Record<SourceType, readonly string[]> = {
  STATIONARY_INSTALLATION: ["m³", "litr", "kg", "t"],
  COMPANY_VEHICLE: ["litr", "kg"],
  ELECTRICITY: ["kWh", "MWh"],
  HEAT: ["GJ", "kWh"],
  COOLING: ["kWh"],
};

/** Czy PPE/licznik mają sens dla tego typu (dotyczą punktów poboru energii). */
export function supportsGridIdentifiers(type: SourceType): boolean {
  return type === "ELECTRICITY" || type === "HEAT" || type === "COOLING";
}

/**
 * Jednostka źródła musi dać się przeliczyć na mianownik wskaźnika, inaczej
 * każdy import z tego źródła wywali się dopiero na etapie liczenia emisji.
 * Lepiej zatrzymać to przy zapisie źródła niż przy fakturze.
 */
export function isUnitCompatibleWithFactor(
  sourceUnit: string,
  factorUnit: string,
): boolean {
  const denominator = factorDenominatorUnit(factorUnit);
  if (!denominator) return false;
  const a = lookupUnit(sourceUnit);
  const b = lookupUnit(denominator);
  return !!a && !!b && a.canonical === b.canonical;
}

/** NIP: 10 cyfr, opcjonalnie z myślnikami/spacjami. */
export function normalizeNip(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, "");
  return /^\d{10}$/.test(digits) ? digits : null;
}

/** PPE ma 18 znaków w formacie PL, ale dopuszczamy inne — czyścimy białe znaki. */
export function normalizeIdentifier(raw: string): string {
  return raw.replace(/\s/g, "").trim();
}
