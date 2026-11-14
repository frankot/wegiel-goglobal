import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { RESET_TTL_MS, recentlyIssued } from "./reset-rules";
import { newPasswordSchema } from "@/schemas/auth";

describe("Reset hasła", () => {
  test("nowy link najwcześniej po 5 minutach", () => {
    const now = new Date("2026-11-14T12:00:00Z");
    const issued = (minAgo: number) => new Date(now.getTime() - minAgo * 60_000 + RESET_TTL_MS);
    assert.equal(recentlyIssued(null, now), false);
    assert.equal(recentlyIssued(issued(2), now), true);
    assert.equal(recentlyIssued(issued(6), now), false);
  });

  test("nowe hasło: reguły i zgodność powtórzenia", () => {
    const ok = newPasswordSchema.safeParse({ password: "Nowehaslo1", confirm: "Nowehaslo1", token: "t" });
    assert.equal(ok.success, true);
    const weak = newPasswordSchema.safeParse({ password: "krotkie", confirm: "krotkie", token: "t" });
    assert.equal(weak.success, false);
    const mismatch = newPasswordSchema.safeParse({ password: "Nowehaslo1", confirm: "Nowehaslo2", token: "t" });
    assert.deepEqual(mismatch.error?.issues.map((i) => i.message), ["Hasła nie są takie same"]);
  });
});
