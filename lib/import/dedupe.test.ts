import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { findDuplicates, identityKeys } from "./dedupe";
import type { ParsedInvoice } from "./types";

const invoice = (over: Partial<ParsedInvoice>): ParsedInvoice => ({
  clientId: over.clientId ?? "c1",
  fileName: over.fileName ?? "f.xml",
  format: "KSEF_XML",
  lines: [],
  warnings: [],
  errors: [],
  raw: null,
  ...over,
});

describe("deduplikacja", () => {
  test("wykrywa duplikat wobec bazy po numerze KSeF", () => {
    const dups = findDuplicates(
      [invoice({ clientId: "a", ksefNumber: "KSEF-1", invoiceNumber: "FV/1" })],
      [{ id: "db1", ksefNumber: "KSEF-1", supplierNip: null, invoiceNumber: "FV/1" }],
    );
    assert.equal(dups.get("a")?.where, "DB");
    assert.equal(dups.get("a")?.invoiceId, "db1");
  });

  test("fallback na (NIP, numer) gdy brak numeru KSeF", () => {
    const dups = findDuplicates(
      [invoice({ clientId: "a", supplierNip: "9730421440", invoiceNumber: "UE/F2/1" })],
      [
        {
          id: "db2",
          ksefNumber: null,
          supplierNip: "9730421440",
          invoiceNumber: "UE/F2/1",
        },
      ],
    );
    assert.equal(dups.get("a")?.where, "DB");
  });

  test("KRYTERIUM 6: ten sam plik dwa razy w jednej paczce", () => {
    const dups = findDuplicates(
      [
        invoice({ clientId: "a", supplierNip: "111", invoiceNumber: "FV/7" }),
        invoice({ clientId: "b", supplierNip: "111", invoiceNumber: "FV/7" }),
      ],
      [],
    );
    assert.equal(dups.has("a"), false);
    assert.equal(dups.get("b")?.where, "BATCH");
  });

  test("KRYTERIUM 5: duplikat nie zaraża pozostałych faktur w paczce", () => {
    const dups = findDuplicates(
      [
        invoice({ clientId: "a", supplierNip: "111", invoiceNumber: "FV/1" }),
        invoice({ clientId: "b", supplierNip: "222", invoiceNumber: "FV/2" }),
        invoice({ clientId: "c", supplierNip: "333", invoiceNumber: "FV/3" }),
      ],
      [{ id: "db", ksefNumber: null, supplierNip: "333", invoiceNumber: "FV/3" }],
    );
    assert.equal(dups.size, 1);
    assert.equal(dups.get("c")?.where, "DB");
    assert.equal(dups.has("a"), false);
    assert.equal(dups.has("b"), false);
  });

  test("różne faktury tego samego dostawcy nie są duplikatami", () => {
    const dups = findDuplicates(
      [
        invoice({ clientId: "a", supplierNip: "111", invoiceNumber: "FV/1" }),
        invoice({ clientId: "b", supplierNip: "111", invoiceNumber: "FV/2" }),
      ],
      [],
    );
    assert.equal(dups.size, 0);
  });

  test("faktura bez tożsamości nie jest uznawana za duplikat", () => {
    const dups = findDuplicates(
      [invoice({ clientId: "a" }), invoice({ clientId: "b" })],
      [],
    );
    assert.equal(dups.size, 0);
  });

  test("identityKeys zwraca null dla niekompletnej pary", () => {
    assert.deepEqual(identityKeys({ supplierNip: "111" }), {
      ksef: null,
      pair: null,
    });
  });
});
