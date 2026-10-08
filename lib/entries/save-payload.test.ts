import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ksefXmlParser } from "@/lib/import/ksef-xml";
import {
  invoiceSaveSchema,
  batchEnvelopeSchema,
  validateInvoiceForSave,
} from "@/schemas/invoice";
import {
  buildSavePayload,
  cardIssues,
  emptyManualCard,
  isSavable,
  toCardState,
  type CardState,
} from "./batch-state";
import type { EnrichedInvoice } from "@/lib/import/types";

/** Odtwarza kartę tak, jak powstaje po imporcie prawdziwej faktury Unimotu. */
function unimotCard(): CardState {
  const parsed = ksefXmlParser.parse({
    name: "unimoto-x.xml",
    content: readFileSync(join(process.cwd(), "example", "unimoto-x.xml")),
  });

  const enriched: EnrichedInvoice = {
    ...parsed,
    status: "OK",
    totalCo2eKg: "1577.156",
    totalCo2eTon: "1.577156",
    lines: parsed.lines.map((l) => ({
      ...l,
      match: l.emissionRelevant
        ? { sourceId: "src-1", confidence: "EXACT" as const, reason: "PPE" }
        : { sourceId: null, confidence: "NONE" as const, reason: l.skipReason! },
      factor: l.emissionRelevant
        ? {
            status: "RESOLVED" as const,
            reason: "ONLY_MATCH" as const,
            factor: {
              id: "fac-1",
              name: "Energia elektryczna PL",
              category: "Energia elektryczna",
              value: "0.553",
              unit: "kg CO₂e/kWh",
              scope: "SCOPE_2" as const,
              validFrom: new Date("2026-01-01"),
              validTo: new Date("2026-12-31"),
              lineageId: "fac-1",
            },
          }
        : { status: "NONE" as const, message: l.skipReason! },
    })),
  };

  return toCardState(enriched);
}

describe("REGRESJA: pominięta pozycja nie może blokować zapisu faktury", () => {
  const card = unimotCard();
  const payload = buildSavePayload([card], "DRAFT");

  test("payload zawiera obie pozycje — pominięta też jedzie", () => {
    assert.equal(payload.invoices.length, 1);
    assert.equal(payload.invoices[0]!.lines.length, 2);
  });

  test('pominięta pozycja ("Opłata handlowa", mc) ma include=false i puste źródło', () => {
    const skipped = payload.invoices[0]!.lines.find((l) => !l.include)!;
    assert.equal(skipped.description, "Opłata handlowa");
    assert.equal(skipped.unit, "mc");
    assert.equal(skipped.sourceId, "");
    assert.equal(skipped.factorId, "");
  });

  test("schemat PRZECHODZI mimo pustego źródła w pozycji pominiętej", () => {
    const res = invoiceSaveSchema.safeParse(payload.invoices[0]);
    assert.equal(
      res.success,
      true,
      res.success ? "" : res.error.issues.map((i) => i.message).join("; "),
    );
  });

  test("validateInvoiceForSave też przepuszcza", () => {
    const parsed = invoiceSaveSchema.parse(payload.invoices[0]);
    assert.deepEqual(validateInvoiceForSave(parsed), { ok: true });
  });

  test("ale brak źródła w pozycji ZAPISYWANEJ nadal jest błędem", () => {
    const broken = structuredClone(payload.invoices[0]!);
    const included = broken.lines.find((l) => l.include)!;
    included.sourceId = "";
    const res = invoiceSaveSchema.safeParse(broken);
    assert.equal(res.success, false);
    assert.match(
      res.success ? "" : res.error.issues.map((i) => i.message).join("; "),
      /wskaż źródło emisji/i,
    );
  });
});

