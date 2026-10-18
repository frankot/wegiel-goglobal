import { Prisma } from "@/lib/generated/prisma/client";
import { lookupUnit } from "./unit-table";

type Decimal = Prisma.Decimal;

export {
  lookupUnit,
  isKnownUnit,
  normalizeUnitKey,
  factorDenominatorUnit,
  SELECTABLE_UNITS,
  UNIT_TABLE,
} from "./unit-table";
export type { CanonicalUnit, UnitDefinition } from "./unit-table";

export class UnitConversionError extends Error {
  constructor(
    message: string,
    readonly code: "UNKNOWN_UNIT" | "INCOMPATIBLE_UNITS" | "BAD_FACTOR_UNIT",
  ) {
    super(message);
    this.name = "UnitConversionError";
  }
}

export function convertQuantity(
  quantity: Decimal,
  fromUnit: string,
  toUnit: string,
): Decimal {
  const from = lookupUnit(fromUnit);
  if (!from) {
    throw new UnitConversionError(
      `Jednostka "${fromUnit}" nie jest jednostką zużycia — pozycja nie tworzy emisji.`,
      "UNKNOWN_UNIT",
    );
  }

  const to = lookupUnit(toUnit);
  if (!to) {
    throw new UnitConversionError(
      `Nieznana jednostka mianownika wskaźnika: "${toUnit}".`,
      "BAD_FACTOR_UNIT",
    );
  }

  if (from.canonical !== to.canonical) {
    throw new UnitConversionError(
      `Nie można przeliczyć "${fromUnit}" na "${toUnit}" — różne wielkości fizyczne (${from.canonical} vs ${to.canonical}).`,
      "INCOMPATIBLE_UNITS",
    );
  }

  if (from.multiplier === to.multiplier) return quantity;

  return quantity
    .mul(new Prisma.Decimal(from.multiplier))
    .div(new Prisma.Decimal(to.multiplier));
}
