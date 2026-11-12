import { describe, test } from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { parseDate, parseQuantity, waproXlsxParser } from "./wapro-xlsx";

const HEADER = [
  "Nazwa dostawcy",
  "Dok. magazynowy",
  "Dok. handlowy",
  "Data",
  "Cena netto",
  "Marża [%]",
  "Cena brutto",
  "Ilość pierwotna z dostawy",
  "J.M",
  "Ilość dostępna",
];

const UNIMOT = "UNIMOT ENERGIA I GAZ SPÓŁKA Z OGRANICZONĄ ODPOWIED";

function workbook(rows: unknown[][]): Buffer {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([HEADER, ...rows]), "Arkusz1");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

const parse = (rows: unknown[][]) =>
  waproXlsxParser.parseAll({ name: "energia.xlsx", content: workbook(rows) });

describe("WAPRO MAG — zestawienie przyjęć", () => {
  test("wiersz staje się kartą z ilością, jednostką i datą", () => {
    const [inv] = parse([
      [UNIMOT, "PZ /ŚW/001/0826", " ", 46245, 0.49, 0, 0.6, "    2 852,0000", "kWh", "    2 852,0000"],
    ]);
    assert.equal(inv!.format, "WAPRO_XLSX");
    assert.equal(inv!.invoiceNumber, "PZ /ŚW/001/0826");
    assert.equal(inv!.sourceRef, "PZ /ŚW/001/0826");
    assert.equal(inv!.issueDate, "2026-08-11");
    assert.equal(inv!.periodStart, undefined);
    assert.equal(inv!.supplierName, UNIMOT);
    assert.equal(inv!.lines[0]!.quantity, "2852");
    assert.equal(inv!.lines[0]!.unit, "kWh");
    assert.equal(inv!.lines[0]!.netValue, "1397.48");
    assert.equal(inv!.lines[0]!.emissionRelevant, true);
  });

  test("puste wiersze są pomijane, ten sam dokument grupuje pozycje", () => {
    const out = parse([
      [UNIMOT, "PZ /1", null, 46216, 0.5, 0, 0.6, "100,5", "kWh", null],
      [null, null, null, null, null, null, null, null, null, null],
      [UNIMOT, "PZ /1", null, 46216, 0.5, 0, 0.6, "1,2", "MWh", null],
      [UNIMOT, "PZ /2", null, 46245, 0.5, 0, 0.6, "10", "szt", null],
    ]);
    assert.equal(out.length, 2);
    assert.equal(out[0]!.lines.length, 2);
    assert.equal(out[0]!.lines[1]!.unit, "MWh");
    assert.equal(out[1]!.lines[0]!.emissionRelevant, false);
  });

  test("numer dokumentu handlowego ma pierwszeństwo przed PZ", () => {
    const [inv] = parse([[UNIMOT, "PZ /3", "FV/123/2026", "13.07.2026", 0.5, 0, 0.6, "5", "kWh", "5"]]);
    assert.equal(inv!.invoiceNumber, "FV/123/2026");
    assert.equal(inv!.sourceRef, "PZ /3");
    assert.equal(inv!.issueDate, "2026-07-13");
  });

  test("plik ODS jest czytany tak samo jak XLSX", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([HEADER, [UNIMOT, "PZ /ŚW/001/0826", " ", 46245, 0.49, 0, 0.6, "    2 852,0000", "kWh", null]]),
      "Arkusz1",
    );
    const content = XLSX.write(wb, { type: "buffer", bookType: "ods" }) as Buffer;
    assert.equal(waproXlsxParser.detect({ name: "energia.ods" }), true);
    const [inv] = waproXlsxParser.parseAll({ name: "energia.ods", content });
    assert.equal(inv!.issueDate, "2026-08-11");
    assert.equal(inv!.lines[0]!.quantity, "2852");
    assert.equal(inv!.lines[0]!.unit, "kWh");
  });

  test("nierozpoznany układ arkusza zgłasza błąd", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["A", "B"], [1, 2]]), "X");
    const content = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    assert.throws(() => waproXlsxParser.parseAll({ name: "inne.xlsx", content }), /WAPRO MAG/);
  });

  test("parsowanie liczb i dat", () => {
    assert.equal(parseQuantity("    3 633,0000"), "3633");
    assert.equal(parseQuantity("12,500"), "12.5");
    assert.equal(parseQuantity("abc"), null);
    assert.equal(parseDate(46216), "2026-07-13");
    assert.equal(parseDate("2026-07-13"), "2026-07-13");
  });
});
