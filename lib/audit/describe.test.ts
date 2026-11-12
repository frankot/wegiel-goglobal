import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { describeEvent } from "./describe";

const ev = (entity: string, action: string, details?: object) => ({
  entity,
  action,
  details: details ? JSON.stringify(details) : null,
});

describe("Dziennik zdarzeń — opisy", () => {
  test("import faktury z WAPRO", () => {
    const d = describeEvent(
      ev("Invoice", "IMPORT", {
        format: "WAPRO_XLSX",
        fileName: "energia.xlsx",
        invoiceNumber: "PZ /ŚW/001/1026",
        lines: 1,
        status: "VERIFIED",
        totalCo2eKg: "2178.748",
      }),
    );
    assert.equal(d.summary, "Zapis faktury PZ /ŚW/001/1026 — WAPRO MAG, 1 poz., 2,179 t CO₂e (Zweryfikowany)");
    assert.ok(d.details.some((x) => x.label === "Plik" && x.value === "energia.xlsx"));
  });

  test("zmiana roli i dezaktywacja", () => {
    assert.equal(
      describeEvent(ev("User", "UPDATE", { email: "a@b.pl", role: { from: "USER", to: "ANALYST" } })).summary,
      "Zmiana roli a@b.pl: Użytkownik → Analityk",
    );
    assert.equal(
      describeEvent(ev("User", "UPDATE", { email: "a@b.pl", active: { from: true, to: false } })).summary,
      "Dezaktywacja konta a@b.pl",
    );
  });

  test("korekta ilości wpisu pokazuje zmianę statusu w szczegółach", () => {
    const d = describeEvent(
      ev("EmissionEntry", "CORRECT", {
        status: { from: "VERIFIED", to: "CORRECTED" },
        quantity: { from: "2852", to: "2900" },
      }),
    );
    assert.equal(d.summary, "Korekta ilości wpisu: 2852 → 2900");
    assert.deepEqual(d.details[0], { label: "Status", value: "Zweryfikowany → Skorygowany" });
  });

  test("niezmienione wartości nie trafiają do opisu ani szczegółów", () => {
    const d = describeEvent(
      ev("EmissionFactor", "UPDATE", { value: { from: "0.676", to: "0.676" }, unit: { from: "kg", to: "kg CO₂e/kWh" } }),
    );
    assert.equal(d.summary, "Edycja wskaźnika emisji");
    assert.equal(d.details.length, 1);
  });

  test("logowanie i nieznane zdarzenie", () => {
    assert.equal(describeEvent(ev("User", "LOGIN")).summary, "Logowanie do systemu");
    assert.equal(describeEvent(ev("Coś", "NOWE")).summary, "NOWE — Coś");
  });
});
