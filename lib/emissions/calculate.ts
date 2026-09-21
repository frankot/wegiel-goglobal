/**
 * Obliczanie emisji CO₂e.
 *
 * ŻELAZNA ZASADA: żadnego `number` w ścieżce obliczeniowej. Wszystko przechodzi
 * przez `Prisma.Decimal` (decimal.js). Wynik trafia do raportu ESRS E1 —
 * `0.1 + 0.2 !== 0.3` nie jest tu akceptowalne.
 *
 * Test złoty: 2852 kWh × 0,553 kg CO₂e/kWh = 1577,156 kg = 1,577156 t
 * (example/unimot-calc.md)
 */
import { Prisma } from "@/lib/generated/prisma/client";
import { convertQuantity, factorDenominatorUnit, UnitConversionError } from "./units";

type Decimal = Prisma.Decimal;

export interface CalculationInput {
  /** Ilość w jednostce z dokumentu. */
  quantity: Decimal | string;
  /** Jednostka z dokumentu, np. "kWh", "MWh". */
  quantityUnit: string;
  /** Wartość wskaźnika, np. 0,553. */
  factorValue: Decimal | string;
  /** Jednostka wskaźnika, np. "kg CO₂e/kWh". */
  factorUnit: string;
}

export interface CalculationResult {
  /** Ilość przeliczona na mianownik wskaźnika — to trafia do `EmissionEntry.quantity`. */
  quantity: Decimal;
  /** Jednostka mianownika wskaźnika — `EmissionEntry.unit`. */
  unit: string;
  co2eKg: Decimal;
  co2eTon: Decimal;
  /** True, gdy trzeba było przeliczyć jednostkę (MWh → kWh itp.). */
  converted: boolean;
}

const toDecimal = (v: Decimal | string): Decimal =>
  typeof v === "string" ? new Prisma.Decimal(v) : v;

export function calculateEmission(input: CalculationInput): CalculationResult {
  const rawQuantity = toDecimal(input.quantity);
  const factorValue = toDecimal(input.factorValue);

  const denominator = factorDenominatorUnit(input.factorUnit);
  if (!denominator) {
    throw new UnitConversionError(
      `Wskaźnik ma nieprawidłową jednostkę „${input.factorUnit}" — oczekiwano formatu „kg CO₂e/<jednostka>".`,
      "BAD_FACTOR_UNIT",
    );
  }

  const quantity = convertQuantity(rawQuantity, input.quantityUnit, denominator);
  const co2eKg = quantity.mul(factorValue);

  return {
    quantity,
    unit: denominator,
    co2eKg,
    co2eTon: co2eKg.div(1000),
    converted: !quantity.equals(rawQuantity),
  };
}

/** Suma emisji — używana dla sumy faktury i sumy paczki. */
export function sumCo2eKg(values: Array<Decimal | string>): Decimal {
  return values.reduce<Decimal>(
    (acc, v) => acc.add(toDecimal(v)),
    new Prisma.Decimal(0),
  );
}
