/** Report params */
import { SOURCE_TYPE_LABELS, type Scope, type SourceType } from "@/lib/emissions/source-types";

export type EntryStatus = "DRAFT" | "VERIFIED" | "CORRECTED";

export type PresetId =
  | "currentYear"
  | "previousYear"
  | "currentQuarter"
  | "previousQuarter"
  | "currentMonth"
  | "previousMonth"
  | "last12Months";

export const PRESETS: { id: PresetId; label: string }[] = [
  { id: "currentYear", label: "Bieżący rok" },
  { id: "previousYear", label: "Poprzedni rok" },
  { id: "currentQuarter", label: "Bieżący kwartał" },
  { id: "previousQuarter", label: "Poprzedni kwartał" },
  { id: "currentMonth", label: "Bieżący miesiąc" },
  { id: "previousMonth", label: "Poprzedni miesiąc" },
  { id: "last12Months", label: "Ostatnie 12 miesięcy" },
];

export const DEFAULT_STATUSES: EntryStatus[] = ["VERIFIED", "CORRECTED"];

export const STATUS_LABELS: Record<EntryStatus, string> = {
  DRAFT: "Szkic",
  VERIFIED: "Zweryfikowany",
  CORRECTED: "Skorygowany",
};

const ALL_SCOPES: Scope[] = ["SCOPE_1", "SCOPE_2"];
const ALL_TYPES = Object.keys(SOURCE_TYPE_LABELS) as SourceType[];
const ALL_STATUSES = Object.keys(STATUS_LABELS) as EntryStatus[];

export interface ReportParams {
  from: string;
  to: string;
  preset: PresetId | "custom";
  scopes: Scope[];
  types: SourceType[];
  sourceIds: string[];
  statuses: EntryStatus[];
}

/* Dates */

const pad = (n: number) => String(n).padStart(2, "0");

export function toIsoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function parseIsoDate(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

function isIsoDate(s: unknown): s is string {
  return (
    typeof s === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !Number.isNaN(parseIsoDate(s).getTime()) &&
    toIsoDate(parseIsoDate(s)) === s
  );
}

function utc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d));
}

function endOfMonth(y: number, m: number): Date {
  return utc(y, m + 1, 0);
}

export function presetRange(preset: PresetId, today: Date): { from: string; to: string } {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const q = m - (m % 3);
  switch (preset) {
    case "currentYear":
      return { from: toIsoDate(utc(y, 0, 1)), to: toIsoDate(today) };
    case "previousYear":
      return { from: toIsoDate(utc(y - 1, 0, 1)), to: toIsoDate(utc(y - 1, 11, 31)) };
    case "currentQuarter":
      return { from: toIsoDate(utc(y, q, 1)), to: toIsoDate(today) };
    case "previousQuarter":
      return { from: toIsoDate(utc(y, q - 3, 1)), to: toIsoDate(endOfMonth(y, q - 1)) };
    case "currentMonth":
      return { from: toIsoDate(utc(y, m, 1)), to: toIsoDate(today) };
    case "previousMonth":
      return { from: toIsoDate(utc(y, m - 1, 1)), to: toIsoDate(endOfMonth(y, m - 1)) };
    case "last12Months":
      return { from: toIsoDate(utc(y, m - 11, 1)), to: toIsoDate(today) };
  }
}

export function rangeDays(from: string, to: string): number {
  return Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / 86_400_000) + 1;
}

export function previousPeriod(from: string, to: string): { from: string; to: string } {
  const days = rangeDays(from, to);
  const prevTo = new Date(parseIsoDate(from).getTime() - 86_400_000);
  const prevFrom = new Date(prevTo.getTime() - (days - 1) * 86_400_000);
  return { from: toIsoDate(prevFrom), to: toIsoDate(prevTo) };
}

function minusYear(s: string): string {
  const d = parseIsoDate(s);
  const y = d.getUTCFullYear() - 1;
  const m = d.getUTCMonth();
  const day = Math.min(d.getUTCDate(), endOfMonth(y, m).getUTCDate());
  return toIsoDate(utc(y, m, day));
}

