import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { isCovered, kobizeReminder, lastClosedPeriod, lineageWarnings, plural, type FactorVersion } from "./rules";

const d = (s: string) => new Date(`${s}T12:00:00Z`);

describe("Przypomnienia — okresy", () => {
  test("miesięcznie: poprzedni miesiąc dopiero po 10 dniach", () => {
    assert.deepEqual(lastClosedPeriod("MONTHLY", d("2026-11-14")), { from: "2026-10-01", to: "2026-10-31", label: "październik 2026" });
    assert.equal(lastClosedPeriod("MONTHLY", d("2026-11-05"))!.label, "wrzesień 2026");
    assert.equal(lastClosedPeriod("MONTHLY", d("2026-01-15"))!.label, "grudzień 2025");
  });

  test("kwartalnie i rocznie", () => {
    assert.deepEqual(lastClosedPeriod("QUARTERLY", d("2026-11-14")), { from: "2026-07-01", to: "2026-09-30", label: "III kwartał 2026" });
    assert.equal(lastClosedPeriod("QUARTERLY", d("2026-01-05"))!.label, "III kwartał 2025");
    assert.equal(lastClosedPeriod("QUARTERLY", d("2026-01-12"))!.label, "IV kwartał 2025");
    assert.deepEqual(lastClosedPeriod("YEARLY", d("2026-01-12")), { from: "2025-01-01", to: "2025-12-31", label: "rok 2025" });
    assert.equal(lastClosedPeriod("NONE", d("2026-11-14")), null);
  });

  test("pokrycie okresu wpisami", () => {
    const oct = lastClosedPeriod("MONTHLY", d("2026-11-14"))!;
    assert.equal(isCovered(oct, [{ periodStart: "2026-10-01", periodEnd: "2026-10-31", entryDate: "2026-10-31" }]), true);
    assert.equal(isCovered(oct, [{ periodStart: "2026-09-01", periodEnd: "2026-09-30", entryDate: "2026-09-30" }]), false);
    assert.equal(isCovered(oct, [{ periodStart: null, periodEnd: null, entryDate: "2026-10-12" }]), true);
    const q3 = lastClosedPeriod("QUARTERLY", d("2026-11-14"))!;
    assert.equal(isCovered(q3, [{ periodStart: "2026-07-01", periodEnd: "2026-09-30", entryDate: "2026-09-30" }]), true);
  });
});

const v = (id: string, validFrom: string, validTo: string, source = "KOBIZE"): FactorVersion => ({
  id,
  name: "Energia elektryczna PL",
  source,
  validFrom,
  validTo,
});

describe("Przypomnienia — wskaźniki", () => {
  test("luka między wersjami i brak ważnej wersji", () => {
    const w = lineageWarnings(
      [v("a", "2026-01-01", "2026-09-24"), v("b", "2026-10-12", "2027-12-31")],
      ["Licznik główny"],
      d("2026-10-01"),
    );
    assert.deepEqual(w.map((x) => x.kind).sort(), ["gap", "noValid"]);
    assert.deepEqual(w.find((x) => x.kind === "gap"), { kind: "gap", factor: "Energia elektryczna PL", from: "2026-09-25", to: "2026-10-11" });
  });

  test("wygasa w ciągu 30 dni, gdy brak kolejnej wersji", () => {
    const w = lineageWarnings([v("a", "2026-01-01", "2026-12-31")], ["X"], d("2026-12-10"));
    assert.deepEqual(w, [{ kind: "expiring", factor: "Energia elektryczna PL", validTo: "2026-12-31", daysLeft: 21 }]);
    assert.deepEqual(lineageWarnings([v("a", "2026-01-01", "2026-12-31"), v("b", "2027-01-01", "2027-12-31")], ["X"], d("2026-12-10")), []);
  });

  test("stare luki sprzed poprzedniego roku są pomijane", () => {
    assert.deepEqual(lineageWarnings([v("a", "2022-01-01", "2022-12-31"), v("b", "2023-03-01", "2027-12-31")], ["X"], d("2026-06-01")), []);
  });

  test("styczniowe przypomnienie KOBiZE", () => {
    assert.deepEqual(kobizeReminder([v("a", "2026-01-01", "2026-12-31")], d("2027-01-15")), { kind: "kobize", year: 2027 });
    assert.equal(kobizeReminder([v("a", "2027-01-01", "2027-12-31")], d("2027-01-15")), null);
    assert.equal(kobizeReminder([v("a", "2026-01-01", "2026-12-31")], d("2027-02-15")), null);
    assert.equal(kobizeReminder([v("a", "2026-01-01", "2026-12-31", "GHG_PROTOCOL")], d("2027-01-15")), null);
  });
});

describe("Odmiana liczebników", () => {
  test("brak / braki / braków", () => {
    const f = (n: number) => plural(n, "brak", "braki", "braków");
    assert.deepEqual([1, 2, 4, 5, 12, 14, 22, 25].map(f), ["brak", "braki", "braki", "braków", "braków", "braków", "braki", "braków"]);
  });
});
