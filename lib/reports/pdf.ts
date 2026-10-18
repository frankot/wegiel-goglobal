import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { jsPDF } from "jspdf";
import { autoTable, type CellInput, type RowInput, type UserOptions } from "jspdf-autotable";
import { companyHeaderLines, type CompanyDTO } from "@/lib/db/company";
import type { ReportData } from "./aggregate";
import { formatRange, includesDrafts, monthLabel, periodTitle } from "./params";
import {
  ORIGIN_LABELS,
  filtersSummary,
  fmtChange,
  fmtFactor,
  fmtKg,
  fmtPct,
  fmtTon,
  fmtUsage,
  scopeLabel,
} from "./format";
import { STATUS_LABELS } from "./params";
import { SOURCE_TYPE_LABELS } from "@/lib/emissions/source-types";
import { SCOPE_COLORS } from "./colors";

/** PDF report */

type RGB = [number, number, number];
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;

const C = {
  scope1: hex(SCOPE_COLORS.SCOPE_1),
  scope2: hex(SCOPE_COLORS.SCOPE_2),
  navy: hex("#2f4b7c"),
  ink: hex("#1f2937"),
  muted: hex("#6b7280"),
  grid: hex("#e5e7eb"),
  panel: hex("#f4f6f9"),
  lastYear: hex("#9ca3af"),
  warnBg: hex("#fff7e6"),
  warnInk: hex("#92400e"),
  white: [255, 255, 255] as RGB,
};
const scopeColor = (s: "SCOPE_1" | "SCOPE_2") => (s === "SCOPE_1" ? C.scope1 : C.scope2);

const PAGE_W = 210;
const PAGE_H = 297;
const M = 16;
const CONTENT_W = PAGE_W - 2 * M;
const FOOTER_H = 14;
const FONT = "NunitoSans";

let fontCache: { regular: string; bold: string } | null = null;
function fonts() {
  if (!fontCache) {
    const dir = join(process.cwd(), "lib", "reports", "fonts");
    fontCache = {
      regular: readFileSync(join(dir, "NunitoSans-Regular.ttf")).toString("base64"),
      bold: readFileSync(join(dir, "NunitoSans-Bold.ttf")).toString("base64"),
    };
  }
  return fontCache;
}

export interface PdfContext {
  company: CompanyDTO | null;
  generatedBy: string;
  generatedAt: Date;
  sourceNames: Map<string, string>;
}

class Pdf {
  doc: jsPDF;
  y = M;

  constructor() {
    this.doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
    const f = fonts();
    this.doc.addFileToVFS("NunitoSans-Regular.ttf", f.regular);
    this.doc.addFileToVFS("NunitoSans-Bold.ttf", f.bold);
    this.doc.addFont("NunitoSans-Regular.ttf", FONT, "normal");
    this.doc.addFont("NunitoSans-Bold.ttf", FONT, "bold");
    this.doc.setFont(FONT, "normal");
    this.doc.setLineHeightFactor(1.3);
  }

  text(
    s: string | string[],
    x: number,
    y: number,
    o: { size?: number; bold?: boolean; color?: RGB; align?: "left" | "right" | "center"; maxWidth?: number } = {},
  ) {
    this.doc.setFont(FONT, o.bold ? "bold" : "normal");
    this.doc.setFontSize(o.size ?? 9);
    this.doc.setTextColor(...(o.color ?? C.ink));
    this.doc.text(s, x, y, { align: o.align, maxWidth: o.maxWidth, baseline: "alphabetic" });
  }

  width(s: string, size: number, bold = false) {
    this.doc.setFont(FONT, bold ? "bold" : "normal");
    this.doc.setFontSize(size);
    return this.doc.getTextWidth(s);
  }

  split(s: string, width: number, size: number, bold = false): string[] {
    this.doc.setFont(FONT, bold ? "bold" : "normal");
    this.doc.setFontSize(size);
    return this.doc.splitTextToSize(s, width) as string[];
  }

  fill(color: RGB) {
    this.doc.setFillColor(...color);
  }

  stroke(color: RGB, width = 0.2) {
    this.doc.setDrawColor(...color);
    this.doc.setLineWidth(width);
  }

  ensure(h: number) {
    if (this.y + h > PAGE_H - M - FOOTER_H) this.addPage();
  }

