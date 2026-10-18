import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { LOGIN_WINDOW_MS, lockedUntil, normalizeLoginEmail, retryMessage } from "./rate-limit";

const now = new Date("2026-10-18T12:00:00Z");
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);

describe("Limit logowań", () => {
  test("poniżej limitu — brak blokady", () => {
    assert.equal(lockedUntil([minutesAgo(1), minutesAgo(2), minutesAgo(3), minutesAgo(4)], 5, now), null);
  });

  test("5. nieudana próba blokuje do wygaśnięcia najstarszej z tych pięciu", () => {
    const failures = [minutesAgo(10), minutesAgo(8), minutesAgo(6), minutesAgo(4), minutesAgo(2)];
    const until = lockedUntil(failures, 5, now);
    assert.deepEqual(until, new Date(minutesAgo(10).getTime() + LOGIN_WINDOW_MS));
  });

  test("przy nadwyżce prób liczy się próba, która przekroczyła limit — nie najstarsza", () => {
    const failures = [minutesAgo(14), minutesAgo(12), minutesAgo(9), minutesAgo(6), minutesAgo(3), minutesAgo(1)];
    const until = lockedUntil(failures, 5, now);
    assert.deepEqual(until, new Date(minutesAgo(12).getTime() + LOGIN_WINDOW_MS));
  });

  test("próby spoza okna 15 min się nie liczą", () => {
    const failures = [minutesAgo(30), minutesAgo(20), minutesAgo(16), minutesAgo(3), minutesAgo(1)];
    assert.equal(lockedUntil(failures, 5, now), null);
  });

  test("kolejność wejścia nie ma znaczenia", () => {
    const failures = [minutesAgo(2), minutesAgo(10), minutesAgo(4), minutesAgo(8), minutesAgo(6)];
    assert.deepEqual(lockedUntil(failures, 5, now), new Date(minutesAgo(10).getTime() + LOGIN_WINDOW_MS));
  });

  test("e-mail jako klucz — bez wielkości liter i spacji", () => {
    assert.equal(normalizeLoginEmail("  Jan.Kowalski@Firma.PL "), "jan.kowalski@firma.pl");
  });

  test("komunikat zaokrągla minuty w górę, min. 1", () => {
    assert.match(retryMessage(new Date(now.getTime() + 61_000), now), /za 2 min/);
    assert.match(retryMessage(new Date(now.getTime() + 5_000), now), /za 1 min/);
  });
});
