/**
 * Dopasowanie pozycji faktury do źródła emisji — kaskada (D8).
 *
 *   1. PPE           → EXACT
 *   2. nr licznika   → EXACT
 *   3. NIP dostawcy  → LIKELY (tylko gdy jednoznaczny)
 *   4. słownik słów  → GUESS  (tylko gdy jednoznaczny)
 *   5. brak          → NONE
 *
 * Krok 1 jest tym, dzięki któremu paczka faktur od znanych dostawców po kilku
 * miesiącach wchodzi w całości bez pracy człowieka: po pierwszym ręcznym
 * przypisaniu zapamiętujemy PPE na źródle i kolejne faktury trafiają same.
 *
 * Funkcja jest czysta — źródła przychodzą z warstwy DAL.
 */

export type MatchConfidence = "EXACT" | "LIKELY" | "GUESS" | "NONE";

export interface SourceCandidate {
  id: string;
  name: string;
  type: "STATIONARY_INSTALLATION" | "COMPANY_VEHICLE" | "ELECTRICITY" | "HEAT" | "COOLING";
  scope: "SCOPE_1" | "SCOPE_2";
  unit: string;
  active: boolean;
  ppeNumber: string | null;
  meterNumber: string | null;
  supplierNip: string | null;
  defaultFactorId: string | null;
}

export interface SourceMatch {
  sourceId: string | null;
  confidence: MatchConfidence;
  /** Tekst pokazywany na karcie: „dopasowano po PPE" itp. */
  reason: string;
  /** PPE z dokumentu, którego nie znaleziono — oferta zapamiętania. */
  unknownPpe?: string;
}

/** Słowa kluczowe z opisu pozycji → typ źródła emisji. */
const KEYWORD_TYPES: Array<{
  pattern: RegExp;
  type: SourceCandidate["type"];
}> = [
  { pattern: /energi[ai]\s+elektryczn/i, type: "ELECTRICITY" },
  { pattern: /\benergia\s+czynna\b/i, type: "ELECTRICITY" },
  { pattern: /ciep[łl]o|ciep[łl]a\s+sieciow/i, type: "HEAT" },
  { pattern: /ch[łl]odnicz|klimatyzac/i, type: "COOLING" },
  { pattern: /gaz\s+ziemn|paliwo\s+gazowe/i, type: "STATIONARY_INSTALLATION" },
  { pattern: /olej\s+nap[ęe]dowy|\bon\b|diesel/i, type: "COMPANY_VEHICLE" },
  { pattern: /benzyn|\bpb\s?9[58]\b/i, type: "COMPANY_VEHICLE" },
  { pattern: /\blpg\b|gaz\s+p[łl]ynny/i, type: "COMPANY_VEHICLE" },
  { pattern: /w[ęe]giel\s+kamienn|ekogroszek/i, type: "STATIONARY_INSTALLATION" },
];

export function inferSourceType(
  description: string,
): SourceCandidate["type"] | null {
  for (const { pattern, type } of KEYWORD_TYPES) {
    if (pattern.test(description)) return type;
  }
  return null;
}

export function matchSource(params: {
  sources: SourceCandidate[];
  ppeNumber?: string | null;
  meterNumber?: string | null;
  supplierNip?: string | null;
  description?: string;
}): SourceMatch {
  const { ppeNumber, meterNumber, supplierNip, description } = params;
  const sources = params.sources.filter((s) => s.active);

  // 1. PPE — klucz najpewniejszy
  if (ppeNumber) {
    const hit = sources.find((s) => s.ppeNumber === ppeNumber);
    if (hit) {
      return {
        sourceId: hit.id,
        confidence: "EXACT",
        reason: `dopasowano po PPE ${ppeNumber}`,
      };
    }
  }

  // 2. numer licznika
  if (meterNumber) {
    const hit = sources.find((s) => s.meterNumber === meterNumber);
    if (hit) {
      return {
        sourceId: hit.id,
        confidence: "EXACT",
        reason: `dopasowano po numerze licznika ${meterNumber}`,
      };
    }
  }

  const unknownPpe = ppeNumber ?? undefined;

  // 3. NIP dostawcy — tylko gdy jednoznaczny
  if (supplierNip) {
    const hits = sources.filter((s) => s.supplierNip === supplierNip);
    if (hits.length === 1) {
      return {
        sourceId: hits[0]!.id,
        confidence: "LIKELY",
        reason: `dopasowano po NIP dostawcy ${supplierNip}`,
        unknownPpe,
      };
    }
  }

  // 4. słownik słów kluczowych — tylko gdy jednoznaczny
  if (description) {
    const type = inferSourceType(description);
    if (type) {
      const hits = sources.filter((s) => s.type === type);
      if (hits.length === 1) {
        return {
          sourceId: hits[0]!.id,
          confidence: "GUESS",
          reason: `dopasowano po opisie pozycji („${description.slice(0, 40)}")`,
          unknownPpe,
        };
      }
    }
  }

  return {
    sourceId: null,
    confidence: "NONE",
    reason: unknownPpe
      ? `PPE ${unknownPpe} nieznany — wskaż źródło emisji`
      : "nie rozpoznano źródła — wskaż je ręcznie",
    unknownPpe,
  };
}
