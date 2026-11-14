import { lookupUnit, factorDenominatorUnit } from "./unit-table";

export type SourceType =
  | "STATIONARY_INSTALLATION"
  | "COMPANY_VEHICLE"
  | "ELECTRICITY"
  | "HEAT"
  | "COOLING";

export type Scope = "SCOPE_1" | "SCOPE_2";

export type BillingFrequency = "MONTHLY" | "QUARTERLY" | "YEARLY" | "NONE";

export const BILLING_FREQUENCY_LABELS: Record<BillingFrequency, string> = {
  MONTHLY: "Miesięcznie",
  QUARTERLY: "Kwartalnie",
  YEARLY: "Rocznie",
  NONE: "Bez przypomnień",
};

/** Scope by source type */
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

export const UNITS_BY_TYPE: Record<SourceType, readonly string[]> = {
  STATIONARY_INSTALLATION: ["m³", "litr", "kg", "t"],
  COMPANY_VEHICLE: ["litr", "kg"],
  ELECTRICITY: ["kWh", "MWh"],
  HEAT: ["GJ", "kWh"],
  COOLING: ["kWh"],
};

export function supportsGridIdentifiers(type: SourceType): boolean {
  return type === "ELECTRICITY" || type === "HEAT" || type === "COOLING";
}

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

export function normalizeNip(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, "");
  return /^\d{10}$/.test(digits) ? digits : null;
}

export function normalizeIdentifier(raw: string): string {
  return raw.replace(/\s/g, "").trim();
}