  addPage() {
    this.doc.addPage();
    this.y = M;
  }

  heading(title: string, subtitle?: string, keep = 30) {
    this.ensure((subtitle ? 16 : 12) + keep);
    this.y += 4;
    this.text(title, M, this.y, { size: 12.5, bold: true, color: C.navy });
    this.y += 2;
    this.stroke(C.grid, 0.3);
    this.doc.line(M, this.y, PAGE_W - M, this.y);
    this.y += 5;
    if (subtitle) {
      this.text(subtitle, M, this.y, { size: 8.5, color: C.muted });
      this.y += 5;
    }
  }

  table(opts: UserOptions) {
    const userHook = opts.didParseCell;
    autoTable(this.doc, {
      startY: this.y,
      margin: { left: M, right: M, bottom: M + FOOTER_H, top: M },
      theme: "plain",
      styles: {
        font: FONT,
        fontSize: 8,
        textColor: C.ink,
        cellPadding: { top: 1.6, bottom: 1.6, left: 2, right: 2 },
        lineColor: C.grid,
        lineWidth: { bottom: 0.15 },
        overflow: "linebreak",
      },
      headStyles: { fontStyle: "bold", fillColor: C.panel, textColor: C.ink, lineWidth: 0 },
      footStyles: { fontStyle: "bold", fillColor: C.panel, textColor: C.ink, lineWidth: 0 },
      ...opts,
      didParseCell: (hook) => {
        const col = opts.columnStyles?.[hook.column.index];
        if (hook.section !== "body" && col?.halign === "right") hook.cell.styles.halign = "right";
        userHook?.(hook);
      },
    });
    this.y = (this.doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }
}

/* Charts */

function donut(
  pdf: Pdf,
  cx: number,
  cy: number,
  r: number,
  inner: number,
  segments: { value: number; color: RGB }[],
) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  if (total <= 0) return;
  let start = -Math.PI / 2;
  const visible = segments.filter((s) => s.value > 0);
  const gap = visible.length > 1 ? 0.7 / r : 0;

  for (const seg of visible) {
    const sweep = (seg.value / total) * Math.PI * 2;
    const a0 = start + gap / 2;
    const a1 = start + sweep - gap / 2;
    start += sweep;
    if (a1 <= a0) continue;

    const steps = Math.max(8, Math.ceil((a1 - a0) / (Math.PI / 90)));
    const pts: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    for (let i = steps; i >= 0; i--) {
      const a = a0 + ((a1 - a0) * i) / steps;
      pts.push([cx + inner * Math.cos(a), cy + inner * Math.sin(a)]);
    }
    const deltas = pts.slice(1).map((p, i) => [p[0] - pts[i]![0], p[1] - pts[i]![1]]);
    pdf.fill(seg.color);
    pdf.doc.lines(deltas, pts[0]![0], pts[0]![1], [1, 1], "F", true);
  }
}

function niceScale(max: number, ticks = 4): { max: number; step: number } {
  if (max <= 0) return { max: 1, step: 0.25 };
  const raw = max / ticks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)!;
  return { max: Math.ceil(max / step) * step, step };
}

const tonAxis = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 });

