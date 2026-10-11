import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buyerNipWarning,
  formatNip,
  normalizeCompanyNip,
  normalizeKrs,
  normalizeRegon,
} from "./identifiers";

describe("NIP firmy", () => {
  test("poprawny NIP w różnych zapisach", () => {
    assert.equal(normalizeCompanyNip("8133378641"), "8133378641");
    assert.equal(normalizeCompanyNip("813-337-86-41"), "8133378641");
    assert.equal(normalizeCompanyNip("PL 813 337 86 41"), "8133378641");
  });

  test("zła suma kontrolna i zła długość", () => {
    assert.equal(normalizeCompanyNip("8133378642"), null);
    assert.equal(normalizeCompanyNip("813337864"), null);
    assert.equal(normalizeCompanyNip("abcdefghij"), null);
  });

  test("formatowanie", () => {
    assert.equal(formatNip("8133378641"), "813-337-86-41");
  });
});

describe("REGON", () => {
  test("9 i 14 cyfr z poprawną sumą", () => {
    assert.equal(normalizeRegon("123456785"), "123456785");
    assert.equal(normalizeRegon("12345678512347"), "12345678512347");
  });

  test("zła suma kontrolna", () => {
    assert.equal(normalizeRegon("123456786"), null);
    assert.equal(normalizeRegon("12345678512348"), null);
    assert.equal(normalizeRegon("1234567"), null);
  });
});

describe("KRS", () => {
  test("uzupełnia zerami do 10 cyfr", () => {
    assert.equal(normalizeKrs("123456"), "0000123456");
    assert.equal(normalizeKrs("0000123456"), "0000123456");
  });

  test("odrzuca za długi, pusty i same zera", () => {
    assert.equal(normalizeKrs("12345678901"), null);
    assert.equal(normalizeKrs("0000000000"), null);
    assert.equal(normalizeKrs("abc"), null);
  });
});

describe("Ostrzeżenie o NIP nabywcy", () => {
  test("ten sam NIP — bez ostrzeżenia, także w innym zapisie", () => {
    assert.equal(buyerNipWarning("8133378641", "8133378641"), null);
    assert.equal(buyerNipWarning("PL 813-337-86-41", "8133378641"), null);
  });

  test("inny NIP — ostrzeżenie z oboma numerami", () => {
    const w = buyerNipWarning("9730421440", "8133378641");
    assert.ok(w?.includes("973-042-14-40"));
    assert.ok(w?.includes("813-337-86-41"));
  });

  test("brak NIP-u firmy lub nabywcy — nic nie porównujemy", () => {
    assert.equal(buyerNipWarning(undefined, "8133378641"), null);
    assert.equal(buyerNipWarning("9730421440", null), null);
  });
});
