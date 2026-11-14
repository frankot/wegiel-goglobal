/** Report templates */

export type TemplateId = "full" | "monthly" | "quarterly" | "esrs";

export interface ReportTemplate {
  id: TemplateId;
  label: string;
  description: string;
  preset: "previousMonth" | "previousQuarter" | "previousYear" | null;
  fileSlug: string;
}

export const TEMPLATES: Record<TemplateId, ReportTemplate> = {
  full: {
    id: "full",
    label: "Pełny raport",
    description: "Wszystkie sekcje: zakresy, porównania, wykres miesięczny, kategorie, źródła, wskaźniki, jakość danych, metodologia i faktury.",
    preset: null,
    fileSlug: "raport-slad-weglowy",
  },
  monthly: {
    id: "monthly",
    label: "Podsumowanie miesięczne",
    description: "Krótkie podsumowanie miesiąca: wyniki, Top 5 źródeł, kategorie i jakość danych.",
    preset: "previousMonth",
    fileSlug: "podsumowanie-miesieczne",
  },
  quarterly: {
    id: "quarterly",
    label: "Raport kwartalny",
    description: "Wyniki kwartału z porównaniem do poprzedniego kwartału i roku, wykresem miesięcznym, Top 10 i rekomendacjami.",
    preset: "previousQuarter",
    fileSlug: "raport-kwartalny",
  },
  esrs: {
    id: "esrs",
    label: "Roczny ESRS E1-6",
    description: "Ujawnienie emisji gazów cieplarnianych wg ESRS E1-6 z porównaniem rok do roku, intensywnością emisji, metodologią i załącznikami.",
    preset: "previousYear",
    fileSlug: "esrs-e1-6",
  },
};

export const TEMPLATE_IDS = Object.keys(TEMPLATES) as TemplateId[];

export function isTemplateId(v: unknown): v is TemplateId {
  return typeof v === "string" && v in TEMPLATES;
}

/** Revenue in PLN from user input ("12 500 000,50") or null. */
export function parseRevenue(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.replace(/\s/g, "").replace(",", ".");
  if (!/^\d{1,15}(\.\d{1,2})?$/.test(s) || Number(s) <= 0) return null;
  return s;
}

/** GHG intensity: t CO₂e per 1 mln PLN of net revenue. */
export function ghgIntensity(totalKg: string, revenuePln: string | null): number | null {
  if (!revenuePln) return null;
  const revenue = Number(revenuePln);
  if (!(revenue > 0)) return null;
  return Number(totalKg) / 1000 / (revenue / 1_000_000);
}