function monthlyChart(pdf: Pdf, data: ReportData, x: number, y: number, w: number, h: number) {
  const months = data.monthly;
  const totals = months.map((m) => Number(m.totalKg) / 1000);
  const ly = months.map((m) => Number(m.lastYearKg) / 1000);
  const { max, step } = niceScale(Math.max(...totals, ...ly));

  const axisW = 12;
  const plotX = x + axisW;
  const plotW = w - axisW;
  const plotH = h - 7;
  const baseY = y + plotH;
  const yOf = (t: number) => baseY - (t / max) * plotH;

  for (let v = 0; v <= max + 1e-9; v += step) {
    const gy = yOf(v);
    pdf.stroke(C.grid, v === 0 ? 0.3 : 0.15);
    pdf.doc.line(plotX, gy, plotX + plotW, gy);
    pdf.text(tonAxis.format(v), plotX - 1.5, gy + 1, { size: 6.5, color: C.muted, align: "right" });
  }
  pdf.text("t CO₂e", x, y - 2.5, { size: 6.5, color: C.muted });

  const slot = plotW / months.length;
  const barW = Math.min(slot * 0.62, 12);
  const showYear = months[0]!.month.slice(0, 4) !== months.at(-1)!.month.slice(0, 4);
  const labelEvery = Math.ceil(months.length / 14);

  months.forEach((m, i) => {
    const bx = plotX + slot * i + (slot - barW) / 2;
    const s1 = Number(m.scope1Kg) / 1000;
    const s2 = Number(m.scope2Kg) / 1000;
    if (s1 > 0) {
      pdf.fill(C.scope1);
      pdf.doc.rect(bx, yOf(s1), barW, baseY - yOf(s1), "F");
    }
    if (s2 > 0) {
      const top = yOf(s1 + s2);
      const bottom = yOf(s1) - (s1 > 0 ? 0.35 : 0);
      if (bottom > top) {
        pdf.fill(C.scope2);
        pdf.doc.rect(bx, top, barW, bottom - top, "F");
      }
    }
    if (i % labelEvery === 0) {
      pdf.text(monthLabel(m.month, showYear), bx + barW / 2, baseY + 4, {
        size: 6.5,
        color: C.muted,
        align: "center",
      });
    }
  });

  if (ly.some((v) => v > 0)) {
    pdf.stroke(C.lastYear, 0.45);
    pdf.doc.setLineDashPattern([1.2, 0.9], 0);
    for (let i = 1; i < months.length; i++) {
      pdf.doc.line(
        plotX + slot * (i - 0.5),
        yOf(ly[i - 1]!),
        plotX + slot * (i + 0.5),
        yOf(ly[i]!),
      );
    }
    pdf.doc.setLineDashPattern([], 0);
    months.forEach((_, i) => {
      pdf.fill(C.white);
      pdf.stroke(C.lastYear, 0.35);
      pdf.doc.circle(plotX + slot * (i + 0.5), yOf(ly[i]!), 0.7, "FD");
    });
  }

  const items: { label: string; color: RGB; dashed?: boolean }[] = [
    { label: "Zakres 1", color: C.scope1 },
    { label: "Zakres 2", color: C.scope2 },
  ];
  if (ly.some((v) => v > 0)) items.push({ label: "Rok wcześniej", color: C.lastYear, dashed: true });
  let lx = x + w;
  for (const item of [...items].reverse()) {
    const tw = pdf.width(item.label, 7);
    lx -= tw;
    pdf.text(item.label, lx, y - 2.5, { size: 7, color: C.ink });
    lx -= 4.5;
    if (item.dashed) {
      pdf.stroke(item.color, 0.45);
      pdf.doc.setLineDashPattern([1, 0.7], 0);
      pdf.doc.line(lx, y - 3.5, lx + 3.5, y - 3.5);
      pdf.doc.setLineDashPattern([], 0);
    } else {
      pdf.fill(item.color);
      pdf.doc.roundedRect(lx, y - 5, 3, 3, 0.5, 0.5, "F");
    }
    lx -= 5;
  }
}

function horizontalBars(
  pdf: Pdf,
  rows: { label: string; kg: number; share: number; color: RGB }[],
  x: number,
  w: number,
) {
  const labelW = 52;
  const valueW = 38;
  const barMax = w - labelW - valueW - 4;
  const max = Math.max(...rows.map((r) => r.kg), 1);
  for (const r of rows) {
    pdf.ensure(8);
    const y = pdf.y;
    pdf.text(r.label, x, y + 3, { size: 8.5, maxWidth: labelW - 2 });
    const bw = Math.max((r.kg / max) * barMax, 0.6);
    pdf.fill(r.color);
    pdf.doc.roundedRect(x + labelW, y, bw, 4.2, 0.6, 0.6, "F");
    pdf.text(`${fmtTon(r.kg)}  ·  ${fmtPct(r.share)}`, x + w, y + 3, { size: 8, align: "right" });
    pdf.y += 7;
  }
}

/* Sections */

