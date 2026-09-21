import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ksefXmlParser, toArray, cleanText } from "./ksef-xml";
import { InvoiceParseError } from "./types";

const fixture = (name: string) => ({
  name,
  content: readFileSync(join(process.cwd(), "example", name)),
});

describe("parser KSeF FA(3) — faktura z 2 pozycjami", () => {
  const parsed = ksefXmlParser.parse(fixture("unimoto-x.xml"));

  test("rozpoznaje format", () => {
    assert.equal(ksefXmlParser.detect(fixture("unimoto-x.xml")), true);
    assert.equal(parsed.format, "KSEF_XML");
  });

  test("czyta nagłówek faktury", () => {
    assert.equal(parsed.invoiceNumber, "UE/F2/1103911/183/08/2026/FR");
    assert.equal(parsed.issueDate, "2026-08-11");
    assert.equal(parsed.periodStart, "2026-07-01");
    assert.equal(parsed.periodEnd, "2026-07-31");
  });

  test("rozróżnia sprzedawcę od nabywcy", () => {
    assert.equal(parsed.supplierNip, "9730421440");
    assert.equal(parsed.supplierName, "UNIMOT ENERGIA i GAZ Sp. z o. o.");
    assert.equal(parsed.buyerNip, "8133378641");
  });

  test("czyta obie pozycje", () => {
    assert.equal(parsed.lines.length, 2);
    assert.equal(parsed.lines[0]!.quantity, "2852.000");
    assert.equal(parsed.lines[0]!.unit, "kWh");
    assert.equal(parsed.lines[0]!.indeks, "7310320");
  });

  test("PUŁAPKA: Oplata handlowa (1,000 mc) nie jest emisyjna, ale jest widoczna", () => {
    const oplata = parsed.lines[1]!;
    assert.equal(oplata.description, "Opłata handlowa");
    assert.equal(oplata.unit, "mc");
    assert.equal(oplata.emissionRelevant, false);
    assert.match(oplata.skipReason!, /nie jest jednostką zużycia/);
    // kluczowe: pozycja NIE znika z wyniku parsowania
    assert.equal(parsed.lines.length, 2);
  });

  test("wyciąga PPE, licznik i taryfę z załącznika", () => {
    assert.equal(parsed.lines[0]!.ppeNumber, "590543550100711505");
    assert.equal(parsed.lines[0]!.meterNumber, "50436458");
    assert.equal(parsed.lines[0]!.tariffGroup, "C11");
  });

  test("kontrola krzyżowa z tabelą odczytów przechodzi bez ostrzeżeń", () => {
    assert.equal(parsed.warnings.length, 0);
  });
});

describe("PUŁAPKA 2 — faktura z jedną pozycją", () => {
  const parsed = ksefXmlParser.parse(fixture("unimot-1poz.xml"));

  test("daje dokładnie 1 pozycję — nie wyjątek i NIE zero", () => {
    assert.equal(parsed.lines.length, 1);
    assert.equal(parsed.lines[0]!.quantity, "2852.000");
    assert.equal(parsed.lines[0]!.unit, "kWh");
  });

  test("dane załącznika nadal czytane", () => {
    assert.equal(parsed.lines[0]!.ppeNumber, "590543550100711505");
  });
});

describe("PUŁAPKA 6 — faktura bez załącznika (kształt paliwowej)", () => {
  const parsed = ksefXmlParser.parse(fixture("unimot-bez-zalacznika.xml"));

  test("parsuje się bez wyjątku", () => {
    assert.equal(parsed.lines.length, 1);
    assert.equal(parsed.lines[0]!.quantity, "2852.000");
  });

  test("brak PPE, ale ostrzeżenie dla użytkownika", () => {
    assert.equal(parsed.lines[0]!.ppeNumber, undefined);
    assert.match(parsed.warnings.join(" "), /bez załącznika|punktu poboru/i);
  });
});

describe("PUŁAPKA 3 — polskie znaki i _x000D_", () => {
  test("nazwa nabywcy zachowuje diakrytykę", () => {
    const parsed = ksefXmlParser.parse(fixture("unimoto-x.xml"));
    assert.equal(parsed.buyerNip, "8133378641");
    assert.doesNotMatch(JSON.stringify(parsed.lines), /_x000D_/);
  });

  test("cleanText usuwa _x000D_", () => {
    assert.equal(cleanText("STAL-RES_x000D_"), "STAL-RES");
  });
});

describe("toArray — warstwa 2 obrony", () => {
  test("obiekt → tablica jednoelementowa", () => {
    assert.deepEqual(toArray({ a: 1 }), [{ a: 1 }]);
  });
  test("null/undefined → pusta tablica", () => {
    assert.deepEqual(toArray(null), []);
    assert.deepEqual(toArray(undefined), []);
  });
  test("tablica przechodzi bez zmian", () => {
    assert.deepEqual(toArray([1, 2]), [1, 2]);
  });
});

describe("odrzucanie plików spoza formatu", () => {
  test("detect odrzuca nie-XML", () => {
    assert.equal(
      ksefXmlParser.detect({ name: "faktura.pdf", content: Buffer.from("%PDF-1.3") }),
      false,
    );
  });

  test("XML bez <Faktura> rzuca czytelny błąd", () => {
    assert.throws(
      () => ksefXmlParser.parse({ name: "x.xml", content: Buffer.from("<Inne/>") }),
      (e: unknown) => e instanceof InvoiceParseError && /nie jest faktura/i.test((e as Error).message),
    );
  });
});
