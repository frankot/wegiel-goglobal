import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  isUnitCompatibleWithFactor,
  normalizeNip,
  normalizeIdentifier,
  scopeForType,
  supportsGridIdentifiers,
  UNITS_BY_TYPE,
} from "./source-types";

describe("zakres wynika z typu źródła (GHG Protocol)", () => {
  test("spalanie u siebie to Zakres 1", () => {
    assert.equal(scopeForType("STATIONARY_INSTALLATION"), "SCOPE_1");
    assert.equal(scopeForType("COMPANY_VEHICLE"), "SCOPE_1");
  });

  test("zakup energii to Zakres 2", () => {
    assert.equal(scopeForType("ELECTRICITY"), "SCOPE_2");
    assert.equal(scopeForType("HEAT"), "SCOPE_2");
    assert.equal(scopeForType("COOLING"), "SCOPE_2");
  });
});

describe("zgodność jednostki źródła ze wskaźnikiem", () => {
  test("licznik w kWh pasuje do wskaźnika kg CO₂e/kWh", () => {
    assert.equal(isUnitCompatibleWithFactor("kWh", "kg CO₂e/kWh"), true);
  });

  test("licznik w MWh też pasuje — przeliczalny na kWh", () => {
    assert.equal(isUnitCompatibleWithFactor("MWh", "kg CO₂e/kWh"), true);
  });

  test("ciepło w GJ pasuje do wskaźnika na kWh", () => {
    assert.equal(isUnitCompatibleWithFactor("GJ", "kg CO₂e/kWh"), true);
  });

  test("zbiornik w litrach NIE pasuje do wskaźnika na kWh", () => {
    assert.equal(isUnitCompatibleWithFactor("litr", "kg CO₂e/kWh"), false);
  });

  test("odrzuca wskaźnik bez mianownika", () => {
    assert.equal(isUnitCompatibleWithFactor("kWh", "kg CO₂e"), false);
  });

  test("każdy typ ma jednostki zgodne z własnym wskaźnikiem referencyjnym", () => {
    assert.equal(isUnitCompatibleWithFactor(UNITS_BY_TYPE.ELECTRICITY[0]!, "kg CO₂e/kWh"), true);
    assert.equal(isUnitCompatibleWithFactor(UNITS_BY_TYPE.COMPANY_VEHICLE[0]!, "kg CO₂e/litr"), true);
    assert.equal(isUnitCompatibleWithFactor(UNITS_BY_TYPE.STATIONARY_INSTALLATION[0]!, "kg CO₂e/m³"), true);
  });
});

describe("identyfikatory", () => {
  test("PPE i licznik tylko dla punktów poboru energii", () => {
    assert.equal(supportsGridIdentifiers("ELECTRICITY"), true);
    assert.equal(supportsGridIdentifiers("HEAT"), true);
    assert.equal(supportsGridIdentifiers("COOLING"), true);
    assert.equal(supportsGridIdentifiers("COMPANY_VEHICLE"), false);
    assert.equal(supportsGridIdentifiers("STATIONARY_INSTALLATION"), false);
  });

  test("NIP: 10 cyfr, myślniki i spacje dopuszczalne", () => {
    assert.equal(normalizeNip("9730421440"), "9730421440");
    assert.equal(normalizeNip("973-042-14-40"), "9730421440");
    assert.equal(normalizeNip("973 042 14 40"), "9730421440");
  });

  test("NIP odrzuca zły format", () => {
    assert.equal(normalizeNip("12345"), null);
    assert.equal(normalizeNip("97304214401"), null);
    assert.equal(normalizeNip("abcdefghij"), null);
  });

  test("PPE czyszczony ze spacji — z faktury bywa rozstrzelony", () => {
    assert.equal(
      normalizeIdentifier(" 5905 4355 0100 711505 "),
      "590543550100711505",
    );
  });
});
