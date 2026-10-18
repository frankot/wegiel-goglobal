import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@/lib/generated/prisma/client";
import { calculateEmission } from "./calculate";
import { convertQuantity, factorDenominatorUnit, isKnownUnit, UnitConversionError } from "./units";

describe("test złoty — faktura Unimot (example/unimot-calc.md)", () => {
  test("2852 kWh × 0,553 kg CO₂e/kWh = 1577,156 kg = 1,577156 t", () => {
    const r = calculateEmission({
      quantity: "2852.000",
      quantityUnit: "kWh",
      factorValue: "0.553",
      factorUnit: "kg CO₂e/kWh",
    });

    assert.equal(r.co2eKg.toString(), "1577.156");
    assert.equal(r.co2eTon.toString(), "1.577156");
    assert.equal(r.quantity.toString(), "2852");
    assert.equal(r.unit, "kWh");
    assert.equal(r.converted, false);
  });

  test("wynik nie traci precyzji przy zapisie do Decimal(16,6)", () => {
    const r = calculateEmission({
      quantity: "2852.000",
      quantityUnit: "kWh",
      factorValue: "0.553",
      factorUnit: "kg CO₂e/kWh",
    });
    assert.equal(r.co2eTon.toFixed(6), "1.577156");
    assert.notEqual(r.co2eTon.toFixed(4), "1.577156");
  });
});

describe("konwersja jednostek — allow-lista", () => {
  test("MWh → kWh mnoży przez 1000", () => {
    const r = calculateEmission({
      quantity: "2.852",
      quantityUnit: "MWh",
      factorValue: "0.553",
      factorUnit: "kg CO₂e/kWh",
    });
    assert.equal(r.co2eKg.toString(), "1577.156");
    assert.equal(r.quantity.toString(), "2852");
    assert.equal(r.converted, true);
  });

  test("PUŁAPKA: `mc` (miesiąc) nie jest jednostką zużycia", () => {
    assert.equal(isKnownUnit("mc"), false);
    assert.throws(
      () =>
        calculateEmission({
          quantity: "1.000",
          quantityUnit: "mc",
          factorValue: "1.99",
          factorUnit: "kg CO₂e/m³",
        }),
      (e: unknown) =>
        e instanceof UnitConversionError && e.code === "UNKNOWN_UNIT",
    );
  });

  test("`m³` jest jednostką zużycia, `mc` nie — nie wolno ich pomylić", () => {
    assert.equal(isKnownUnit("m³"), true);
    assert.equal(isKnownUnit("m3"), true);
    assert.equal(isKnownUnit("mc"), false);
  });

  test("odmawia konwersji między różnymi wielkościami fizycznymi", () => {
    assert.throws(
      () => convertQuantity(new Prisma.Decimal("1"), "litr", "kWh"),
      (e: unknown) =>
        e instanceof UnitConversionError && e.code === "INCOMPATIBLE_UNITS",
    );
  });

  test("odczytuje mianownik z jednostki wskaźnika", () => {
    assert.equal(factorDenominatorUnit("kg CO₂e/kWh"), "kWh");
    assert.equal(factorDenominatorUnit("kg CO₂e/litr"), "litr");
    assert.equal(factorDenominatorUnit("kg CO₂e/m³"), "m³");
    assert.equal(factorDenominatorUnit("bezMianownika"), null);
  });

  test("tona → kg mnoży przez 1000", () => {
    const r = calculateEmission({
      quantity: "1.5",
      quantityUnit: "t",
      factorValue: "2.45",
      factorUnit: "kg CO₂e/kg",
    });
    assert.equal(r.quantity.toString(), "1500");
    assert.equal(r.co2eKg.toString(), "3675");
  });
});

describe("arytmetyka Decimal, nie float", () => {
  test("0,1 + 0,2 sumuje się dokładnie", () => {
    const r1 = calculateEmission({
      quantity: "0.1",
      quantityUnit: "kWh",
      factorValue: "1",
      factorUnit: "kg CO₂e/kWh",
    });
    const r2 = calculateEmission({
      quantity: "0.2",
      quantityUnit: "kWh",
      factorValue: "1",
      factorUnit: "kg CO₂e/kWh",
    });
    assert.equal(r1.co2eKg.add(r2.co2eKg).toString(), "0.3");
  });
});