describe("REGRESJA: jedna zła faktura nie unieważnia paczki (D4)", () => {
  test("koperta waliduje się niezależnie od treści faktur", () => {
    const envelope = batchEnvelopeSchema.safeParse({
      status: "DRAFT",
      invoices: [{ garbage: true }, { also: "bad" }],
    });
    // koperta przechodzi — faktury sprawdzane są pojedynczo w pętli zapisu
    assert.equal(envelope.success, true);
    assert.equal(envelope.success && envelope.data.invoices.length, 2);
  });

  test("dobra faktura przechodzi walidację obok złej", () => {
    const good = buildSavePayload([unimotCard()], "DRAFT").invoices[0]!;
    // realny przypadek: pozycja ZAPISYWANA bez wskazanego źródła
    const bad = {
      clientId: "x",
      sourceFormat: "KSEF_XML",
      lines: [
        {
          lineNo: 1,
          description: "Energia",
          quantity: "100",
          unit: "kWh",
          sourceId: "",
          factorId: "",
          include: true,
        },
      ],
    };

    const results = [good, bad].map((i) => invoiceSaveSchema.safeParse(i));
    assert.equal(results[0]!.success, true);
    assert.equal(results[1]!.success, false);
  });

  test("faktura bez pozycji przechodzi schemat, ale łapie ją validateInvoiceForSave", () => {
    const empty = { clientId: "x", sourceFormat: "KSEF_XML" as const, lines: [] };
    const parsed = invoiceSaveSchema.safeParse(empty);
    assert.equal(parsed.success, true);
    const check = validateInvoiceForSave(parsed.data!);
    assert.equal(check.ok, false);
  });

  test("koperta odrzuca pustą paczkę", () => {
    const res = batchEnvelopeSchema.safeParse({ status: "DRAFT", invoices: [] });
    assert.equal(res.success, false);
  });
});

describe("Faktura wprowadzana ręcznie", () => {
  function filledManualCard(): CardState {
    const card = emptyManualCard("m-1", "skan.pdf");
    return {
      ...card,
      invoiceNumber: " FV/1/2026 ",
      issueDate: "2026-03-31",
      lines: [
        {
          ...card.lines[0]!,
          description: "Energia elektryczna",
          quantity: "1234,5",
          unit: "kWh",
          sourceId: "src-1",
          factorId: "fac-1",
        },
      ],
    };
  }

  test("pusta karta nie jest gotowa do zapisu", () => {
    const card = emptyManualCard("m-0");
    assert.equal(card.format, "MANUAL");
    assert.equal(card.lines.length, 1);
    assert.equal(isSavable(card), false);
    const issues = cardIssues(card);
    assert.ok(issues.includes("Podaj numer faktury."));
    assert.ok(issues.includes("Podaj datę wystawienia."));
    assert.ok(issues.some((i) => i.includes("wpisz opis")));
  });

  test("wypełniona karta przechodzi do payloadu i schematu", () => {
    const card = filledManualCard();
    assert.deepEqual(cardIssues(card), []);

    const payload = buildSavePayload([card], "DRAFT");
    const inv = payload.invoices[0]!;
    assert.equal(inv.sourceFormat, "MANUAL");
    assert.equal(inv.invoiceNumber, "FV/1/2026");
    assert.equal(inv.fileName, "skan.pdf");
    assert.equal(inv.lines[0]!.quantity, "1234.5");
    assert.equal(invoiceSaveSchema.safeParse(inv).success, true);
  });

  test("schemat odrzuca ręczną fakturę bez numeru i daty", () => {
    const inv = buildSavePayload([filledManualCard()], "DRAFT").invoices[0]!;
    const res = invoiceSaveSchema.safeParse({
      ...inv,
      invoiceNumber: undefined,
      issueDate: undefined,
    });
    assert.equal(res.success, false);
    assert.equal(res.error!.issues.length, 2);
  });

  test("XML bez numeru i daty nadal przechodzi — wymóg dotyczy tylko MANUAL", () => {
    const inv = buildSavePayload([filledManualCard()], "DRAFT").invoices[0]!;
    const res = invoiceSaveSchema.safeParse({
      ...inv,
      sourceFormat: "KSEF_XML",
      invoiceNumber: undefined,
      issueDate: undefined,
    });
    assert.equal(res.success, true);
  });
});
