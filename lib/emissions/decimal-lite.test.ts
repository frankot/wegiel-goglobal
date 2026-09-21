import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { multiplyDecimal, divideByPowerOfTen, previewEmission } from "./decimal-lite";
import { calculateEmission } from "./calculate";

describe("decimal-lite — podgląd klienta zgadza się z zapisem serwera", () => {
  const cases = [
    { quantity: "2852.000", quantityUnit: "kWh", factorValue: "0.553", factorUnit: "kg CO₂e/kWh" },
    { quantity: "2.852", quantityUnit: "MWh", factorValue: "0.553", factorUnit: "kg CO₂e/kWh" },
    { quantity: "1240", quantityUnit: "kWh", factorValue: "0.553", factorUnit: "kg CO₂e/kWh" },
    { quantity: "120", quantityUnit: "litr", factorValue: "2.62", factorUnit: "kg CO₂e/litr" },
    { quantity: "1.5", quantityUnit: "t", factorValue: "2.45", factorUnit: "kg CO₂e/kg" },
    { quantity: "0.1", quantityUnit: "kWh", factorValue: "0.2", factorUnit: "kg CO₂e/kWh" },
  ];

  for (const c of cases) {
    test(`${c.quantity} ${c.quantityUnit} × ${c.factorValue}`, () => {
      const client = previewEmission(c);
      const server = calculateEmission(c);
      assert.ok(client, "podgląd klienta nie może być pusty");
      assert.equal(client!.co2eKg, server.co2eKg.toString());
      assert.equal(client!.co2eTon, server.co2eTon.toString());
      assert.equal(client!.quantity, server.quantity.toString());
    });
  }

  test("test złoty również po stronie klienta", () => {
    const p = previewEmission({
      quantity: "2852.000",
      quantityUnit: "kWh",
      factorValue: "0.553",
      factorUnit: "kg CO₂e/kWh",
    });
    assert.equal(p!.co2eKg, "1577.156");
    assert.equal(p!.co2eTon, "1.577156");
  });

  test("mnożenie jest dokładne tam, gdzie float by skłamał", () => {
    // Number: 2852 * 0.553 === 1577.1560000000002
    assert.equal(multiplyDecimal("2852", "0.553"), "1577.156");
    assert.equal(multiplyDecimal("0.1", "0.2"), "0.02");
    assert.notEqual((2852 * 0.553).toString(), "1577.156");
  });

  test("dzielenie przez potęgę 10 przesuwa przecinek", () => {
    assert.equal(divideByPowerOfTen("1577.156", 3), "1.577156");
    assert.equal(divideByPowerOfTen("1000", 3), "1");
  });

  test("jednostka spoza allow-listy nie daje podglądu (mc)", () => {
    const p = previewEmission({
      quantity: "1.000",
      quantityUnit: "mc",
      factorValue: "1.99",
      factorUnit: "kg CO₂e/m³",
    });
    assert.equal(p, null);
  });

  test("odrzuca wejście, które nie jest liczbą", () => {
    assert.equal(multiplyDecimal("abc", "1"), null);
    assert.equal(multiplyDecimal("", "1"), null);
  });
});