function cover(pdf: Pdf, data: ReportData, ctx: PdfContext) {
  const bandH = 34;
  pdf.fill(C.navy);
  pdf.doc.rect(0, 0, PAGE_W, bandH, "F");
  pdf.text("Raport śladu węglowego", M, 16, { size: 20, bold: true, color: C.white });
  pdf.text("Emisje gazów cieplarnianych — Zakres 1 i 2 wg GHG Protocol (ESRS E1-6)", M, 24, {
    size: 9,
    color: [214, 225, 240],
  });

  pdf.y = bandH + 9;
  const company = ctx.company ? companyHeaderLines(ctx.company) : [];
  const leftW = CONTENT_W * 0.55;

  if (company.length) {
    pdf.text(company[0]!, M, pdf.y, { size: 11, bold: true, maxWidth: leftW });
    company.slice(1).forEach((line, i) => {
      pdf.text(line, M, pdf.y + 5 + i * 4.3, { size: 8.5, color: C.muted, maxWidth: leftW });
    });
  } else {
    pdf.text("Dane firmy nie zostały uzupełnione", M, pdf.y, { size: 10, color: C.muted });
  }

  const rx = M + CONTENT_W * 0.58;
  const meta: [string, string][] = [
    ["Okres", periodTitle(data.params)],
    ["Wygenerowano", ctx.generatedAt.toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" })],
    ["Przez", ctx.generatedBy],
  ];
  let my = pdf.y;
  for (const [k, v] of meta) {
    const lines = pdf.split(v, PAGE_W - M - rx - 20, 8);
    pdf.text(k, rx, my, { size: 7.5, color: C.muted });
    pdf.text(lines, rx + 20, my, { size: 8 });
    my += lines.length * 3.8 + 1.4;
  }

  pdf.y = Math.max(pdf.y + company.length * 4.3 + 2, my) + 3;
  pdf.text(`Filtry: ${filtersSummary(data.params, ctx.sourceNames).join(" · ")}`, M, pdf.y, {
    size: 7.5,
    color: C.muted,
    maxWidth: CONTENT_W,
  });
  pdf.y += 6;
}

function notices(pdf: Pdf, data: ReportData) {
  const msgs: string[] = [];
  if (includesDrafts(data.params) && data.quality.byStatus.DRAFT.count > 0) {
    msgs.push(
      `Raport zawiera ${data.quality.byStatus.DRAFT.count} niezweryfikowanych wpisów (szkiców) — ${fmtTon(data.quality.byStatus.DRAFT.kg)} CO₂e. Wartości mogą się zmienić po weryfikacji.`,
    );
  } else if (data.quality.excludedDrafts > 0) {
    msgs.push(
      `W okresie jest ${data.quality.excludedDrafts} wpisów w statusie „Szkic" (${fmtTon(data.quality.byStatus.DRAFT.kg)} CO₂e), które nie zostały ujęte w raporcie.`,
    );
  }
  for (const msg of msgs) {
    const lines = pdf.split(msg, CONTENT_W - 8, 8);
    const h = lines.length * 4 + 4;
    pdf.ensure(h + 3);
    pdf.fill(C.warnBg);
    pdf.doc.roundedRect(M, pdf.y, CONTENT_W, h, 1.2, 1.2, "F");
    pdf.text(lines, M + 4, pdf.y + 5, { size: 8, color: C.warnInk });
    pdf.y += h + 4;
  }
}

function kpis(pdf: Pdf, data: ReportData) {
  const total = Number(data.totalKg);
  const tiles: { label: string; value: string; sub: string; color?: RGB }[] = [
    {
      label: "Emisja łączna",
      value: fmtTon(data.totalKg),
      sub: `${data.entryCount} wpisów · ${data.sourceCount} źródeł`,
    },
    {
      label: "Zakres 1",
      value: fmtTon(data.scope1Kg),
      sub: `${fmtPct(total ? (Number(data.scope1Kg) / total) * 100 : 0)} emisji`,
      color: C.scope1,
    },
    {
      label: "Zakres 2",
      value: fmtTon(data.scope2Kg),
      sub: `${fmtPct(total ? (Number(data.scope2Kg) / total) * 100 : 0)} emisji`,
      color: C.scope2,
    },
    {
      label: "Zmiana rok do roku",
      value: fmtChange(data.lastYear.changePct),
      sub: `vs ${formatRange(data.lastYear.from, data.lastYear.to)}`,
    },
  ];

  const gap = 3;
  const w = (CONTENT_W - gap * 3) / 4;
  const h = 21;
  pdf.ensure(h + 4);
  tiles.forEach((t, i) => {
    const x = M + i * (w + gap);
    pdf.fill(C.panel);
    pdf.doc.roundedRect(x, pdf.y, w, h, 1.5, 1.5, "F");
    if (t.color) {
      pdf.fill(t.color);
      pdf.doc.roundedRect(x + 3.5, pdf.y + 3.6, 2.4, 2.4, 0.4, 0.4, "F");
    }
    pdf.text(t.label, x + (t.color ? 7.5 : 3.5), pdf.y + 5.6, { size: 7.5, color: C.muted });
    pdf.text(`${t.value}${t.label.startsWith("Zmiana") ? "" : " CO₂e"}`, x + 3.5, pdf.y + 12.6, {
      size: 12,
      bold: true,
    });
    pdf.text(t.sub, x + 3.5, pdf.y + 17.6, { size: 6.8, color: C.muted, maxWidth: w - 6 });
  });
  pdf.y += h + 6;
}

function scopeAndComparison(pdf: Pdf, data: ReportData) {
  pdf.heading("Podział na zakresy i porównanie okresów");
  const blockH = 44;
  pdf.ensure(blockH);
  const top = pdf.y;

  const s1 = Number(data.scope1Kg);
  const s2 = Number(data.scope2Kg);
  const total = s1 + s2;
  const cx = M + 19;
  const cy = top + 19;
  if (total > 0) {
    donut(pdf, cx, cy, 18, 11, [
      { value: s1, color: C.scope1 },
      { value: s2, color: C.scope2 },
    ]);
    pdf.text(fmtTon(data.totalKg), cx, cy + 0.6, { size: 8, bold: true, align: "center" });
    pdf.text("CO₂e", cx, cy + 4, { size: 6.5, color: C.muted, align: "center" });
  }
  [
    { label: "Zakres 1 — emisje bezpośrednie", kg: s1, color: C.scope1 },
    { label: "Zakres 2 — energia zakupiona", kg: s2, color: C.scope2 },
  ].forEach((item, i) => {
    const ly = top + 10 + i * 13;
    pdf.fill(item.color);
    pdf.doc.roundedRect(M + 42, ly - 2.6, 3, 3, 0.5, 0.5, "F");
    pdf.text(item.label, M + 47, ly, { size: 8 });
    pdf.text(`${fmtTon(item.kg)} · ${fmtPct(total ? (item.kg / total) * 100 : 0)}`, M + 47, ly + 4.4, {
      size: 8.5,
      bold: true,
    });
  });

  const tx = M + CONTENT_W * 0.5;
  pdf.y = top;
  const row = (label: string, c: { totalKg: string; scope1Kg: string; scope2Kg: string }, change?: string): RowInput => [
    label,
    fmtTon(c.scope1Kg),
    fmtTon(c.scope2Kg),
    fmtTon(c.totalKg),
    change ?? "",
  ];
  pdf.table({
    margin: { left: tx, right: M, bottom: M + FOOTER_H },
    head: [["Okres", "Zakres 1", "Zakres 2", "Razem", "Zmiana"]],
    body: [
      row(`Raport\n${formatRange(data.params.from, data.params.to)}`, data),
      row(`Poprzedni okres\n${formatRange(data.previous.from, data.previous.to)}`, data.previous, fmtChange(data.previous.changePct)),
      row(`Rok wcześniej\n${formatRange(data.lastYear.from, data.lastYear.to)}`, data.lastYear, fmtChange(data.lastYear.changePct)),
    ],
    styles: { font: FONT, fontSize: 7, cellPadding: 1.4, textColor: C.ink, lineColor: C.grid, lineWidth: { bottom: 0.15 } },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
  });
  pdf.text("Zmiana liczona dla sumy obu zakresów.", tx, pdf.y - 2, { size: 6.5, color: C.muted });
  pdf.y = Math.max(pdf.y + 2, top + blockH);
}

function monthlySection(pdf: Pdf, data: ReportData) {
  pdf.heading(
    "Emisja w poszczególnych miesiącach",
    "Każdy wpis liczony w miesiącu daty wpisu (koniec okresu rozliczeniowego faktury).",
  );
  const h = 62;
  pdf.ensure(h + 8);
  pdf.y += 5;
  monthlyChart(pdf, data, M, pdf.y, CONTENT_W, h);
  pdf.y += h + 4;
}

function breakdowns(pdf: Pdf, data: ReportData) {
  pdf.heading("Emisja według kategorii źródeł");
  horizontalBars(
    pdf,
    data.byType.map((t) => ({
      label: t.label,
      kg: Number(t.kg),
      share: t.sharePct,
      color: scopeColor(t.scope),
    })),
    M,
    CONTENT_W,
  );
  pdf.y += 2;

  pdf.table({
    head: [["Kategoria", "Zakres", "Zużycie", "Wpisy", "CO₂e"]],
    body: data.byType.map((t) => [t.label, scopeLabel(t.scope), fmtUsage(t.usage), String(t.entryCount), fmtTon(t.kg)]),
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" } },
  });

  pdf.heading("Emisja według źródeł", "Ilość w jednostce wskaźnika emisji, po przeliczeniu jednostek z faktur.");
  const body: RowInput[] = [];
  for (const scope of ["SCOPE_1", "SCOPE_2"] as const) {
    const list = data.bySource.filter((s) => s.scope === scope);
    if (!list.length) continue;
    const kg = scope === "SCOPE_1" ? data.scope1Kg : data.scope2Kg;
    const groupStyle = { fontStyle: "bold" as const, fillColor: [250, 251, 252] as RGB };
    body.push([
      { content: scopeLabel(scope), colSpan: 4, styles: { ...groupStyle, textColor: scopeColor(scope) } },
      { content: fmtKg(kg), styles: { ...groupStyle, halign: "right" } },
      { content: fmtTon(kg), styles: { ...groupStyle, halign: "right" } },
      { content: fmtPct(Number(data.totalKg) ? (Number(kg) / Number(data.totalKg)) * 100 : 0), styles: { ...groupStyle, halign: "right" } },
    ]);
    for (const s of list) {
      body.push([
        s.name,
        SOURCE_TYPE_LABELS[s.type],
        fmtUsage(s.usage),
        s.factors.map((f) => `${fmtFactor(f.value)} ${f.unit}`).join("\n"),
        fmtKg(s.kg),
        fmtTon(s.kg),
        fmtPct(s.sharePct),
      ] satisfies CellInput[]);
    }
  }
  pdf.table({
    head: [["Źródło", "Kategoria", "Zużycie", "Wskaźnik", "CO₂e [kg]", "CO₂e [t]", "Udział"]],
    body,
    foot: [["Razem", "", "", "", fmtKg(data.totalKg), fmtTon(data.totalKg), "100%"]],
    columnStyles: {
      0: { cellWidth: 38 },
      3: { cellWidth: 28 },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
    },
  });
}

function factorsAndQuality(pdf: Pdf, data: ReportData) {
  pdf.heading("Zastosowane wskaźniki emisji", "Wartości z chwili zapisu wpisu (migawka) — późniejsze zmiany wskaźników nie zmieniają raportu.");
  pdf.table({
    head: [["Wskaźnik", "Pochodzenie", "Zakres", "Wartość", "Wpisy"]],
    body: data.factors.map((f) => [
      f.name,
      ORIGIN_LABELS[f.origin],
      scopeLabel(f.scope),
      `${fmtFactor(f.value)} ${f.unit}`,
      String(f.entryCount),
    ]),
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" } },
  });

  pdf.heading("Jakość danych");
  const q = data.quality;
  pdf.table({
    head: [["Status wpisu", "Liczba wpisów", "CO₂e", "W raporcie"]],
    body: (["VERIFIED", "CORRECTED", "DRAFT"] as const).map((s) => [
      STATUS_LABELS[s],
      String(q.byStatus[s].count),
      fmtTon(q.byStatus[s].kg),
      data.params.statuses.includes(s) ? "tak" : "nie",
    ]),
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
  });
  const facts = [
    q.verifiedSharePct !== null
      ? `${fmtPct(q.verifiedSharePct)} emisji w okresie pochodzi z wpisów zweryfikowanych lub skorygowanych.`
      : "Brak wpisów w okresie.",
    q.withoutInvoice > 0
      ? `${q.withoutInvoice} wpisów w raporcie nie ma powiązanej faktury.`
      : "Wszystkie wpisy w raporcie mają powiązaną fakturę.",
  ];
  pdf.ensure(12);
  facts.forEach((f) => {
    pdf.text(`•  ${f}`, M, pdf.y, { size: 8.5, maxWidth: CONTENT_W });
    pdf.y += 5;
  });
}

function methodology(pdf: Pdf) {
  pdf.heading("Metodologia");
  const paragraphs = [
    "Raport obejmuje emisje gazów cieplarnianych w Zakresie 1 (emisje bezpośrednie ze spalania paliw w instalacjach stacjonarnych i pojazdach firmowych) oraz Zakresie 2 (emisje pośrednie z zakupionej energii elektrycznej, ciepła i chłodu), zgodnie z GHG Protocol Corporate Standard oraz wymogiem ujawnienia ESRS E1-6.",
    "Emisję obliczono jako iloczyn zużycia i wskaźnika emisji: CO₂e [kg] = ilość × wskaźnik. Zużycie pochodzi z faktur (import KSeF lub wprowadzenie ręczne); jednostki z dokumentów przeliczono na jednostkę mianownika wskaźnika. Obliczenia wykonywane są na liczbach dziesiętnych bez zaokrągleń pośrednich.",
    "Zakres 2 raportowany jest metodą lokalizacyjną (location-based) — z użyciem średnich krajowych wskaźników emisyjności (KOBiZE) dla energii elektrycznej i ciepła. Wskaźniki oznaczone jako „GHG Protocol” pochodzą z tabel GHG Protocol, a „Własny” zostały wprowadzone przez organizację.",
    "Wpis jest przypisany w całości do miesiąca swojej daty (koniec okresu rozliczeniowego faktury, a gdy go brak — data wystawienia).",
  ];
  for (const p of paragraphs) {
    const lines = pdf.split(p, CONTENT_W, 8.5);
    pdf.ensure(lines.length * 4 + 2);
    pdf.text(lines, M, pdf.y, { size: 8.5 });
    pdf.y += lines.length * 4 + 3;
  }
}

function invoicesAppendix(pdf: Pdf, data: ReportData) {
  if (!data.invoices.length) return;
  pdf.addPage();
  pdf.heading("Załącznik: faktury ujęte w raporcie", `${data.invoices.length} faktur`);
  pdf.table({
    head: [["Numer faktury", "Dostawca", "Okres rozliczeniowy", "Pozycje", "CO₂e"]],
    body: data.invoices.map((i) => [
      i.invoiceNumber,
      i.supplierName ?? "—",
      i.periodStart && i.periodEnd ? formatRange(i.periodStart, i.periodEnd) : "—",
      String(i.entryCount),
      fmtTon(i.kg),
    ]),
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" } },
  });
}

function footers(pdf: Pdf, ctx: PdfContext) {
  const pages = pdf.doc.getNumberOfPages();
  const name = ctx.company?.shortName || ctx.company?.name;
  const stamp = ctx.generatedAt.toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" });
  for (let i = 1; i <= pages; i++) {
    pdf.doc.setPage(i);
    const y = PAGE_H - M + 4;
    pdf.stroke(C.grid, 0.2);
    pdf.doc.line(M, y - 5, PAGE_W - M, y - 5);
    pdf.text(
      `Wygenerowano automatycznie przez system śladu węglowego${name ? ` ${name}` : ""} · ${stamp}`,
      M,
      y,
      { size: 6.8, color: C.muted },
    );
    pdf.text(`Strona ${i} z ${pages}`, PAGE_W - M, y, { size: 6.8, color: C.muted, align: "right" });
  }
}

export function renderReportPdf(data: ReportData, ctx: PdfContext): Uint8Array {
  const pdf = new Pdf();
  cover(pdf, data, ctx);
  notices(pdf, data);
  kpis(pdf, data);

  if (data.entryCount === 0) {
    pdf.heading("Brak danych");
    pdf.text("W wybranym okresie i filtrach nie ma wpisów emisyjnych.", M, pdf.y, { size: 9, color: C.muted });
    pdf.y += 8;
    methodology(pdf);
  } else {
    scopeAndComparison(pdf, data);
    monthlySection(pdf, data);
    pdf.addPage();
    breakdowns(pdf, data);
    factorsAndQuality(pdf, data);
    methodology(pdf);
    invoicesAppendix(pdf, data);
  }

  footers(pdf, ctx);
  return new Uint8Array(pdf.doc.output("arraybuffer"));
}
