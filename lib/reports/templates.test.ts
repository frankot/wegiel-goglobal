import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { ghgIntensity, parseRevenue } from "./templates";
import { parseReportParams, reportParamsToSearch } from "./params";
import { reportFileName } from "./format";

const TODAY = new Date("2026-11-14T12:00:00Z");

describe("Szablony raportów", () => {
  test("szablon i przychody przechodzą przez URL", () => {
    const p = parseReportParams(new URLSearchParams("szablon=esrs&preset=previousYear&przychody=12500000.50"), TODAY);
    assert.equal(p.template, "esrs");
    assert.equal(p.revenue, "12500000.50");
    assert.equal(p.from, "2025-01-01");
    const again = parseReportParams(reportParamsToSearch(p), TODAY);
    assert.equal(again.template, "esrs");
    assert.equal(again.revenue, "12500000.50");
  });

  test("domyślnie pełny raport, nieznany szablon ignorowany, przychody tylko dla ESRS", () => {
    assert.equal(parseReportParams({}, TODAY).template, "full");
    assert.equal(parseReportParams({ szablon: "xyz" }, TODAY).template, "full");
    assert.equal(parseReportParams({ szablon: "monthly", przychody: "1000" }, TODAY).revenue, null);
    assert.equal(reportParamsToSearch(parseReportParams({}, TODAY)).has("szablon"), false);
  });

  test("nazwa pliku PDF zależy od szablonu", () => {
    const p = parseReportParams({ szablon: "quarterly", preset: "previousQuarter" }, TODAY);
    assert.equal(reportFileName(p, "pdf"), "raport-kwartalny_2026-07-01_2026-09-30.pdf");
    assert.equal(reportFileName(p, "xlsx"), "raport-slad-weglowy_2026-07-01_2026-09-30.xlsx");
  });

  test("przychody: format polski, odrzucanie błędnych", () => {
    assert.equal(parseRevenue("12 500 000,50"), "12500000.50");
    assert.equal(parseRevenue("0"), null);
    assert.equal(parseRevenue("-5"), null);
    assert.equal(parseRevenue("abc"), null);
  });

  test("intensywność emisji na mln PLN przychodu", () => {
    assert.equal(ghgIntensity("23201", "10000000"), 2.3201);
    assert.equal(ghgIntensity("23201", null), null);
  });
});
