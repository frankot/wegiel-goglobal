/** KSeF FA(3) parser */
import { XMLParser } from "fast-xml-parser";
import { randomUUID } from "node:crypto";
import { isKnownUnit } from "@/lib/emissions/units";
import { InvoiceParseError, type InvoiceParser, type ParsedInvoice, type ParsedLine } from "./types";

/** Array paths */
const ARRAY_PATHS = new Set([
  "Faktura.Fa.FaWiersz",
  "Faktura.Zalacznik",
  "Faktura.Zalacznik.BlokDanych",
  "Faktura.Zalacznik.BlokDanych.MetaDane",
  "Faktura.Zalacznik.BlokDanych.Tabela",
  "Faktura.Zalacznik.BlokDanych.Tabela.TNaglowek.Kol",
  "Faktura.Zalacznik.BlokDanych.Tabela.Wiersz",
  "Faktura.Zalacznik.BlokDanych.Tabela.Wiersz.WKom",
]);

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  removeNSPrefix: true,
  parseTagValue: false,
  trimValues: true,
  jPath: true,
  isArray: (_name, jpath) => typeof jpath === "string" && ARRAY_PATHS.has(jpath),
});

export function toArray<T>(v: T | T[] | null | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

export function cleanText(v: unknown): string {
  if (v == null) return "";
  return String(v).replace(/_x000D_/g, "").replace(/\s+/g, " ").trim();
}

function cleanOptional(v: unknown): string | undefined {
  const s = cleanText(v);
  return s === "" ? undefined : s;
}

function assessLine(description: string, unit: string): Pick<ParsedLine, "emissionRelevant" | "skipReason"> {
  if (!unit) {
    return { emissionRelevant: false, skipReason: "pozycja bez jednostki" };
  }
  if (!isKnownUnit(unit)) {
    return {
      emissionRelevant: false,
      skipReason: `jednostka „${unit}" nie jest jednostką zużycia`,
    };
  }
  return { emissionRelevant: true };
}

interface MetaEntry {
  ZKlucz?: unknown;
  ZWartosc?: unknown;
}

function readMeta(blocks: Record<string, unknown>[], key: string): string | undefined {
  for (const block of blocks) {
    for (const m of toArray<MetaEntry>(block.MetaDane as MetaEntry[])) {
      if (cleanText(m.ZKlucz) === key) return cleanOptional(m.ZWartosc);
    }
  }
  return undefined;
}

/** Readings cross-check */
function readConsumptionFromReadings(
  blocks: Record<string, unknown>[],
): string | undefined {
  for (const block of blocks) {
    for (const table of toArray<Record<string, unknown>>(block.Tabela as Record<string, unknown>[])) {
      if (!/odczyty/i.test(cleanText(table.Opis))) continue;

      const header = (table.TNaglowek ?? {}) as Record<string, unknown>;
      const cols = toArray<Record<string, unknown>>(header.Kol as Record<string, unknown>[]).map((c) =>
        cleanText(c.NKom),
      );
      const idx = cols.findIndex((c) => /zu[żz]ycie/i.test(c));
      if (idx < 0) continue;

      for (const row of toArray<Record<string, unknown>>(table.Wiersz as Record<string, unknown>[])) {
        const cells = toArray(row.WKom).map(cleanText);
        const value = cells[idx];
        if (value) return value;
      }
    }
  }
  return undefined;
}

function sameNumber(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const norm = (s: string) => s.replace(/[\s ]/g, "").replace(",", ".");
  return Number(norm(a)) === Number(norm(b));
}

export const ksefXmlParser: InvoiceParser = {
  id: "KSEF_XML",

  detect({ name, content }) {
    if (!/\.xml$/i.test(name)) return false;
    const head = content.subarray(0, 2048).toString("utf8");
    if (!/<Faktura[\s>]/.test(head)) return false;
    return /kodSystemowy="FA/.test(head) || /<KodFormularza/.test(head);
  },

  parse({ name, content }): ParsedInvoice {
    let doc: Record<string, unknown>;
    try {
      doc = xmlParser.parse(content.toString("utf8")) as Record<string, unknown>;
    } catch (e) {
      throw new InvoiceParseError(
        `Plik nie jest poprawnym XML-em: ${(e as Error).message}`,
      );
    }

    const faktura = doc.Faktura as Record<string, unknown> | undefined;
    if (!faktura) {
      throw new InvoiceParseError("Brak elementu <Faktura> — to nie jest faktura KSeF.");
    }

    const naglowek = (faktura.Naglowek ?? {}) as Record<string, unknown>;
    const kod = (naglowek.KodFormularza ?? {}) as Record<string, unknown>;
    const kodSystemowy = cleanText(kod["@kodSystemowy"]);
    if (kodSystemowy && !/^FA/.test(kodSystemowy)) {
      throw new InvoiceParseError(
        `Nieobsługiwany schemat „${kodSystemowy}" — oczekiwano FA (3).`,
      );
    }

    const fa = (faktura.Fa ?? {}) as Record<string, unknown>;
    const podmiot1 = ((faktura.Podmiot1 ?? {}) as Record<string, unknown>).DaneIdentyfikacyjne as
      | Record<string, unknown>
      | undefined;
    const podmiot2 = ((faktura.Podmiot2 ?? {}) as Record<string, unknown>).DaneIdentyfikacyjne as
      | Record<string, unknown>
      | undefined;

    const okres = (fa.OkresFa ?? {}) as Record<string, unknown>;
    const periodStart = cleanOptional(okres.P_6_Od);
    const periodEnd = cleanOptional(okres.P_6_Do);

    const blocks = toArray<Record<string, unknown>>(
      faktura.Zalacznik as Record<string, unknown>[],
    ).flatMap((z) => toArray<Record<string, unknown>>(z.BlokDanych as Record<string, unknown>[]));

    const ppeNumber = readMeta(blocks, "Numer punktu poboru");
    const meterNumber = readMeta(blocks, "Numer licznika");
    const tariffGroup = readMeta(blocks, "Grupa taryfowa");

    const warnings: string[] = [];

    const rows = toArray<Record<string, unknown>>(fa.FaWiersz as Record<string, unknown>[]);
    if (rows.length === 0) {
      throw new InvoiceParseError("Faktura nie zawiera żadnych pozycji (<FaWiersz>).");
    }

    const lines: ParsedLine[] = rows.map((row, i) => {
      const description = cleanText(row.P_7);
      const unit = cleanText(row.P_8A);
      const quantity = cleanText(row.P_8B);
      const assessment = assessLine(description, unit);

      return {
        lineNo: Number(cleanText(row.NrWierszaFa)) || i + 1,
        description,
        indeks: cleanOptional(row.Indeks),
        quantity,
        unit,
        netValue: cleanOptional(row.P_11),
        ppeNumber: assessment.emissionRelevant ? ppeNumber : undefined,
        meterNumber: assessment.emissionRelevant ? meterNumber : undefined,
        tariffGroup: assessment.emissionRelevant ? tariffGroup : undefined,
        ...assessment,
      };
    });

    const readingConsumption = readConsumptionFromReadings(blocks);
    if (readingConsumption) {
      const energyLine = lines.find((l) => l.emissionRelevant);
      if (energyLine && !sameNumber(energyLine.quantity, readingConsumption)) {
        warnings.push(
          `Zużycie z tabeli odczytów (${readingConsumption}) różni się od ilości na pozycji (${energyLine.quantity}) — sprawdź dane.`,
        );
      }
    }

    if (blocks.length === 0) {
      warnings.push(
        "Faktura nie ma załącznika z danymi punktu poboru — źródło emisji trzeba wskazać ręcznie.",
      );
    }

    return {
      clientId: randomUUID(),
      fileName: name,
      format: "KSEF_XML",
      invoiceNumber: cleanOptional(fa.P_2),
      ksefNumber: cleanOptional(faktura.NumerKSeF) ?? cleanOptional(naglowek.NumerKSeF),
      issueDate: cleanOptional(fa.P_1),
      periodStart,
      periodEnd,
      supplierNip: cleanOptional(podmiot1?.NIP),
      supplierName: cleanOptional(podmiot1?.Nazwa),
      buyerNip: cleanOptional(podmiot2?.NIP),
      lines,
      warnings,
      errors: [],
      raw: doc,
    };
  },
};
