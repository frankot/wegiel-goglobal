import { roleLabel } from "@/lib/auth/permissions";
import { FORMAT_LABELS } from "@/lib/import/types";
import { SOURCE_TYPE_LABELS, type SourceType } from "@/lib/emissions/source-types";

/** Audit event text */

export const ENTITY_LABELS: Record<string, string> = {
  Invoice: "Faktura",
  InvoiceAttachment: "Załącznik",
  EmissionEntry: "Wpis emisyjny",
  EmissionSource: "Źródło emisji",
  EmissionFactor: "Wskaźnik emisji",
  FactorCategory: "Kategoria wskaźników",
  Company: "Dane firmy",
  User: "Użytkownik",
  Report: "Raport",
  ArchivedReport: "Archiwum raportów",
  AuditLog: "Dziennik zdarzeń",
};

export const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Logowanie",
  CREATE: "Utworzenie",
  UPDATE: "Zmiana",
  DELETE: "Usunięcie",
  VERIFY: "Weryfikacja",
  CORRECT: "Korekta",
  IMPORT: "Import",
  RECALC: "Przeliczenie",
  DOWNLOAD: "Pobranie",
};

const FIELD_LABELS: Record<string, string> = {
  name: "Nazwa",
  shortName: "Nazwa skrócona",
  type: "Typ",
  unit: "Jednostka",
  value: "Wartość",
  ppeNumber: "Numer PPE",
  active: "Aktywne",
  email: "E-mail",
  role: "Rola",
  invitedBy: "Zaprosił(a)",
  resendInvite: "Ponowne zaproszenie",
  cancelInvite: "Anulowane zaproszenie",
  status: "Status",
  quantity: "Ilość",
  co2eKg: "CO₂e [kg]",
  totalCo2eKg: "CO₂e łącznie [kg]",
  format: "Format",
  fileName: "Plik",
  invoiceNumber: "Numer faktury",
  invoiceId: "Faktura",
  lines: "Pozycje",
  entries: "Wpisy",
  attachments: "Załączniki",
  drafts: "Szkice",
  updated: "Przeliczone",
  validFrom: "Ważny od",
  newVersionOf: "Wersja wskaźnika",
  from: "Poprzednio",
  to: "Teraz",
  query: "Filtry raportu",
  title: "Nazwa",
  nip: "NIP",
  regon: "REGON",
  krs: "KRS",
  street: "Ulica i numer",
  postalCode: "Kod pocztowy",
  city: "Miejscowość",
  country: "Kraj",
  filters: "Filtry",
  rows: "Wiersze",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Szkic",
  VERIFIED: "Zweryfikowany",
  CORRECTED: "Skorygowany",
};

export interface AuditDetail {
  label: string;
  value: string;
}

export interface DescribedEvent {
  summary: string;
  details: AuditDetail[];
}

type Json = Record<string, unknown>;

const isChange = (v: unknown): v is { from: unknown; to: unknown } =>
  !!v && typeof v === "object" && !Array.isArray(v) && "from" in v && "to" in v;

const num = (v: unknown) =>
  typeof v === "number" || (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v))
    ? new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 3 }).format(Number(v))
    : String(v);

function formatValue(key: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "tak" : "nie";
  if (Array.isArray(v)) return String(v.length);
  if (typeof v === "object") return JSON.stringify(v);
  const s = String(v);
  if (key === "role") return roleLabel(s);
  if (key === "status" || key === "to" || key === "from") return STATUS_LABELS[s] ?? num(s);
  if (key === "format") return FORMAT_LABELS[s] ?? s.toUpperCase();
  if (key === "type") return SOURCE_TYPE_LABELS[s as SourceType] ?? s;
  if (key === "validFrom") return s.slice(0, 10).split("-").reverse().join(".");
  if (["quantity", "co2eKg", "totalCo2eKg", "value"].includes(key)) return num(s);
  return s;
}

function changeText(key: string, v: unknown): string {
  return isChange(v) ? `${formatValue(key, v.from)} → ${formatValue(key, v.to)}` : formatValue(key, v);
}

function detailsOf(data: Json): AuditDetail[] {
  return Object.entries(data)
    .filter(([key, v]) => !(isChange(v) && JSON.stringify(v.from) === JSON.stringify(v.to)) && key !== "newVersionOf")
    .map(([key, v]) => ({ label: FIELD_LABELS[key] ?? key, value: changeText(key, v) }));
}

const tons = (kg: unknown) => num(Number(kg) / 1000);

