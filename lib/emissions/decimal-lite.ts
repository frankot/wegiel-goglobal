/**
 * Dokładna arytmetyka dziesiętna na BigInt — dla PODGLĄDU po stronie klienta.
 *
 * Wartość zapisywana do bazy liczy wyłącznie serwer na `Prisma.Decimal`
 * (lib/emissions/calculate.ts). Ten moduł istnieje, żeby podgląd na żywo
 * pokazywał dokładnie tę samą liczbę co zapis — gdyby używał `number`,
 * 2852 × 0,553 dałoby 1577.1560000000002 i użytkownik zobaczyłby inną
 * wartość przed zapisem niż po nim.
 *
 * Bez zależności zewnętrznych — decimal.js jest schowany w runtime Prismy
 * i nie da się go zaimportować bez wciągania klienta bazy do przeglądarki.
 */
import { lookupUnit } from "./unit-table";

interface Scaled {
  /** Wartość jako liczba całkowita przeskalowana o 10^scale. */
  value: bigint;
  scale: number;
}

function parse(input: string): Scaled | null {
  const s = input.trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const negative = s.startsWith("-");
  const body = negative ? s.slice(1) : s;
  const [intPart = "0", fracPart = ""] = body.split(".");
  const digits = `${intPart}${fracPart}` || "0";
  const value = BigInt(digits) * (negative ? -1n : 1n);
  return { value, scale: fracPart.length };
}

function render({ value, scale }: Scaled): string {
  const negative = value < 0n;
  let digits = (negative ? -value : value).toString();
  if (scale === 0) return `${negative ? "-" : ""}${digits}`;

  digits = digits.padStart(scale + 1, "0");
  const intPart = digits.slice(0, digits.length - scale);
  const fracPart = digits.slice(digits.length - scale).replace(/0+$/, "");
  return `${negative ? "-" : ""}${intPart}${fracPart ? `.${fracPart}` : ""}`;
}

/** Mnożenie dokładne: 2852 × 0.553 = 1577.156, bez błędu zmiennoprzecinkowego. */
export function multiplyDecimal(a: string, b: string): string | null {
  const x = parse(a);
  const y = parse(b);
  if (!x || !y) return null;
  return render({ value: x.value * y.value, scale: x.scale + y.scale });
}

/** Dzielenie przez potęgę dziesiątki — przesunięcie przecinka, zawsze dokładne. */
export function divideByPowerOfTen(a: string, power: number): string | null {
  const x = parse(a);
  if (!x) return null;
  return render({ value: x.value, scale: x.scale + power });
}

/** Dodawanie dokładne — do sum faktury i całej paczki. */
export function addDecimal(a: string, b: string): string | null {
  const x = parse(a);
  const y = parse(b);
  if (!x || !y) return null;
  const scale = Math.max(x.scale, y.scale);
  const lift = (v: Scaled) => v.value * 10n ** BigInt(scale - v.scale);
  return render({ value: lift(x) + lift(y), scale });
}

/** Suma listy wartości dziesiętnych; pomija wpisy nieparsowalne. */
export function sumDecimals(values: string[]): string {
  let acc = "0";
  for (const v of values) {
    const next = addDecimal(acc, v);
    if (next !== null) acc = next;
  }
  return acc;
}

/**
 * Konwersja jednostki po stronie klienta — używa tej samej tabeli co serwer.
 * Zwraca null dla jednostki spoza allow-listy (np. `mc`).
 */
export function convertQuantityLite(
  quantity: string,
  fromUnit: string,
  toUnit: string,
): string | null {
  const from = lookupUnit(fromUnit);
  const to = lookupUnit(toUnit);
  if (!from || !to || from.canonical !== to.canonical) return null;
  if (from.multiplier === to.multiplier) {
    const parsed = parse(quantity);
    return parsed ? render(parsed) : null;
  }

  // Mnożniki w tabeli to albo potęgi 10, albo 277.777778 (GJ→kWh).
  const scaled = multiplyDecimal(quantity, from.multiplier);
  if (!scaled) return null;
  const divisor = parse(to.multiplier);
  if (!divisor) return null;
  if (divisor.value === 0n) return null;

  // Dzielenie tylko przez potęgi 10 — pozostałe przypadki w tabeli nie występują.
  const asString = render(divisor);
  const power = /^1(0*)$/.test(asString) ? asString.length - 1 : null;
  if (power === null) return null;
  return divideByPowerOfTen(scaled, power);
}

export interface LivePreview {
  quantity: string;
  unit: string;
  co2eKg: string;
  co2eTon: string;
}

/** Podgląd emisji dla jednej pozycji — dokładnie ta sama liczba co przy zapisie. */
export function previewEmission(params: {
  quantity: string;
  quantityUnit: string;
  factorValue: string;
  factorUnit: string;
}): LivePreview | null {
  const denominator = params.factorUnit.split("/").pop()?.trim();
  if (!denominator) return null;

  const converted = convertQuantityLite(
    params.quantity,
    params.quantityUnit,
    denominator,
  );
  if (converted === null) return null;

  const co2eKg = multiplyDecimal(converted, params.factorValue);
  if (co2eKg === null) return null;

  const co2eTon = divideByPowerOfTen(co2eKg, 3);
  if (co2eTon === null) return null;

  return { quantity: converted, unit: denominator, co2eKg, co2eTon };
}
