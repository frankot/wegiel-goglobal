import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolveFactor, type FactorCandidate } from "./resolve-factor";

const factor = (
  id: string,
  from: string,
  to: string,
  lineageId = id,
): FactorCandidate => ({
  id,
  name: id,
  category: "",
  value: "1",
  unit: "kg CO₂e/kWh",
  scope: "SCOPE_2",
  validFrom: new Date(from),
  validTo: new Date(to),
  lineageId,
});

const ee2026 = factor("ee2026", "2026-01-01", "2026-12-31");
const ee2025 = factor("ee2025", "2025-01-01", "2025-12-31", "ee2026");
const heat = factor("heat", "2025-01-01", "2027-12-31");
const all = [ee2026, ee2025, heat];

describe("resolveFactor — wersje linii domyślnego wskaźnika", () => {
  test("bieżący okres → domyślny wskaźnik źródła", () => {
    const r = resolveFactor({ candidates: all, refDate: new Date("2026-08-31"), defaultFactorId: "ee2026" });
    assert.equal(r.status, "RESOLVED");
    assert.equal(r.status === "RESOLVED" && r.factor.id, "ee2026");
  });

  test("grudzień zeszłego roku → archiwalna wersja tej samej linii, nie ciepło", () => {
    const r = resolveFactor({ candidates: all, refDate: new Date("2025-12-31"), defaultFactorId: "ee2026" });
    assert.equal(r.status, "RESOLVED");
    assert.equal(r.status === "RESOLVED" && r.factor.id, "ee2025");
    assert.equal(r.status === "RESOLVED" && r.reason, "SOURCE_DEFAULT_VERSION");
  });

  test("bez źródła remis zostaje remisem — decyduje człowiek", () => {
    const r = resolveFactor({ candidates: all, refDate: new Date("2025-12-31") });
    assert.equal(r.status, "AMBIGUOUS");
  });

  test("brak wersji na daną datę → NONE", () => {
    const r = resolveFactor({ candidates: [ee2026], refDate: new Date("2024-06-30"), defaultFactorId: "ee2026" });
    assert.equal(r.status, "NONE");
  });
});