function summarize(action: string, entity: string, d: Json): string | null {
  const ch = (k: string) => {
    const v = d[k];
    return isChange(v) && JSON.stringify(v.from) !== JSON.stringify(v.to) ? v : null;
  };
  switch (`${entity}:${action}`) {
    case "User:LOGIN":
      return "Logowanie do systemu";
    case "User:CREATE":
      return `Zaproszenie dla ${d.email} (rola: ${roleLabel(String(d.role))})`;
    case "User:UPDATE":
      if (ch("role")) return `Zmiana roli ${d.email}: ${roleLabel(String(ch("role")!.from))} → ${roleLabel(String(ch("role")!.to))}`;
      if (ch("active")) return `${ch("active")!.to ? "Aktywacja" : "Dezaktywacja"} konta ${d.email}`;
      if (d.resendInvite) return `Ponowne wysłanie zaproszenia do ${d.resendInvite}`;
      return null;
    case "User:DELETE":
      return d.cancelInvite ? `Anulowanie zaproszenia dla ${d.cancelInvite}` : null;
    case "Invoice:IMPORT":
      return `Zapis faktury ${d.invoiceNumber ?? "(bez numeru)"} — ${formatValue("format", d.format)}, ${d.lines} poz., ${tons(d.totalCo2eKg)} t CO₂e (${formatValue("status", d.status)})`;
    case "Invoice:DELETE":
      return `Usunięcie faktury ${d.invoiceNumber ?? "(bez numeru)"} (wpisy: ${d.entries})`;
    case "Invoice:VERIFY":
      return `Weryfikacja szkiców faktury (${Array.isArray(d.entries) ? d.entries.length : d.entries})`;
    case "Invoice:DOWNLOAD":
      return `Pobranie pliku faktury ${d.fileName}`;
    case "InvoiceAttachment:DOWNLOAD":
      return `Pobranie załącznika ${d.fileName}`;
    case "EmissionEntry:VERIFY":
      return "Weryfikacja wpisu emisyjnego";
    case "EmissionEntry:CORRECT":
    case "EmissionEntry:UPDATE": {
      const q = ch("quantity");
      if (q) return `${action === "CORRECT" ? "Korekta" : "Zmiana"} ilości wpisu: ${num(q.from)} → ${num(q.to)}`;
      return "Korekta wpisu emisyjnego";
    }
    case "EmissionEntry:DELETE":
      return `Usunięcie wpisu emisyjnego (${num(d.co2eKg)} kg CO₂e)`;
    case "EmissionSource:CREATE":
      return `Dodanie źródła emisji „${d.name}” (${formatValue("type", d.type)})`;
    case "EmissionSource:UPDATE":
      if (ch("active")) return `${ch("active")!.to ? "Aktywacja" : "Dezaktywacja"} źródła emisji`;
      return `Edycja źródła emisji „${isChange(d.name) ? d.name.to : ""}”`;
    case "EmissionFactor:CREATE":
      if (d.newVersionOf) return `Nowa wersja wskaźnika: ${num(d.from)} → ${num(d.to)} od ${formatValue("validFrom", d.validFrom)}`;
      return `Dodanie wskaźnika „${d.name}” (${num(d.value)} ${d.unit})`;
    case "EmissionFactor:UPDATE": {
      const v = ch("value");
      return v ? `Edycja wskaźnika: wartość ${num(v.from)} → ${num(v.to)}` : "Edycja wskaźnika emisji";
    }
    case "EmissionFactor:RECALC":
      return `Przeliczenie ${d.updated} z ${d.drafts} szkiców po zmianie wskaźnika`;
    case "FactorCategory:CREATE":
      return `Dodanie kategorii wskaźników „${d.name}”`;
    case "Company:CREATE":
      return "Uzupełnienie danych firmy";
    case "Company:UPDATE":
      return `Zmiana danych firmy: ${Object.keys(d).map((k) => FIELD_LABELS[k] ?? k).join(", ")}`;
    case "Report:CREATE":
      return `Wygenerowanie raportu ${formatValue("format", d.format)}`;
    case "ArchivedReport:CREATE":
      return `Zapis raportu w archiwum: „${d.title}” (${tons(d.totalCo2eKg)} t CO₂e)`;
    case "ArchivedReport:DELETE":
      return `Usunięcie raportu z archiwum: „${d.title}”`;
    case "ArchivedReport:DOWNLOAD":
      return `Pobranie ${formatValue("format", d.format)} z archiwum: „${d.title}”`;
    case "AuditLog:DOWNLOAD":
      return `Eksport dziennika zdarzeń do CSV (${d.rows} zdarzeń)`;
    default:
      return null;
  }
}

export function parseDetails(raw: string | null): Json {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? v : { value: v };
  } catch {
    return { value: raw };
  }
}

export function describeEvent(e: { action: string; entity: string; details: string | null }): DescribedEvent {
  const data = parseDetails(e.details);
  const summary =
    summarize(e.action, e.entity, data) ??
    `${ACTION_LABELS[e.action] ?? e.action} — ${ENTITY_LABELS[e.entity] ?? e.entity}`;
  return { summary, details: detailsOf(data) };
}