export function samePeriodLastYear(from: string, to: string): { from: string; to: string } {
  return { from: minusYear(from), to: minusYear(to) };
}

export function monthsInRange(from: string, to: string): string[] {
  const out: string[] = [];
  const end = to.slice(0, 7);
  let y = Number(from.slice(0, 4));
  let m = Number(from.slice(5, 7)) - 1;
  for (;;) {
    const key = `${y}-${pad(m + 1)}`;
    out.push(key);
    if (key >= end) break;
    m++;
    if (m === 12) {
      m = 0;
      y++;
    }
  }
  return out;
}

const MONTHS_SHORT = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];

export function monthLabel(key: string, withYear = true): string {
  const m = MONTHS_SHORT[Number(key.slice(5, 7)) - 1]!;
  return withYear ? `${m} ${key.slice(0, 4)}` : m;
}

export function formatRange(from: string, to: string): string {
  const f = (s: string) => `${s.slice(8, 10)}.${s.slice(5, 7)}.${s.slice(0, 4)}`;
  return `${f(from)} – ${f(to)}`;
}

/* URL ⇄ params */

type RawParams = Record<string, string | string[] | undefined> | URLSearchParams;

function getAll(raw: RawParams, key: string): string[] {
  const values =
    raw instanceof URLSearchParams
      ? raw.getAll(key)
      : ([] as string[]).concat(raw[key] ?? []);
  return values.flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean);
}

function getOne(raw: RawParams, key: string): string | undefined {
  return getAll(raw, key)[0];
}

export function parseReportParams(raw: RawParams, today = new Date()): ReportParams {
  const presetRaw = getOne(raw, "preset");
  const preset = PRESETS.some((p) => p.id === presetRaw) ? (presetRaw as PresetId) : undefined;

  const fromRaw = getOne(raw, "from");
  const toRaw = getOne(raw, "to");

  let from: string;
  let to: string;
  let resolvedPreset: ReportParams["preset"];

  if (preset) {
    ({ from, to } = presetRange(preset, today));
    resolvedPreset = preset;
  } else if (isIsoDate(fromRaw) && isIsoDate(toRaw)) {
    [from, to] = fromRaw <= toRaw ? [fromRaw, toRaw] : [toRaw, fromRaw];
    resolvedPreset = "custom";
  } else {
    ({ from, to } = presetRange("currentYear", today));
    resolvedPreset = "currentYear";
  }

  const statuses = getAll(raw, "status").filter((s): s is EntryStatus =>
    ALL_STATUSES.includes(s as EntryStatus),
  );

  return {
    from,
    to,
    preset: resolvedPreset,
    scopes: getAll(raw, "scope").filter((s): s is Scope => ALL_SCOPES.includes(s as Scope)),
    types: getAll(raw, "type").filter((t): t is SourceType => ALL_TYPES.includes(t as SourceType)),
    sourceIds: getAll(raw, "source").filter((s) => /^[\w-]{1,64}$/.test(s)),
    statuses: statuses.length > 0 ? [...new Set(statuses)] : DEFAULT_STATUSES,
  };
}

export function reportParamsToSearch(p: ReportParams): URLSearchParams {
  const s = new URLSearchParams();
  if (p.preset !== "custom") {
    s.set("preset", p.preset);
  } else {
    s.set("from", p.from);
    s.set("to", p.to);
  }
  if (p.scopes.length) s.set("scope", p.scopes.join(","));
  if (p.types.length) s.set("type", p.types.join(","));
  if (p.sourceIds.length) s.set("source", p.sourceIds.join(","));
  const defaultStatuses =
    p.statuses.length === DEFAULT_STATUSES.length &&
    DEFAULT_STATUSES.every((st) => p.statuses.includes(st));
  if (!defaultStatuses) s.set("status", p.statuses.join(","));
  return s;
}

export function includesDrafts(p: ReportParams): boolean {
  return p.statuses.includes("DRAFT");
}

export function periodTitle(p: ReportParams): string {
  const preset = PRESETS.find((x) => x.id === p.preset);
  return preset ? `${preset.label} (${formatRange(p.from, p.to)})` : formatRange(p.from, p.to);
}
