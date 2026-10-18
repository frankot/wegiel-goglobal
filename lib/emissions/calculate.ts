/** CO₂e calculation */
import { Prisma } from "@/lib/generated/prisma/client";
import { convertQuantity, factorDenominatorUnit, UnitConversionError } from "./units";

type Decimal = Prisma.Decimal;

export interface CalculationInput {
  quantity: Decimal | string;
  quantityUnit: string;
  factorValue: Decimal | string;
  factorUnit: string;
}

export interface CalculationResult {
  quantity: Decimal;
  unit: string;
  co2eKg: Decimal;
  co2eTon: Decimal;
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

export function sumCo2eKg(values: Array<Decimal | string>): Decimal {
  return values.reduce<Decimal>(
    (acc, v) => acc.add(toDecimal(v)),
    new Prisma.Decimal(0),
  );
}
