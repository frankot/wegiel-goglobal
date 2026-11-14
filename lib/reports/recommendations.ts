import type { SourceType } from "@/lib/emissions/source-types";
import { SOURCE_TYPE_LABELS } from "@/lib/emissions/source-types";
import type { SourceBreakdown } from "./aggregate";

/** Reduction recommendations */

export const COVERAGE_PCT = 80;
export const GROWTH_PCT = 10;

export const RECOMMENDATION_CATALOG: Record<SourceType, string[]> = {
  ELECTRICITY: [
    "Umowa na energię z odnawialnych źródeł (z gwarancjami pochodzenia) — obniża emisję w raportowaniu metodą rynkową.",
    "Instalacja fotowoltaiczna na własne potrzeby.",
    "Wymiana oświetlenia na LED oraz sterowanie czujnikami obecności i światła dziennego.",
    "Monitoring zużycia i wyłączanie urządzeń poza godzinami pracy (praca w nocy i w weekendy).",
  ],
  HEAT: [
    "Termomodernizacja budynku: izolacja przegród, wymiana okien, uszczelnienie.",
    "Automatyka węzła cieplnego: krzywa grzewcza, obniżenia nocne i weekendowe, regulacja w pomieszczeniach.",
    "Rozmowa z dostawcą ciepła o taryfie z udziałem odnawialnych źródeł lub niskoemisyjnym cieple systemowym.",
  ],
  COOLING: [
    "Przegląd szczelności i serwis instalacji chłodniczej.",
    "Wymiana urządzeń na modele o wyższej sprawności (SEER) przy najbliższej modernizacji.",
    "Podniesienie temperatury zadanej i ograniczenie chłodzenia poza godzinami pracy.",
  ],
  STATIONARY_INSTALLATION: [
    "Wymiana kotła na pompę ciepła lub kocioł kondensacyjny.",
    "Zmiana paliwa na mniej emisyjne (np. z węgla na gaz ziemny, z gazu na biometan lub elektryfikację).",
    "Przegląd i regulacja palników, izolacja rurociągów i zasobników.",
  ],
  COMPANY_VEHICLE: [
    "Stopniowa wymiana floty na pojazdy elektryczne lub hybrydowe.",
    "Szkolenia z ecodrivingu i monitoring spalania (karty paliwowe, telematyka).",
    "Optymalizacja tras i ograniczenie zbędnych przejazdów.",
  ],
};

export type RecommendationReason = "share" | "growth";

export interface RecommendedSource {
  sourceId: string;
  name: string;
  kg: string;
  sharePct: number;
  changePct: number | null;
  reasons: RecommendationReason[];
}

export interface RecommendationGroup {
  type: SourceType;
  label: string;
  sharePct: number;
  sources: RecommendedSource[];
  actions: string[];
}

export function selectSources(bySource: readonly SourceBreakdown[]): RecommendedSource[] {
  const sorted = [...bySource].sort((a, b) => Number(b.kg) - Number(a.kg));
  const picked: RecommendedSource[] = [];
  let covered = 0;
  for (const s of sorted) {
    const reasons: RecommendationReason[] = [];
    if (covered < COVERAGE_PCT && Number(s.kg) > 0) reasons.push("share");
    if (s.changePct !== null && s.changePct >= GROWTH_PCT) reasons.push("growth");
    covered += s.sharePct;
    if (reasons.length) {
      picked.push({ sourceId: s.sourceId, name: s.name, kg: s.kg, sharePct: s.sharePct, changePct: s.changePct, reasons });
    }
  }
  return picked;
}

export function buildRecommendations(bySource: readonly SourceBreakdown[]): RecommendationGroup[] {
  const typeOf = new Map(bySource.map((s) => [s.sourceId, s.type]));
  const groups = new Map<SourceType, RecommendedSource[]>();
  for (const s of selectSources(bySource)) {
    const type = typeOf.get(s.sourceId)!;
    groups.set(type, [...(groups.get(type) ?? []), s]);
  }
  return [...groups]
    .map(([type, sources]) => ({
      type,
      label: SOURCE_TYPE_LABELS[type],
      sharePct: Math.round(sources.reduce((acc, s) => acc + s.sharePct, 0) * 10) / 10,
      sources,
      actions: RECOMMENDATION_CATALOG[type],
    }))
    .sort((a, b) => b.sharePct - a.sharePct);
}
