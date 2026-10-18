import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  monthsInRange,
  parseReportParams,
  presetRange,
  previousPeriod,
  reportParamsToSearch,
  samePeriodLastYear,
} from "./params";
import { buildReport, changePct, type ReportRow } from "./aggregate";

const TODAY = new Date("2026-10-11T12:00:00Z");

describe("Presety dat", () => {
  test("bieżący rok to YTD, poprzedni rok pełny", () => {
    assert.deepEqual(presetRange("currentYear", TODAY), { from: "2026-01-01", to: "2026-10-11" });
    assert.deepEqual(presetRange("previousYear", TODAY), { from: "2025-01-01", to: "2025-12-31" });
  });

  test("miesiące i ostatnie 12 miesięcy", () => {
    assert.deepEqual(presetRange("currentMonth", TODAY), { from: "2026-10-01", to: "2026-10-11" });
    assert.deepEqual(presetRange("previousMonth", TODAY), { from: "2026-09-01", to: "2026-09-30" });
    assert.deepEqual(presetRange("last12Months", TODAY), { from: "2025-11-01", to: "2026-10-11" });
  });

  test("poprzedni miesiąc w styczniu to grudzień poprzedniego roku", () => {
    const jan = new Date("2026-01-15T00:00:00Z");
    assert.deepEqual(presetRange("previousMonth", jan), { from: "2025-12-01", to: "2025-12-31" });
  });
});

describe("Okresy porównawcze", () => {
  test("poprzedni okres ma tę samą długość i kończy się dzień przed", () => {
    assert.deepEqual(previousPeriod("2026-09-01", "2026-09-30"), {
      from: "2026-08-02",
      to: "2026-08-31",
    });
  });

  test("rok wcześniej — 29 lutego przechodzi na 28", () => {
    assert.deepEqual(samePeriodLastYear("2024-02-01", "2024-02-29"), {
      from: "2023-02-01",
      to: "2023-02-28",
    });
  });

  test("miesiące w zakresie przez przełom roku", () => {
    assert.deepEqual(monthsInRange("2025-11-15", "2026-02-01"), [
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });
});

describe("Parametry z URL", () => {
  test("domyślnie bieżący rok i zweryfikowane wpisy", () => {
    const p = parseReportParams({}, TODAY);
    assert.equal(p.preset, "currentYear");
    assert.equal(p.from, "2026-01-01");
    assert.deepEqual(p.statuses, ["VERIFIED", "CORRECTED"]);
  });

  test("własny zakres, filtry po przecinku, śmieci odrzucone", () => {
    const p = parseReportParams(
      { from: "2026-03-31", to: "2026-01-01", scope: "SCOPE_2,XXX", type: ["HEAT", "ELECTRICITY"], status: "DRAFT" },
      TODAY,
    );
    assert.equal(p.preset, "custom");
    assert.deepEqual([p.from, p.to], ["2026-01-01", "2026-03-31"]);
    assert.deepEqual(p.scopes, ["SCOPE_2"]);
    assert.deepEqual(p.types, ["HEAT", "ELECTRICITY"]);
    assert.deepEqual(p.statuses, ["DRAFT"]);
  });

  test("nieistniejąca data wraca do domyślnego zakresu", () => {
    const p = parseReportParams({ from: "2026-02-30", to: "2026-03-01" }, TODAY);
    assert.equal(p.preset, "currentYear");
  });

  test("URL → parametry → URL jest stabilny", () => {
    const p = parseReportParams({ preset: "previousYear", scope: "SCOPE_1" }, TODAY);
    assert.equal(reportParamsToSearch(p).toString(), "preset=previousYear&scope=SCOPE_1");
  });
});

function row(overrides: Partial<ReportRow>): ReportRow {
  return {
    id: Math.random().toString(36).slice(2),
    entryDate: "2026-01-31",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    sourceId: "src-el",
    sourceName: "Licznik główny",
    sourceType: "ELECTRICITY",
    scope: "SCOPE_2",
    quantity: "2852",
    unit: "kWh",
    factorId: "fac-el",
    factorName: "Energia elektryczna PL",
    factorOrigin: "KOBIZE",
    factorValue: "0.553",
    factorUnit: "kg CO₂e/kWh",
    co2eKg: "1577.156",
    status: "VERIFIED",
    invoiceId: "inv-1",
    invoiceNumber: "FV/1",
    supplierName: "Unimot",
    authorName: "Anna",
    ...overrides,
  };
}

describe("Agregacja raportu", () => {
  const params = parseReportParams({ preset: "currentYear" }, TODAY);
  const all = [
    row({}),
    row({ entryDate: "2026-02-28", co2eKg: "1000", invoiceId: "inv-2", invoiceNumber: "FV/2" }),
    row({
      sourceId: "src-car",
      sourceName: "Auto",
      sourceType: "COMPANY_VEHICLE",
      scope: "SCOPE_1",
      quantity: "100",
      unit: "litr",
      factorId: "fac-on",
      factorName: "Olej napędowy",
      factorValue: "2.6",
      factorUnit: "kg CO₂e/litr",
      co2eKg: "260",
      invoiceId: null,
      invoiceNumber: null,
    }),
    row({ status: "DRAFT", co2eKg: "999" }),
  ];
  const report = buildReport(params, all, [row({ co2eKg: "1418.578" })], [row({ co2eKg: "2837.156" })]);

  test("sumy dokładne, bez szkiców", () => {
    assert.equal(report.totalKg, "2837.156");
    assert.equal(report.totalTon, "2.837156");
    assert.equal(report.scope1Kg, "260");
    assert.equal(report.scope2Kg, "2577.156");
    assert.equal(report.entryCount, 3);
  });

  test("miesiące obejmują cały zakres, także puste", () => {
    assert.equal(report.monthly.length, 10);
    assert.equal(report.monthly[0]!.totalKg, "1837.156");
    assert.equal(report.monthly[1]!.totalKg, "1000");
    assert.equal(report.monthly[5]!.totalKg, "0");
  });

  test("porównania: +100% wobec poprzedniego okresu, 0% rok do roku", () => {
    assert.equal(report.previous.changePct, 100);
    assert.equal(report.lastYear.changePct, 0);
    assert.equal(changePct("10", "0"), null);
  });

  test("podział według źródeł malejąco, z ilością w jednostkach", () => {
    assert.equal(report.bySource[0]!.sourceId, "src-el");
    assert.equal(report.bySource[0]!.sharePct, 90.8);
    assert.deepEqual(report.bySource[0]!.usage, [{ unit: "kWh", quantity: "5704" }]);
    assert.equal(report.byType.length, 2);
  });

  test("jakość danych liczy pominięte szkice", () => {
    assert.equal(report.quality.excludedDrafts, 1);
    assert.equal(report.quality.withoutInvoice, 1);
    assert.equal(report.quality.byStatus.DRAFT.kg, "999");
    assert.equal(report.invoiceCount, 2);
  });
});

describe("Eksport CSV — ochrona przed formułami", async () => {
  const { csvSafeText } = await import("./format");

  test("tekst zaczynający się od znaku formuły dostaje apostrof", () => {
    for (const v of ["=HYPERLINK(\"http://x\")", "+48 123", "-cmd", "@SUM(A1)", "\tx", "\rx"]) {
      assert.equal(csvSafeText(v), `'${v}`);
    }
  });

  test("zwykły tekst bez zmian", () => {
    assert.equal(csvSafeText("UNIMOT ENERGIA i GAZ Sp. z o.o."), "UNIMOT ENERGIA i GAZ Sp. z o.o.");
    assert.equal(csvSafeText(""), "");
  });
});
