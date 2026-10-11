"use client";

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthPoint } from "@/lib/reports/aggregate";
import { monthLabel } from "@/lib/reports/params";
import { fmtTon } from "@/lib/reports/format";
import { SCOPE_COLORS } from "@/lib/reports/colors";

const INK = "#1f2937";
const MUTED = "#6b7280";
const GRID = "#e5e7eb";
const LAST_YEAR = "#9ca3af";

const axisTon = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 });

interface MonthDatum {
  month: string;
  label: string;
  scope1: number;
  scope2: number;
  lastYear: number;
  raw: MonthPoint;
}

function MonthTooltip({ active, payload }: { active?: boolean; payload?: { payload: MonthDatum }[] }) {
  const d = active ? payload?.[0]?.payload : undefined;
  if (!d) return null;
  const rows: [string, string, string | null][] = [
    ["Zakres 1", fmtTon(d.raw.scope1Kg), SCOPE_COLORS.SCOPE_1],
    ["Zakres 2", fmtTon(d.raw.scope2Kg), SCOPE_COLORS.SCOPE_2],
    ["Razem", fmtTon(d.raw.totalKg), null],
  ];
  return (
    <div className="rounded-md border border-input bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold text-strong">{monthLabel(d.month)}</p>
      {rows.map(([label, value, color]) => (
        <p key={label} className="flex items-center justify-between gap-4 tabular-nums">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            {color && <span className="inline-block size-2 rounded-[2px]" style={{ background: color }} />}
            {label}
          </span>
          <span className={color ? "text-foreground" : "font-semibold text-strong"}>{value}</span>
        </p>
      ))}
      {Number(d.raw.lastYearKg) > 0 && (
        <p className="mt-1 flex justify-between gap-4 border-t pt-1 tabular-nums text-muted-foreground">
          <span>Rok wcześniej</span>
          <span>{fmtTon(d.raw.lastYearKg)}</span>
        </p>
      )}
    </div>
  );
}

export function MonthlyChart({ data, height = 260 }: { data: MonthPoint[]; height?: number }) {
  const spansYears = data[0]?.month.slice(0, 4) !== data.at(-1)?.month.slice(0, 4);
  const chartData: MonthDatum[] = data.map((m) => ({
    month: m.month,
    label: monthLabel(m.month, spansYears),
    scope1: Number(m.scope1Kg) / 1000,
    scope2: Number(m.scope2Kg) / 1000,
    lastYear: Number(m.lastYearKg) / 1000,
    raw: m,
  }));
  const hasLastYear = chartData.some((d) => d.lastYear > 0);

  return (
    <div>
      <ul className="mb-2 flex flex-wrap justify-end gap-x-4 gap-y-1 text-xs text-foreground" aria-label="Legenda">
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-[2px]" style={{ background: SCOPE_COLORS.SCOPE_1 }} />
          Zakres 1
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-[2px]" style={{ background: SCOPE_COLORS.SCOPE_2 }} />
          Zakres 2
        </li>
        {hasLastYear && (
          <li className="flex items-center gap-1.5">
            <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: LAST_YEAR }} />
            Rok wcześniej
          </li>
        )}
      </ul>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: GRID }}
            tick={{ fontSize: 11, fill: MUTED }}
            interval="preserveStartEnd"
            minTickGap={8}
          />
          <YAxis
            width={44}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: MUTED }}
            tickFormatter={(v: number) => axisTon.format(v)}
            label={{ value: "t CO₂e", position: "insideTopLeft", dy: -4, fontSize: 11, fill: MUTED }}
          />
          <Tooltip content={<MonthTooltip />} cursor={{ fill: "rgb(74 159 232 / 0.08)" }} />
          <Bar dataKey="scope1" stackId="s" fill={SCOPE_COLORS.SCOPE_1} stroke="#fff" strokeWidth={1} isAnimationActive={false} />
          <Bar
            dataKey="scope2"
            stackId="s"
            fill={SCOPE_COLORS.SCOPE_2}
            stroke="#fff"
            strokeWidth={1}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
          {hasLastYear && (
            <Line
              dataKey="lastYear"
              type="monotone"
              stroke={LAST_YEAR}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 3, fill: "#fff", stroke: LAST_YEAR, strokeWidth: 1.5 }}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ScopeDonut({
  scope1Kg,
  scope2Kg,
  totalKg,
}: {
  scope1Kg: string;
  scope2Kg: string;
  totalKg: string;
}) {
  const data = [
    { name: "Zakres 1", value: Number(scope1Kg), color: SCOPE_COLORS.SCOPE_1 },
    { name: "Zakres 2", value: Number(scope2Kg), color: SCOPE_COLORS.SCOPE_2 },
  ].filter((d) => d.value > 0);

  return (
    <div className="relative size-40 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius="64%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            paddingAngle={data.length > 1 ? 1.5 : 0}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
        <span className="text-sm font-bold text-strong tabular-nums">{fmtTon(totalKg)}</span>
        <span className="text-[0.6875rem]" style={{ color: INK }}>
          CO₂e
        </span>
      </div>
    </div>
  );
}
