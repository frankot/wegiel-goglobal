import { DEMO_PREFIX } from "./shim";
import { randomBytes } from "node:crypto";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateEmission } from "@/lib/emissions/calculate";
import { ksefXmlParser } from "@/lib/import/ksef-xml";
import { groupWaproRows, type WaproRow } from "@/lib/import/wapro-xlsx";
import { hashPassword, hashToken } from "@/lib/auth/hash";
import { getReport, getReportFilterOptions } from "@/lib/reports/query";
import { getCompany } from "@/lib/db/company";
import { renderReportPdf } from "@/lib/reports/pdf";
import { renderReportCsv, renderReportXlsx } from "@/lib/reports/export";
import { reportFileName } from "@/lib/reports/format";
import { storeReportFile } from "@/lib/reports/archive";
import { REPORT_FORMATS, type ReportFormat } from "@/lib/reports/render";
import { parseIsoDate, parseReportParams, reportParamsToSearch } from "@/lib/reports/params";

const DRY = process.argv.includes("--dry");
const CUTOFF = new Date(Date.now() - 60 * 60_000);
const BUYER_NIP = "8133378641";

// Random
let seed = 20250107;
function rand(): number {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const int = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
const chance = (p: number) => rand() < p;
const pad = (n: number, w = 2) => String(n).padStart(w, "0");
const newId = () => DEMO_PREFIX + randomBytes(10).toString("hex");
const hex = (n: number) => randomBytes(n).toString("hex").slice(0, n).toUpperCase();

// Dates
const HOLIDAYS = new Set([
  "2025-01-01", "2025-01-06", "2025-04-21", "2025-05-01", "2025-05-03", "2025-06-19", "2025-08-15",
  "2025-11-01", "2025-11-11", "2025-12-24", "2025-12-25", "2025-12-26", "2026-01-01", "2026-01-06",
  "2026-04-06", "2026-05-01", "2026-06-04", "2026-08-15", "2026-11-11", "2026-12-24", "2026-12-25",
]);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const day = (s: string) => new Date(`${s}T00:00:00Z`);
const addDays = (s: string, n: number) => iso(new Date(day(s).getTime() + n * 86_400_000));
const isWorkday = (s: string) => ![0, 6].includes(day(s).getUTCDay()) && !HOLIDAYS.has(s);
function workday(s: string, plus = 0): string {
  let d = s;
  while (!isWorkday(d)) d = addDays(d, 1);
  for (let i = 0; i < plus; i++) {
    d = addDays(d, 1);
    while (!isWorkday(d)) d = addDays(d, 1);
  }
  return d;
}
const monthStart = (y: number, m: number) => iso(new Date(Date.UTC(y, m - 1, 1)));
const monthEnd = (y: number, m: number) => iso(new Date(Date.UTC(y, m, 0)));
const plDate = (s: string) => s.split("-").reverse().join(".");

const warsawFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Warsaw",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
function at(s: string, hm: string): Date {
  const [y, mo, d] = s.split("-").map(Number);
  const [h, mi] = hm.split(":").map(Number);
  const guess = Date.UTC(y!, mo! - 1, d!, h!, mi!);
  const p = Object.fromEntries(warsawFmt.formatToParts(new Date(guess)).map((x) => [x.type, Number(x.value)]));
  const shown = Date.UTC(p.year!, p.month! - 1, p.day!, p.hour!, p.minute!);
  return new Date(guess - (shown - guess));
}
const clock = (from = 8, to = 15) => `${pad(int(from, to))}:${pad(int(0, 59))}`;
const later = (d: Date, minFrom: number, minTo: number) => new Date(d.getTime() + int(minFrom, minTo) * 60_000);

// NIP
function nip(prefix9: string): string {
  const w = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = prefix9.split("").reduce((a, c, i) => a + Number(c) * w[i]!, 0) % 11;
  if (sum === 10) throw new Error(`NIP ${prefix9}: zła suma kontrolna`);
  return prefix9 + sum;
}

// Suppliers
interface Supplier {
  name: string;
  nip: string | null;
  addr: [string, string];
}
const SUP = {
  unimot: { name: "UNIMOT ENERGIA i GAZ Sp. z o. o.", nip: "9730421440", addr: ["ul. Świerklańska 2a", "47-120 Zawadzkie"] },
  esp: { name: "Elektro-Sprzedaż Podkarpacie Sp. z o.o.", nip: "8150011223", addr: ["ul. Lwowska 42", "38-400 Krosno"] },
  mcr: { name: "Miejskie Ciepło Rzeszów Sp. z o.o.", nip: "8130013777", addr: ["ul. Ciepłownicza 11", "35-322 Rzeszów"] },
  gro: { name: "Gazownia Rzeszowska Obrót Sp. z o.o.", nip: "5170204455", addr: ["ul. Hetmańska 9", "35-045 Rzeszów"] },
  flt: { name: "FLOTA-PL Stacje Paliw S.A.", nip: "6340128879", addr: ["ul. Przemysłowa 3", "40-020 Katowice"] },
  pp: { name: "Paliwa Podkarpacie Sp. z o.o.", nip: nip("813271604"), addr: ["ul. Przemysłowa 18", "35-105 Rzeszów"] },
  gt: { name: "GAZ-TECH Podkarpacie Sp. z o.o.", nip: nip("684251937"), addr: ["ul. Bieszczadzka 7", "38-400 Krosno"] },
  wp: { name: "Skład Opału WĘGLOPOL Sp. j.", nip: nip("684170253"), addr: ["ul. Kolejowa 3", "38-400 Krosno"] },
} satisfies Record<string, Supplier>;

// Users
type PersonKey = "admin" | "kasia" | "tomek" | "aga" | "piotr";
const OFFICE_IP = "91.231.24.17";
const HOME_IP = "89.64.33.120";
const KROSNO_IP = "178.42.115.6";
const PEOPLE = {
  kasia: {
    name: "Katarzyna Wójcik",
    email: "katarzyna.wojcik@stal-res.pl",
    role: "ANALYST" as const,
    invited: at("2025-01-07", "09:05"),
    accepted: at("2025-01-07", "09:41"),
    ip: OFFICE_IP,
  },
  tomek: {
    name: "Tomasz Nowak",
    email: "tomasz.nowak@stal-res.pl",
    role: "USER" as const,
    invited: at("2025-01-08", "10:12"),
    accepted: at("2025-01-09", "08:23"),
    ip: OFFICE_IP,
  },
  aga: {
    name: "Agnieszka Lis",
    email: "agnieszka.lis@stal-res.pl",
    role: "USER" as const,
    invited: at("2025-01-08", "10:14"),
    accepted: at("2025-01-10", "11:02"),
    ip: OFFICE_IP,
  },
  piotr: {
    name: "Piotr Mazur",
    email: "piotr.mazur@stal-res.pl",
    role: "USER" as const,
    invited: at("2025-02-03", "13:20"),
    accepted: at("2025-02-04", "07:48"),
    ip: KROSNO_IP,
  },
};
const PIOTR_LEFT = at("2026-02-27", "14:05");
const INVITES = [
  { email: "magazyn.krosno@stal-res.pl", role: "USER" as const, invited: at("2026-10-06", "09:15") },
  { email: "ewa.zajac@stal-res.pl", role: "USER" as const, invited: at("2026-11-23", "10:30") },
];

// Model
type Format = "KSEF_XML" | "MANUAL" | "WAPRO_XLSX";
interface Line {
  desc: string;
  qty: string;
  unit: string;
  price: number;
  source?: SourceKey;
  ppe?: string;
  meter?: string;
  tariff?: string;
  place?: string;
}
interface Doc {
  id: string;
  format: Format;
  supplier: Supplier;
  number: string;
  issue: string;
  period?: { from: string; to: string };
  lines: Line[];
  uploader: Exclude<PersonKey, "admin">;
  importedAt: Date;
  fileName?: string;
  draft?: boolean;
  wapro?: { fileName: string; rows: WaproRow[] };
}
type SourceKey = "hq" | "krosno" | "heat" | "gas" | "fleet" | "skoda" | "iveco" | "lpg" | "agr" | "coal" | "office";

const REAL_SOURCES: Partial<Record<SourceKey, string>> = {
  hq: "Licznik główny",
  krosno: "Magazyn Krosno — licznik hali",
  heat: "Węzeł cieplny — biuro Rzeszów",
  gas: "Kotłownia gazowa — Rzeszów",
  fleet: "Flota samochodowa — olej napędowy",
  skoda: "Skoda Fabia 2026 01",
};

const MONTHS: [number, number][] = [];
for (let y = 2025; y <= 2026; y++) for (let m = 1; m <= 12; m++) if (y === 2025 || m <= 10) MONTHS.push([y, m]);

const docs: Doc[] = [];
const docsBySource = new Map<string, Doc>();
const KSEF_FROM = "2026-02-01";

function nextMonth(y: number, m: number): [number, number] {
  return m === 12 ? [y + 1, 1] : [y, m + 1];
}
function importer(issue: string, plusFrom = 1, plusTo = 4) {
  const d = workday(issue, int(plusFrom, plusTo));
  return at(d, clock(8, 14));
}
function krosnoUser(when: Date): Doc["uploader"] {
  return when < PIOTR_LEFT ? "piotr" : "aga";
}
function pushDoc(doc: Omit<Doc, "id" | "format"> & { format?: Format }, key?: string) {
  const format = doc.format ?? (doc.issue >= KSEF_FROM ? "KSEF_XML" : "MANUAL");
  const full: Doc = { id: newId(), ...doc, format };
  docs.push(full);
  if (key) docsBySource.set(key, full);
  return full;
}

// Consumption
const HQ: Record<number, (number | null)[]> = {
  2025: [3480, 3260, 3010, 2720, 2650, 2790, 2980, 3260, 3010, 3120, 3350, 3570],
  2026: [3350, 3120, 2890, 2610, null, null, null, null, 3010, null],
};
const KROSNO: Record<number, (number | null)[]> = {
  2025: [10.42, 10.08, 10.61, 11.93, 11.24, 11.51, 12.1, 12.43, 11.82, 13.14, 14.62, 15.38],
  2026: [15.07, 14.21, 13.32, 12.04, 11.43, null, 12.18, 12.61, 11.74, 13.05],
};
const OFFICE: Record<number, (number | null)[]> = {
  2025: [612, 584, 551, 498, 463, 471, 502, 529, 488, 531, 574, 628],
  2026: [598, 566, 522, 481, 452, 468, 495, 511, 476, null],
};
const HEAT: Record<number, (number | null)[]> = {
  2025: [58.4, 52.1, 44.6, 27.9, 15.2, 11.8, 10.4, 10.9, 16.3, 36.8, 47.5, 55.9],
  2026: [54.2, 50.3, 40.1, 24.6, 13.8, null, 9.6, 10.1, 14.9, 38.4],
};
const FLEET: Record<number, (number | null)[]> = {
  2025: [412.4, 398.1, 441.7, 455.2, 468.9, 431.3, 402.6, 377.8, 452.1, 471.5, 446.0, 389.2],
  2026: [405.3, 392.8, 437.1, 449.6, 455.4, null, 396.2, 368.5, 441.9, 452.3],
};
const IVECO: Record<number, (number | null)[]> = {
  2025: [162.3, 158.7, 171.4, 176.9, 183.2, 169.5, 158.1, 149.6, 174.8, 181.3, 177.2, 151.4],
  2026: [206.1, 201.9, 219.0, 225.2, 233.6, 216.3, 201.4, 191.1, 222.8, null],
};
const LPG: Record<number, (number | null)[]> = {
  2025: [228, 219, 226, 214, 201, 192, 187, 194, 205, 218, 224, 231],
  2026: [221, 213, 219, 208, 196, 188, 182, 190, 199, null],
};
const GAS: [number, number, number | null][] = [
  [2025, 1, 4720], [2025, 2, 2810], [2025, 3, 1510], [2025, 4, 3940],
  [2026, 1, 4480], [2026, 2, null], [2026, 3, 1440],
];
const GENERATOR: [number, number, number | null][] = [
  [2025, 1, 86.4], [2025, 2, 41.2], [2025, 3, 35.8], [2025, 4, 92.6],
  [2026, 1, 78.9], [2026, 2, 38.5], [2026, 3, null],
];
const COAL: [number, number][] = [[1, 6.2], [2, 5.4], [3, 3.1]];
const MCR_2026 = [412, 889, 1341, 1856, 2390, 0, 3150, 3402, 3633, 3990];
const GRO_NO: Record<string, number> = { "2025-1": 298, "2025-2": 577, "2025-3": 861, "2025-4": 1140, "2026-1": 231, "2026-3": 1106 };
const DRAFT_KEYS = new Set(["krosno:2026-10", "fleet:2026-10"]);

function buildDocs() {
  let esp = 412;
  let mcr2025 = 198;
  let flt = 41207;
  let pp = 1183;

  for (const [y, m] of MONTHS) {
    const period = { from: monthStart(y, m), to: monthEnd(y, m) };
    const [ny, nm] = nextMonth(y, m);
    const ym = `${y}-${pad(m)}`;
    const i = m - 1;

    const hq = HQ[y]![i];
    if (hq != null) {
      const issue = workday(`${ny}-${pad(nm)}-10`);
      pushDoc({
        supplier: SUP.unimot,
        number: `UE/F2/1103911/183/${pad(nm)}/${ny}/FR`,
        issue,
        period,
        lines: [
          { desc: "Energia elektryczna czynna — taryfa C11", qty: String(hq), unit: "kWh", price: y === 2025 ? 0.64 : 0.61, source: "hq", ppe: "590543550100711505", meter: "50436458", tariff: "C11", place: "Licznik główny — biuro Rzeszów" },
          { desc: "Opłata handlowa", qty: "1", unit: "mc", price: 49 },
        ],
        uploader: "tomek",
        importedAt: importer(issue, 2, 5),
      }, `hq:${ym}`);
    }

    const kr = KROSNO[y]![i];
    esp += int(430, 520);
    if (kr != null) {
      const issue = workday(`${ny}-${pad(nm)}-05`);
      pushDoc({
        supplier: SUP.esp,
        number: `ESP/${y}/${pad(m)}/${pad(esp, 6)}`,
        issue,
        period,
        lines: [
          { desc: "Energia czynna całodobowa — taryfa C21", qty: kr.toFixed(3), unit: "MWh", price: y === 2025 ? 548 : 520, source: "krosno", ppe: "590543550200418822", meter: "71203344", tariff: "C21", place: "Magazyn Krosno" },
          { desc: "Opłata abonamentowa", qty: "1", unit: "mc", price: 45 },
        ],
        uploader: "tomek",
        importedAt: importer(issue, 1, 3),
        draft: DRAFT_KEYS.has(`krosno:${ym}`),
      }, `krosno:${ym}`);
    }

    const of = OFFICE[y]![i];
    if (of != null) {
      const issue = workday(`${ny}-${pad(nm)}-05`);
      pushDoc({
        supplier: SUP.esp,
        number: `ESP/${y}/${pad(m)}/${pad(esp + int(3, 40), 6)}`,
        issue,
        period,
        lines: [
          { desc: "Energia elektryczna czynna — taryfa C11", qty: String(of), unit: "kWh", price: y === 2025 ? 0.66 : 0.63, source: "office", ppe: "590543550200534107", meter: "71988210", tariff: "C11", place: "Biuro handlowe Krosno" },
          { desc: "Opłata handlowa", qty: "1", unit: "mc", price: 19.9 },
        ],
        uploader: "tomek",
        importedAt: importer(issue, 1, 4),
      }, `office:${ym}`);
    }

    const heat = HEAT[y]![i];
    if (y === 2025) mcr2025 += int(240, 300);
    if (heat != null) {
      const issue = workday(`${ny}-${pad(nm)}-07`);
      pushDoc({
        supplier: SUP.mcr,
        number: `MCR/C/${y}/${pad(m)}/${pad(y === 2025 ? mcr2025 : MCR_2026[i]!, 4)}`,
        issue,
        period,
        lines: [
          { desc: "Ciepło sieciowe — energia cieplna", qty: heat.toFixed(1), unit: "GJ", price: y === 2025 ? 74.6 : 78.2, source: "heat", ppe: "CW-RZ-000781123", place: "Węzeł cieplny biuro" },
          { desc: "Opłata za moc zamówioną", qty: "1", unit: "mc", price: 412 },
        ],
        uploader: "tomek",
        importedAt: importer(issue, 1, 4),
      }, `heat:${ym}`);
    }

    const fleet = FLEET[y]![i];
    flt += int(3800, 4600);
    if (fleet != null) {
      const issue = workday(`${ny}-${pad(nm)}-01`);
      pushDoc({
        supplier: SUP.flt,
        number: `FLT/${pad(m)}/${y}/${pad(flt, 6)}`,
        issue,
        period,
        lines: [
          { desc: "Olej napędowy ON Efecta Diesel", qty: fleet.toFixed(1), unit: "litr", price: y === 2025 ? 6.18 : 5.92, source: "fleet" },
          { desc: "Opłata za kartę flotową", qty: "3", unit: "szt", price: 5 },
        ],
        uploader: "aga",
        importedAt: importer(issue, 2, 6),
        draft: DRAFT_KEYS.has(`fleet:${ym}`),
      }, `fleet:${ym}`);
    }

    const iveco = IVECO[y]![i];
    pp += int(140, 210);
    if (iveco != null) {
      const issue = workday(`${ny}-${pad(nm)}-03`);
      pushDoc({
        supplier: SUP.pp,
        number: `PP/${y}/${pad(m)}/${pad(pp, 5)}`,
        issue,
        period,
        lines: [{ desc: "Olej napędowy — karta flotowa RZ 8841P", qty: iveco.toFixed(1), unit: "litr", price: y === 2025 ? 6.21 : 5.95, source: "iveco" }],
        uploader: "aga",
        importedAt: importer(issue, 2, 6),
      }, `iveco:${ym}`);
    }

    const lpg = LPG[y]![i];
    if (lpg != null && y === 2025) {
      const issue = workday(`${ny}-${pad(nm)}-04`);
      const importedAt = importer(issue, 1, 3);
      pushDoc({
        supplier: SUP.gt,
        number: `GT/${pad(310 + m * 37, 4)}/2025`,
        issue,
        period,
        lines: [{ desc: "Gaz LPG do wózków widłowych (butle 11 kg)", qty: String(lpg), unit: "litr", price: 2.95, source: "lpg" }],
        uploader: krosnoUser(importedAt),
        importedAt,
      }, `lpg:${ym}`);
    }
  }

  for (const [y, q, qty] of GAS) {
    if (qty == null) continue;
    const from = monthStart(y, q * 3 - 2);
    const to = monthEnd(y, q * 3);
    const issue = workday(addDays(to, 2));
    pushDoc({
      supplier: SUP.gro,
      number: `GRO/F/${y}/${pad(GRO_NO[`${y}-${q}`]!, 4)}`,
      issue,
      period: { from, to },
      lines: [
        { desc: "Paliwo gazowe — gaz ziemny wysokometanowy E", qty: String(qty), unit: "m3", price: y === 2025 ? 2.84 : 2.61, source: "gas" },
        { desc: "Opłata dystrybucyjna stała", qty: "3", unit: "mc", price: 38.5 },
      ],
      uploader: "kasia",
      importedAt: importer(issue, 1, 3),
    }, `gas:${y}-Q${q}`);
  }

  for (const [y, q, qty] of GENERATOR) {
    if (qty == null) continue;
    const from = monthStart(y, q * 3 - 2);
    const to = monthEnd(y, q * 3);
    const issue = workday(addDays(to, 3));
    const importedAt = importer(issue, 1, 4);
    pushDoc({
      supplier: SUP.pp,
      number: `PP/AGR/${y}/${pad(q)}`,
      issue,
      period: { from, to },
      lines: [{ desc: "Olej napędowy — tankowanie agregatu prądotwórczego", qty: qty.toFixed(1), unit: "litr", price: y === 2025 ? 6.21 : 5.95, source: "agr" }],
      uploader: krosnoUser(importedAt),
      importedAt,
    }, `agr:${y}-Q${q}`);
  }

  for (const [m, t] of COAL) {
    const issue = workday(`2025-${pad(m + 1)}-03`);
    pushDoc({
      supplier: SUP.wp,
      number: `WP/${pad(41 + m * 36, 4)}/2025`,
      issue,
      period: { from: monthStart(2025, m), to: monthEnd(2025, m) },
      lines: [{ desc: "Węgiel kamienny groszek, 26 MJ/kg", qty: t.toFixed(1), unit: "t", price: 1180, source: "coal" }],
      uploader: "piotr",
      importedAt: importer(issue, 1, 3),
    }, `coal:2025-${pad(m)}`);
  }

  // WAPRO
  for (let m = 1; m <= 11; m++) {
    const yy = "26";
    const monthDocs: { key: string; row: WaproRow; source: SourceKey; date: string }[] = [];
    const fuelDays = [workday(`2026-${pad(m)}-${pad(int(4, 11))}`), workday(`2026-${pad(m)}-${pad(int(17, 24))}`)];
    if (m === 11) fuelDays.splice(0, 2, "2026-11-06", "2026-11-20");
    fuelDays.forEach((date, k) => {
      const document = `PZ /PAL/${pad(2 * m - 1 + k, 3)}/${pad(m)}${yy}`;
      monthDocs.push({
        key: `skoda:2026-${pad(m)}-${k}`,
        source: "skoda",
        date,
        row: { row: 0, supplier: "ORLEN S.A.", document, tradeDocument: `FV/ORL/${yy}/${pad(int(10000, 99999), 7)}`, date, netPrice: (5.71 + rand() * 0.18).toFixed(2), quantity: (36 + rand() * 10).toFixed(2), unit: "l" },
      });
    });
    const lpg = m <= 10 ? LPG[2026]![m - 1] : null;
    if (lpg != null) {
      const date = workday(`2026-${pad(m)}-${pad(int(10, 16))}`);
      monthDocs.push({
        key: `lpg:2026-${pad(m)}`,
        source: "lpg",
        date,
        row: { row: 0, supplier: "GAZ-TECH PODKARPACIE SP. Z O.O.", document: `PZ /GAZ/${pad(m, 3)}/${pad(m)}${yy}`, tradeDocument: `GT/${pad(100 + m * 41, 4)}/2026`, date, netPrice: "2.89", quantity: String(lpg), unit: "l" },
      });
    }

    const fileName = `przyjecia_paliwa_2026-${pad(m)}.xlsx`;
    const importDay = m === 11 ? "2026-11-23" : workday(`2026-${pad(m + 1)}-01`, int(1, 3));
    const uploader = "aga" as const;
    let t = at(importDay, clock(9, 12));
    monthDocs.forEach((d, idx) => {
      d.row.row = idx + 5;
      const unitLine: Line = { desc: "", qty: d.row.quantity, unit: d.row.unit, price: Number(d.row.netPrice), source: d.source };
      pushDoc({
        format: "WAPRO_XLSX",
        supplier: { name: d.row.supplier, nip: null, addr: ["", ""] },
        number: d.row.document,
        issue: d.date,
        lines: [unitLine],
        uploader,
        importedAt: t,
        fileName,
        draft: m === 11,
        wapro: { fileName, rows: [d.row] },
      }, d.key);
      t = later(t, 0, 1);
    });
  }
}

// Factors
interface FactorRow {
  id: string;
  name: string;
  value: Prisma.Decimal;
  unit: string;
  validFrom: Date;
  validTo: Date;
}
interface SourceInfo {
  id: string;
  name: string;
  versions: FactorRow[];
}

function resolveFactor(source: SourceInfo, ref: string): FactorRow {
  const refDate = day(ref);
  const valid = source.versions.filter((f) => f.validFrom <= refDate && refDate <= f.validTo);
  if (valid.length !== 1) throw new Error(`${source.name}: ${valid.length} wskaźników na ${ref}`);
  return valid[0]!;
}

// XML
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const money = (n: number) => n.toFixed(2);
const meta = (k: string, v: string) => `<MetaDane><ZKlucz>${esc(k)}</ZKlucz><ZWartosc>${esc(v)}</ZWartosc></MetaDane>`;

function ksefXml(doc: Doc): string {
  const nets = doc.lines.map((l) => Math.round(Number(l.qty) * l.price * 100) / 100);
  const net = nets.reduce((a, b) => a + b, 0);
  const vat = Math.round(net * 23) / 100;
  const rows = doc.lines
    .map((l, i) => `<FaWiersz><NrWierszaFa>${i + 1}</NrWierszaFa><P_7>${esc(l.desc)}</P_7><P_8A>${l.unit}</P_8A><P_8B>${l.qty}</P_8B><P_9A>${l.price.toFixed(8)}</P_9A><P_11>${money(nets[i]!)}</P_11><P_12>23</P_12></FaWiersz>`)
    .join("");
  const energy = doc.lines.find((l) => l.ppe);
  const attachment = energy
    ? `<Zalacznik><BlokDanych><ZNaglowek>Rozliczenie punktu poboru ${esc(energy.ppe!)}</ZNaglowek>${meta("Numer punktu poboru", energy.ppe!)}${energy.meter ? meta("Numer licznika", energy.meter) : ""}${energy.place ? meta("Nazwa punktu poboru", energy.place) : ""}${meta("Okres", `${plDate(doc.period!.from)} - ${plDate(doc.period!.to)}`)}${energy.tariff ? meta("Grupa taryfowa", energy.tariff) : ""}</BlokDanych></Zalacznik>`
    : "";
  const s = doc.supplier;
  return `<?xml version="1.0" encoding="UTF-8"?><Faktura xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:etd="http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2022/01/05/eD/DefinicjeTypy/" xmlns="http://crd.gov.pl/wzor/2025/06/25/13775/"><Naglowek><KodFormularza kodSystemowy="FA (3)" wersjaSchemy="1-0E">FA</KodFormularza><WariantFormularza>3</WariantFormularza><DataWytworzeniaFa>${doc.issue}T07:${pad(int(0, 59))}:00Z</DataWytworzeniaFa><SystemInfo>System fakturowy</SystemInfo></Naglowek><Podmiot1><DaneIdentyfikacyjne><NIP>${s.nip}</NIP><Nazwa>${esc(s.name)}</Nazwa></DaneIdentyfikacyjne><Adres><KodKraju>PL</KodKraju><AdresL1>${esc(s.addr[0])}</AdresL1><AdresL2>${esc(s.addr[1])}</AdresL2></Adres></Podmiot1><Podmiot2><DaneIdentyfikacyjne><NIP>${BUYER_NIP}</NIP><Nazwa>STAL-RES SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ</Nazwa></DaneIdentyfikacyjne><Adres><KodKraju>PL</KodKraju><AdresL1>ul. Boya-Żeleńskiego 11</AdresL1><AdresL2>35-105 Rzeszów</AdresL2></Adres><JST>2</JST><GV>2</GV></Podmiot2><Fa><KodWaluty>PLN</KodWaluty><P_1>${doc.issue}</P_1><P_2>${esc(doc.number)}</P_2>${doc.period ? `<OkresFa><P_6_Od>${doc.period.from}</P_6_Od><P_6_Do>${doc.period.to}</P_6_Do></OkresFa>` : ""}<P_13_1>${money(net)}</P_13_1><P_14_1>${money(vat)}</P_14_1><P_15>${money(net + vat)}</P_15><Adnotacje><P_16>2</P_16><P_17>2</P_17><P_18>2</P_18><P_18A>2</P_18A><Zwolnienie><P_19N>1</P_19N></Zwolnienie><NoweSrodkiTransportu><P_22N>1</P_22N></NoweSrodkiTransportu><P_23>2</P_23><PMarzy><P_PMarzyN>1</P_PMarzyN></PMarzy></Adnotacje><RodzajFaktury>VAT</RodzajFaktury>${rows}</Fa>${attachment}</Faktura>`;
}

// Corrections
const CORRECTIONS: Record<string, { qty: string; on: string; note: string }> = {
  "heat:2025-02": { qty: "49.8", on: "2025-03-24", note: "Korekta faktury MCR — odczyt rzeczywisty zamiast szacunkowego" },
  "krosno:2025-07": { qty: "12.340", on: "2025-08-21", note: "Faktura korygująca ESP — doszacowanie zużycia" },
  "fleet:2025-11": { qty: "431.5", on: "2025-12-15", note: "Korekta — zwrot paliwa z karty RZ 5520M" },
  "gas:2026-Q1": { qty: "4512", on: "2026-04-28", note: "Faktura korygująca GRO — odczyt rzeczywisty" },
  "hq:2026-03": { qty: "2934", on: "2026-04-22", note: "Korekta sprzedawcy — błędny odczyt licznika" },
  "lpg:2026-08": { qty: "176", on: "2026-09-14", note: "Korekta przyjęcia — zwrot niewykorzystanych butli" },
};

// Archive specs
const ARCHIVE = [
  { title: "Raport kwartalny — I kwartał 2025", q: "from=2025-01-01&to=2025-03-31&szablon=quarterly", from: "2025-01-01", to: "2025-03-31", at: at("2025-04-14", "10:20") },
  { title: "Raport kwartalny — II kwartał 2025", q: "from=2025-04-01&to=2025-06-30&szablon=quarterly", from: "2025-04-01", to: "2025-06-30", at: at("2025-07-11", "11:05") },
  { title: "Raport kwartalny — III kwartał 2025", q: "from=2025-07-01&to=2025-09-30&szablon=quarterly", from: "2025-07-01", to: "2025-09-30", at: at("2025-10-13", "09:50") },
  { title: "Raport kwartalny — IV kwartał 2025", q: "from=2025-10-01&to=2025-12-31&szablon=quarterly", from: "2025-10-01", to: "2025-12-31", at: at("2026-01-14", "10:35") },
  { title: "Raport roczny 2025 — ESRS E1-6", note: "Wersja przekazana zarządowi — dane zweryfikowane.", q: "from=2025-01-01&to=2025-12-31&szablon=esrs&przychody=48500000", from: "2025-01-01", to: "2025-12-31", at: at("2026-01-21", "11:20") },
  { title: "Energia zakupiona (Zakres 2) — 2025", note: "Dla działu zakupów — przetarg na dostawę energii 2027.", q: "from=2025-01-01&to=2025-12-31&scope=SCOPE_2", from: "2025-01-01", to: "2025-12-31", at: at("2026-02-09", "13:40") },
  { title: "Raport kwartalny — I kwartał 2026", q: "from=2026-01-01&to=2026-03-31&szablon=quarterly", from: "2026-01-01", to: "2026-03-31", at: at("2026-04-14", "10:40") },
  { title: "Raport kwartalny — II kwartał 2026", q: "from=2026-04-01&to=2026-06-30&szablon=quarterly", from: "2026-04-01", to: "2026-06-30", at: at("2026-07-14", "09:55") },
  { title: "Raport kwartalny — III kwartał 2026", note: "Przekazany do działu finansowego.", q: "from=2026-07-01&to=2026-09-30&szablon=quarterly", from: "2026-07-01", to: "2026-09-30", at: at("2026-10-13", "12:10") },
  { title: "Podsumowanie miesięczne — październik 2026", q: "from=2026-10-01&to=2026-10-31&szablon=monthly", from: "2026-10-01", to: "2026-10-31", at: at("2026-11-16", "10:15") },
];

const r4 = (d: Prisma.Decimal) => d.toDecimalPlaces(4);
const r6 = (d: Prisma.Decimal) => d.toDecimalPlaces(6);

function checkArchive() {
  for (const a of ARCHIVE) {
    const p = parseReportParams(new URLSearchParams(a.q));
    if (p.from !== a.from || p.to !== a.to) throw new Error(`Parametry raportu ${a.title}: ${p.from}–${p.to}`);
  }
}

async function createArchive(ids: { kasia: string; tomek: string }) {
  checkArchive();
  const who = {
    kasia: { id: ids.kasia, name: PEOPLE.kasia.name },
    tomek: { id: ids.tomek, name: PEOPLE.tomek.name },
  };
  const [company, options] = await Promise.all([getCompany(), getReportFilterOptions()]);
  const sourceNames = new Map(options.sources.map((s) => [s.id, s.name]));
  for (const a of ARCHIVE) {
    const params = parseReportParams(new URLSearchParams(a.q));
    const data = await getReport(params);
    const formats: ReportFormat[] = ["pdf", "xlsx", "csv"];
    const uploaded = [];
    for (const format of formats) {
      const body =
        format === "pdf"
          ? renderReportPdf(data, { company, generatedBy: PEOPLE.kasia.name, generatedAt: a.at, sourceNames })
          : format === "xlsx"
            ? renderReportXlsx(data)
            : renderReportCsv(data);
      const fileName = reportFileName(params, format);
      const blobUrl = await storeReportFile({ fileName, type: REPORT_FORMATS[format], body });
      uploaded.push({ format, fileName, blobUrl, size: body.byteLength });
    }
    const id = newId();
    const query = reportParamsToSearch(params).toString();
    await prisma.archivedReport.create({
      data: {
        id,
        title: a.title,
        note: a.note ?? null,
        query,
        periodFrom: parseIsoDate(params.from),
        periodTo: parseIsoDate(params.to),
        includesDrafts: false,
        totalCo2eKg: new Prisma.Decimal(data.totalKg),
        entryCount: data.entryCount,
        createdById: ids.kasia,
        createdAt: a.at,
        files: { create: uploaded },
      },
    });
    const rows: Prisma.AuditLogCreateManyInput[] = [];
    const push = (k: keyof typeof who, when: Date, action: string, details: object) =>
      rows.push({ id: newId(), userId: who[k].id, userName: who[k].name, action, entity: "ArchivedReport", entityId: id, details: JSON.stringify(details), ipAddress: OFFICE_IP, createdAt: when });
    push("kasia", a.at, "CREATE", { title: a.title, query, totalCo2eKg: data.totalKg });
    const pdf = uploaded.find((u) => u.format === "pdf")!;
    const xlsx = uploaded.find((u) => u.format === "xlsx")!;
    push("kasia", later(a.at, 2, 6), "DOWNLOAD", { title: a.title, format: "pdf", fileName: pdf.fileName, preview: true });
    push("tomek", at(workday(iso(a.at), 1), clock(9, 14)), "DOWNLOAD", { title: a.title, format: "xlsx", fileName: xlsx.fileName });
    await prisma.auditLog.createMany({ data: rows });
    console.log(`  ✓ ${a.title} (${data.entryCount} wpisów, ${uploaded.length} pliki)`);
  }
}

async function main() {
  if (process.argv.includes("--archive-only")) {
    const [kasia, tomek] = await Promise.all(
      [PEOPLE.kasia.email, PEOPLE.tomek.email].map((email) =>
        prisma.user.findFirstOrThrow({ where: { email, id: { startsWith: DEMO_PREFIX } } }),
      ),
    );
    if (await prisma.archivedReport.count({ where: { id: { startsWith: DEMO_PREFIX } } })) {
      throw new Error("Archiwum demo już istnieje");
    }
    await createArchive({ kasia: kasia!.id, tomek: tomek!.id });
    console.log("Gotowe.");
    return;
  }
  const existing = await prisma.user.count({ where: { id: { startsWith: DEMO_PREFIX } } });
  if (existing > 0) throw new Error("Dane demo już istnieją — najpierw uruchom prisma/demo/cleanup.ts");

  const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });
  const allFactors = await prisma.emissionFactor.findMany();
  const lineageOf = (factorId: string): FactorRow[] => {
    const f = allFactors.find((x) => x.id === factorId)!;
    const root = f.parentId ?? f.id;
    return allFactors.filter((x) => x.id === root || x.parentId === root);
  };
  const factorByName = (name: string) => {
    const f = allFactors.find((x) => x.name === name);
    if (!f) throw new Error(`Brak wskaźnika ${name}`);
    return f;
  };
  const category = await prisma.factorCategory.findUniqueOrThrow({ where: { name: "Paliwa ciekłe" } });

  // Demo factor
  const agrFactor = {
    id: newId(),
    name: "Olej napędowy — agregaty stacjonarne (KOBiZE 2023)",
    categoryId: category.id,
    value: new Prisma.Decimal("2.68"),
    unit: "kg CO₂e/litr",
    source: "KOBIZE" as const,
    scope: "SCOPE_1" as const,
    validFrom: day("2025-01-01"),
    validTo: day("2026-12-15"),
    createdAt: at("2025-01-09", "10:42"),
    updatedAt: at("2025-01-09", "10:42"),
  };

  // Sources
  const sources = new Map<SourceKey, SourceInfo>();
  for (const [key, name] of Object.entries(REAL_SOURCES) as [SourceKey, string][]) {
    const s = await prisma.emissionSource.findUniqueOrThrow({ where: { name } });
    sources.set(key, { id: s.id, name: s.name, versions: lineageOf(s.defaultFactorId!) });
  }
  const elecRoot = sources.get("hq")!.versions.find((v) => !allFactors.find((x) => x.id === v.id)!.parentId)!;
  const demoSources = [
    { key: "iveco" as const, name: "Iveco Daily — RZ 8841P (dostawy)", type: "COMPANY_VEHICLE" as const, scope: "SCOPE_1" as const, unit: "litr", factor: factorByName("Olej napędowy (GHG Protocol)").id, registrationNumber: "RZ 8841P", location: "Baza Rzeszów", supplierNip: SUP.pp.nip, created: at("2025-01-09", "10:15") },
    { key: "lpg" as const, name: "Wózki widłowe LPG — magazyn Krosno", type: "COMPANY_VEHICLE" as const, scope: "SCOPE_1" as const, unit: "litr", factor: factorByName("LPG (GHG Protocol)").id, registrationNumber: "Linde H25T, Jungheinrich TFG 320", location: "ul. Składowa 4, 38-400 Krosno", supplierNip: SUP.gt.nip, created: at("2025-01-09", "10:21") },
    { key: "agr" as const, name: "Agregat prądotwórczy — magazyn Krosno", type: "STATIONARY_INSTALLATION" as const, scope: "SCOPE_1" as const, unit: "litr", factor: agrFactor.id, location: "ul. Składowa 4, 38-400 Krosno", billingFrequency: "QUARTERLY" as const, created: at("2025-01-09", "10:44") },
    { key: "coal" as const, name: "Kotłownia węglowa — magazyn Krosno", type: "STATIONARY_INSTALLATION" as const, scope: "SCOPE_1" as const, unit: "kg", factor: factorByName("Węgiel kamienny (GHG Protocol)").id, location: "ul. Składowa 4, 38-400 Krosno", supplierNip: SUP.wp.nip, created: at("2025-01-09", "10:31"), inactiveFrom: at("2025-04-14", "13:12") },
    { key: "office" as const, name: "Biuro handlowe Krosno — energia", type: "ELECTRICITY" as const, scope: "SCOPE_2" as const, unit: "kWh", factor: elecRoot.id, location: "ul. Lwowska 21, 38-400 Krosno", created: at("2025-01-09", "10:37") },
  ];
  for (const s of demoSources) {
    const id = newId();
    const versions = s.factor === agrFactor.id ? [agrFactor] : lineageOf(s.factor);
    sources.set(s.key, { id, name: s.name, versions });
  }

  buildDocs();

  // Users
  const userId: Record<PersonKey, string> = { admin: admin.id, kasia: newId(), tomek: newId(), aga: newId(), piotr: newId() };
  const userName = (k: PersonKey) => (k === "admin" ? admin.name || admin.email : PEOPLE[k].name);
  const ipOf = (k: PersonKey, when: Date) =>
    k === "admin" ? OFFICE_IP : k === "kasia" && (when.getUTCHours() >= 16 || chance(0.08)) ? HOME_IP : PEOPLE[k].ip;

  interface AuditRow {
    id: string;
    userId: string | null;
    userName: string | null;
    action: string;
    entity: string;
    entityId: string | null;
    details: string | null;
    ipAddress: string | null;
    createdAt: Date;
  }
  const audit: AuditRow[] = [];
  const log = (who: PersonKey, when: Date, action: string, entity: string, entityId: string | null, details?: object) => {
    if (when >= CUTOFF) throw new Error(`Zdarzenie w przyszłości: ${action} ${entity} ${when.toISOString()}`);
    audit.push({
      id: newId(),
      userId: userId[who],
      userName: userName(who),
      action,
      entity,
      entityId,
      details: details ? JSON.stringify(details) : null,
      ipAddress: ipOf(who, when),
      createdAt: when,
    });
  };

  const users: Prisma.UserCreateManyInput[] = [];
  for (const k of ["kasia", "tomek", "aga", "piotr"] as const) {
    const p = PEOPLE[k];
    users.push({
      id: userId[k],
      email: p.email,
      name: p.name,
      passwordHash: await hashPassword(randomBytes(24).toString("hex")),
      role: p.role,
      active: k !== "piotr",
      createdAt: p.invited,
      updatedAt: k === "piotr" ? PIOTR_LEFT : p.accepted,
    });
    log("admin", p.invited, "CREATE", "User", userId[k], { email: p.email, role: p.role, invitedBy: admin.email });
    log(k, p.accepted, "UPDATE", "User", userId[k], { email: p.email, role: p.role, inviteAccepted: true });
    log(k, later(p.accepted, 0, 0), "LOGIN", "User", userId[k]);
  }
  log("admin", PIOTR_LEFT, "UPDATE", "User", userId.piotr, { email: PEOPLE.piotr.email, active: { from: true, to: false } });
  for (const inv of INVITES) {
    const id = newId();
    users.push({
      id,
      email: inv.email,
      passwordHash: "",
      role: inv.role,
      active: true,
      invitationToken: hashToken(randomBytes(32).toString("hex")),
      invitationExpires: new Date(inv.invited.getTime() + 7 * 86_400_000),
      createdAt: inv.invited,
      updatedAt: inv.invited,
    });
    log("admin", inv.invited, "CREATE", "User", id, { email: inv.email, role: inv.role, invitedBy: admin.email });
  }
  const resetAt = at("2025-09-08", "08:11");
  log("aga", resetAt, "UPDATE", "User", userId.aga, { email: PEOPLE.aga.email, passwordResetRequested: true, emailSent: true });
  log("aga", later(resetAt, 4, 6), "UPDATE", "User", userId.aga, { email: PEOPLE.aga.email, passwordReset: true });

  // Sources and factor
  log("kasia", agrFactor.createdAt, "CREATE", "EmissionFactor", agrFactor.id, { name: agrFactor.name, value: "2,68", unit: agrFactor.unit });
  const sourceRows: Prisma.EmissionSourceCreateManyInput[] = demoSources.map((s) => {
    const id = sources.get(s.key)!.id;
    log("kasia", s.created, "CREATE", "EmissionSource", id, { name: s.name, type: s.type, ppeNumber: null });
    const inactiveFrom = "inactiveFrom" in s ? s.inactiveFrom : undefined;
    if (inactiveFrom) log("kasia", inactiveFrom, "UPDATE", "EmissionSource", id, { active: { from: true, to: false } });
    return {
      id,
      name: s.name,
      type: s.type,
      scope: s.scope,
      unit: s.unit,
      defaultFactorId: s.factor,
      active: !inactiveFrom,
      registrationNumber: "registrationNumber" in s ? s.registrationNumber : null,
      location: s.location,
      billingFrequency: "billingFrequency" in s ? s.billingFrequency : "MONTHLY",
      supplierNip: "supplierNip" in s ? s.supplierNip : null,
      createdAt: s.created,
      updatedAt: inactiveFrom ?? s.created,
    };
  });

  // Invoices and entries
  const invoices: Prisma.InvoiceCreateManyInput[] = [];
  const entries: Prisma.EmissionEntryCreateManyInput[] = [];
  const keyOf = new Map<Doc, string>([...docsBySource].map(([k, d]) => [d, k]));
  const taken = await prisma.invoice.findMany({ select: { supplierNip: true, invoiceNumber: true } });
  const takenKeys = new Set(taken.map((t) => `${t.supplierNip}|${t.invoiceNumber}`));
  let verifiedCount = 0;

  for (const doc of docs.sort((a, b) => a.importedAt.getTime() - b.importedAt.getTime())) {
    const key = keyOf.get(doc)!;
    if (takenKeys.has(`${doc.supplier.nip}|${doc.number}`)) throw new Error(`Numer już istnieje: ${doc.number}`);
    takenKeys.add(`${doc.supplier.nip}|${doc.number}`);

    const uploaderRole = PEOPLE[doc.uploader].role;
    let rawPayload: Prisma.InputJsonValue | undefined;
    let ksefNumber: string | null = null;
    let fileName = doc.fileName;

    if (doc.format === "KSEF_XML") {
      ksefNumber = `${doc.supplier.nip}-${doc.issue.replace(/-/g, "")}-${hex(12)}-${hex(2)}`;
      fileName = `${ksefNumber}.xml`;
      const xml = ksefXml(doc);
      const parsed = ksefXmlParser.parse({ name: fileName, content: Buffer.from(xml, "utf8") });
      const relevant = parsed.lines.filter((l) => l.emissionRelevant);
      const expected = doc.lines.filter((l) => l.source);
      if (relevant.length !== expected.length || relevant.some((l, i) => Number(l.quantity) !== Number(expected[i]!.qty))) {
        throw new Error(`XML ${doc.number}: parser odczytał ${JSON.stringify(relevant.map((l) => [l.quantity, l.unit]))}`);
      }
      const energy = doc.lines.find((l) => l.ppe);
      if (energy && relevant[0]!.ppeNumber !== energy.ppe) throw new Error(`XML ${doc.number}: brak PPE`);
      rawPayload = { format: "KSEF_XML", fileName, xml };
    } else if (doc.format === "WAPRO_XLSX") {
      const [parsed] = groupWaproRows(doc.wapro!.rows, doc.wapro!.fileName);
      if (!parsed || !parsed.lines.some((l) => l.emissionRelevant)) throw new Error(`WAPRO ${doc.number}: brak pozycji`);
      rawPayload = { format: "WAPRO_XLSX", fileName: doc.wapro!.fileName, document: doc.number, rows: doc.wapro!.rows as unknown as Prisma.InputJsonArray };
    }

    // Status timeline
    const verifier: PersonKey = "kasia";
    let verifiedAt: Date | null = null;
    if (uploaderRole === "ANALYST") verifiedAt = doc.importedAt;
    else if (!doc.draft) {
      verifiedAt = at(workday(iso(doc.importedAt), int(1, 3)), clock(9, 15));
      if (verifiedAt >= CUTOFF) verifiedAt = null;
    }
    const statusAtImport = uploaderRole === "ANALYST" ? "VERIFIED" : "DRAFT";
    const correction = CORRECTIONS[key];

    const docEntries: string[] = [];
    let totalKg = new Prisma.Decimal(0);
    const entryDate = doc.period?.to ?? doc.issue;

    for (const line of doc.lines.filter((l) => l.source)) {
      const source = sources.get(line.source!)!;
      const factor = resolveFactor(source, entryDate);
      const calc = calculateEmission({ quantity: line.qty, quantityUnit: line.unit, factorValue: factor.value.toString(), factorUnit: factor.unit });
      totalKg = totalKg.add(calc.co2eKg);
      const entryId = newId();
      docEntries.push(entryId);

      let final = calc;
      let originalQuantity = line.qty;
      let status: "DRAFT" | "VERIFIED" | "CORRECTED" = verifiedAt ? "VERIFIED" : "DRAFT";
      let note: string | null = null;
      let updatedAt = verifiedAt ?? doc.importedAt;

      if (correction && verifiedAt) {
        const fixed = calculateEmission({ quantity: correction.qty, quantityUnit: line.unit, factorValue: factor.value.toString(), factorUnit: factor.unit });
        const correctedAt = at(workday(correction.on), clock(9, 15));
        final = fixed;
        originalQuantity = correction.qty;
        status = "CORRECTED";
        note = correction.note;
        updatedAt = correctedAt;
        log("kasia", correctedAt, "CORRECT", "EmissionEntry", entryId, {
          status: { from: "VERIFIED", to: "CORRECTED" },
          quantity: { from: r4(calc.quantity).toString(), to: r4(fixed.quantity).toString() },
          co2eKg: { from: r4(calc.co2eKg).toString(), to: r4(fixed.co2eKg).toString() },
        });
      }
      if (status !== "DRAFT") verifiedCount++;

      entries.push({
        id: entryId,
        sourceId: source.id,
        factorId: factor.id,
        invoiceId: doc.id,
        entryDate: day(entryDate),
        periodStart: doc.period ? day(doc.period.from) : null,
        periodEnd: doc.period ? day(doc.period.to) : null,
        quantity: r4(final.quantity),
        unit: final.unit,
        originalQuantity: new Prisma.Decimal(originalQuantity),
        originalUnit: line.unit,
        factorSnapshotValue: factor.value,
        factorSnapshotUnit: factor.unit,
        co2eKg: r4(final.co2eKg),
        co2eTon: r6(final.co2eTon),
        status,
        note,
        authorId: userId[doc.uploader],
        verifierId: status === "DRAFT" ? null : userId[verifier],
        createdAt: doc.importedAt,
        updatedAt,
      });
    }

    invoices.push({
      id: doc.id,
      invoiceNumber: doc.number,
      issueDate: day(doc.issue),
      periodStart: doc.period ? day(doc.period.from) : null,
      periodEnd: doc.period ? day(doc.period.to) : null,
      sourceFormat: doc.format,
      importStatus: "PROCESSED",
      ksefNumber,
      supplierNip: doc.supplier.nip,
      supplierName: doc.supplier.name,
      buyerNip: doc.format === "WAPRO_XLSX" ? null : BUYER_NIP,
      rawPayload: rawPayload ?? Prisma.DbNull,
      uploadedById: userId[doc.uploader],
      createdAt: doc.importedAt,
      updatedAt: verifiedAt ?? doc.importedAt,
    });

    // Mistaken import
    if (key === "heat:2025-05") {
      const wrongId = newId();
      const t0 = new Date(doc.importedAt.getTime() - 11 * 60_000);
      log(doc.uploader, t0, "IMPORT", "Invoice", wrongId, { format: doc.format, invoiceNumber: doc.number, lines: 1, status: "DRAFT", totalCo2eKg: totalKg.toString() });
      log(doc.uploader, later(t0, 5, 7), "DELETE", "Invoice", wrongId, { invoiceNumber: doc.number, entries: 1, attachments: 0 });
    }

    log(doc.uploader, doc.importedAt, "IMPORT", "Invoice", doc.id, {
      format: doc.format,
      ...(fileName && { fileName }),
      invoiceNumber: doc.number,
      lines: docEntries.length,
      status: statusAtImport,
      totalCo2eKg: totalKg.toString(),
    });
    if (verifiedAt && statusAtImport === "DRAFT") {
      log(verifier, verifiedAt, "VERIFY", "Invoice", doc.id, { entries: docEntries, to: "VERIFIED" });
    }
    if (doc.format === "KSEF_XML" && chance(0.08)) {
      log("kasia", later(verifiedAt ?? doc.importedAt, 20, 240), "DOWNLOAD", "Invoice", doc.id, { fileName });
    }
  }

  // Report downloads
  for (const [y, m] of [...MONTHS.slice(1), [2026, 11] as [number, number]]) {
    const when = at(workday(`${y}-${pad(m)}-${pad(int(6, 10))}`), clock(10, 15));
    log("kasia", when, "CREATE", "Report", null, { format: "pdf", query: "preset=previousMonth&szablon=monthly" });
    if ([1, 4, 7, 10].includes(m)) {
      log("kasia", later(when, 3, 15), "CREATE", "Report", null, { format: "xlsx", query: "preset=previousQuarter&szablon=quarterly" });
    }
    if (m % 3 === 0) log("tomek", at(workday(`${y}-${pad(m)}-20`), clock(9, 14)), "CREATE", "Report", null, { format: "csv", query: "preset=currentYear" });
  }
  log("kasia", at("2026-01-19", "10:05"), "CREATE", "Report", null, { format: "pdf", query: "preset=previousYear&szablon=esrs&przychody=48500000" });

  checkArchive();

  // Logins
  const actions = new Map<PersonKey, Date[]>();
  for (const row of audit) {
    const who = (Object.keys(userId) as PersonKey[]).find((k) => userId[k] === row.userId)!;
    if (row.action === "LOGIN") continue;
    actions.set(who, [...(actions.get(who) ?? []), row.createdAt]);
  }
  for (const a of ARCHIVE) actions.get("kasia")!.push(a.at);
  for (let w = day("2025-01-13").getTime(); w < CUTOFF.getTime() - 7 * 86_400_000; w += 7 * 86_400_000) {
    const d = workday(iso(new Date(w)), int(0, 3));
    actions.get("kasia")!.push(at(d, clock(8, 10)));
    if (chance(0.6)) actions.get("tomek")!.push(at(d, clock(8, 11)));
  }
  for (const [who, times] of actions) {
    let last = 0;
    const firstLogin = audit.find((r) => r.userId === userId[who] && r.action === "LOGIN")?.createdAt.getTime() ?? 0;
    for (const t of times.sort((a, b) => a.getTime() - b.getTime())) {
      if (who === "piotr" && t > PIOTR_LEFT) continue;
      if (t.getTime() <= firstLogin + 60_000) {
        last = Math.max(last, firstLogin);
        continue;
      }
      if (t.getTime() - last > 6.5 * 86_400_000 || chance(0.06)) {
        const loginAt = new Date(t.getTime() - int(3, 35) * 60_000);
        log(who, loginAt, "LOGIN", "User", userId[who]);
        last = loginAt.getTime();
      }
    }
  }
  const drafts = entries.filter((e) => e.status === "DRAFT").length;
  const corrected = entries.filter((e) => e.status === "CORRECTED").length;
  console.log(
    `Plan: ${users.length} użytkowników, ${sourceRows.length} źródeł, 1 wskaźnik, ${invoices.length} faktur, ` +
      `${entries.length} wpisów (${verifiedCount} zweryfikowanych/skorygowanych, ${corrected} korekt, ${drafts} szkiców), ` +
      `${audit.length} zdarzeń + ${ARCHIVE.length} raporty w archiwum.`,
  );
  if (DRY) return;

  await prisma.$transaction(
    async (tx) => {
      await tx.emissionFactor.create({ data: agrFactor });
      await tx.user.createMany({ data: users });
      await tx.emissionSource.createMany({ data: sourceRows });
      await tx.invoice.createMany({ data: invoices });
      await tx.emissionEntry.createMany({ data: entries });
      await tx.auditLog.createMany({ data: audit });
    },
    { timeout: 120_000, maxWait: 20_000 },
  );
  console.log("Zapisano dane. Generowanie archiwum raportów…");

  await createArchive({ kasia: userId.kasia, tomek: userId.tomek });
  console.log("Gotowe.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
