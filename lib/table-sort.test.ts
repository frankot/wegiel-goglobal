import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { sortRows } from "./table-sort";

const rows = [
  { name: "Licznik główny", kg: 1577.156, date: "2026-08-11" },
  { name: "ESP/2026/06/003877", kg: 5.9, date: null },
  { name: "Ćwiczebny", kg: 12.5, date: "2026-07-01" },
  { name: "agregat", kg: 12.5, date: "2026-09-21" },
];
const acc = { name: (r: (typeof rows)[number]) => r.name, kg: (r: (typeof rows)[number]) => r.kg, date: (r: (typeof rows)[number]) => r.date };

describe("Sortowanie tabel", () => {
  test("bez sortowania kolejność zostaje", () => {
    assert.deepEqual(sortRows(rows, null, acc), rows);
  });

  test("tekst po polsku, bez rozróżniania wielkości liter", () => {
    assert.deepEqual(
      sortRows(rows, { key: "name", dir: "asc" }, acc).map((r) => r.name),
      ["agregat", "Ćwiczebny", "ESP/2026/06/003877", "Licznik główny"],
    );
  });

  test("liczby malejąco, remisy w kolejności pierwotnej", () => {
    assert.deepEqual(
      sortRows(rows, { key: "kg", dir: "desc" }, acc).map((r) => r.name),
      ["Licznik główny", "Ćwiczebny", "agregat", "ESP/2026/06/003877"],
    );
  });

  test("puste wartości zawsze na końcu", () => {
    assert.equal(sortRows(rows, { key: "date", dir: "asc" }, acc).at(-1)!.date, null);
    assert.equal(sortRows(rows, { key: "date", dir: "desc" }, acc).at(-1)!.date, null);
  });
});
