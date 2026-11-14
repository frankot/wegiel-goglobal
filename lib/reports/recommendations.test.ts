import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buildRecommendations, selectSources } from "./recommendations";
import type { SourceBreakdown } from "./aggregate";

const src = (id: string, type: SourceBreakdown["type"], kg: number, sharePct: number, changePct: number | null = null): SourceBreakdown => ({
  sourceId: id,
  name: id,
  type,
  scope: type === "ELECTRICITY" || type === "HEAT" || type === "COOLING" ? "SCOPE_2" : "SCOPE_1",
  kg: String(kg),
  sharePct,
  usage: [],
  factors: [],
  entryCount: 1,
  lastYearKg: null,
  changePct,
});

const sources = [
  src("Licznik główny", "ELECTRICITY", 5000, 50),
  src("Kotłownia", "STATIONARY_INSTALLATION", 2500, 25),
  src("Magazyn", "ELECTRICITY", 1000, 10),
  src("Flota", "COMPANY_VEHICLE", 800, 8, 35),
  src("Węzeł", "HEAT", 700, 7, -5),
];

describe("Rekomendacje", () => {
  test("źródła do 80% emisji oraz rosnące ≥10% r/r", () => {
    const picked = selectSources(sources);
    assert.deepEqual(picked.map((p) => p.name), ["Licznik główny", "Kotłownia", "Magazyn", "Flota"]);
    assert.deepEqual(picked.find((p) => p.name === "Flota")!.reasons, ["growth"]);
    assert.deepEqual(picked.find((p) => p.name === "Magazyn")!.reasons, ["share"]);
  });

  test("grupowanie według typu, malejąco po udziale", () => {
    const groups = buildRecommendations(sources);
    assert.deepEqual(groups.map((g) => [g.type, g.sharePct, g.sources.length]), [
      ["ELECTRICITY", 60, 2],
      ["STATIONARY_INSTALLATION", 25, 1],
      ["COMPANY_VEHICLE", 8, 1],
    ]);
    assert.ok(groups[0]!.actions.length >= 3);
  });

  test("puste dane — brak rekomendacji", () => {
    assert.deepEqual(buildRecommendations([]), []);
  });
});
