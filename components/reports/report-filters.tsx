"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { SOURCE_TYPE_LABELS, type Scope, type SourceType } from "@/lib/emissions/source-types";
import {
  DEFAULT_STATUSES,
  PRESETS,
  STATUS_LABELS,
  presetRange,
  reportParamsToSearch,
  type EntryStatus,
  type ReportParams,
} from "@/lib/reports/params";
import { SCOPE_COLORS } from "@/lib/reports/colors";

interface SourceOption {
  id: string;
  name: string;
  type: SourceType;
  scope: Scope;
  active: boolean;
}

interface Props {
  params: ReportParams;
  sources: SourceOption[];
}

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "h-7 cursor-pointer rounded-full border px-3 text-xs whitespace-nowrap transition-colors",
        pressed
          ? "border-primary bg-primary/10 font-semibold text-strong"
          : "border-input bg-card text-muted-foreground hover:border-[#c9d2de] hover:text-strong",
      )}
    >
      {children}
    </button>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-semibold text-foreground">{label}</span>
      {children}
    </div>
  );
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function ReportFilters({ params, sources }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [p, setP] = useState(params);
  const [synced, setSynced] = useState(params);
  if (synced !== params) {
    setSynced(params);
    setP(params);
  }

  function apply(next: ReportParams) {
    setP(next);
    startTransition(() => {
      router.replace(`${pathname}?${reportParamsToSearch(next).toString()}`, { scroll: false });
    });
  }

  const allScopes = p.scopes.length === 0;
  const visibleTypes = (Object.keys(SOURCE_TYPE_LABELS) as SourceType[]).filter(
    (t) => allScopes || sources.some((s) => s.type === t && p.scopes.includes(s.scope)) ||
      p.types.includes(t),
  );
  const visibleSources = sources.filter(
    (s) => (allScopes || p.scopes.includes(s.scope)) && (p.types.length === 0 || p.types.includes(s.type)),
  );
  const isDefault =
    p.preset === "currentYear" &&
    !p.scopes.length &&
    !p.types.length &&
    !p.sourceIds.length &&
    p.statuses.length === DEFAULT_STATUSES.length &&
    DEFAULT_STATUSES.every((s) => p.statuses.includes(s));

  return (
    <div className="space-y-3 rounded-sm bg-card px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Group label="Okres">
          {PRESETS.map((preset) => (
            <Chip
              key={preset.id}
              pressed={p.preset === preset.id}
              onClick={() => apply({ ...p, preset: preset.id, ...presetRange(preset.id, new Date()) })}
            >
              {preset.label}
            </Chip>
          ))}
        </Group>

        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            aria-label="Od"
            value={p.from}
            max={p.to}
            onChange={(e) => e.target.value && apply({ ...p, preset: "custom", from: e.target.value })}
            className="h-7 w-[8.5rem] text-xs"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <Input
            type="date"
            aria-label="Do"
            value={p.to}
            min={p.from}
            onChange={(e) => e.target.value && apply({ ...p, preset: "custom", to: e.target.value })}
            className="h-7 w-[8.5rem] text-xs"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Odświeżanie" />}
          {!isDefault && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                apply({
                  ...presetRange("currentYear", new Date()),
                  preset: "currentYear",
                  scopes: [],
                  types: [],
                  sourceIds: [],
                  statuses: DEFAULT_STATUSES,
                })
              }
            >
              <RotateCcw aria-hidden="true" />
              Wyczyść filtry
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Group label="Zakres">
          {(["SCOPE_1", "SCOPE_2"] as const).map((scope) => (
            <Chip
              key={scope}
              pressed={p.scopes.includes(scope)}
              onClick={() => {
                const scopes = toggle(p.scopes, scope);
                apply({ ...p, scopes: scopes.length === 2 ? [] : scopes, sourceIds: [] });
              }}
            >
              <span
                aria-hidden="true"
                className="mr-1.5 inline-block size-2 rounded-[2px]"
                style={{ background: SCOPE_COLORS[scope] }}
              />
              {scope === "SCOPE_1" ? "Zakres 1" : "Zakres 2"}
            </Chip>
          ))}
        </Group>

        <Group label="Kategoria">
          {visibleTypes.map((type) => (
            <Chip
              key={type}
              pressed={p.types.includes(type)}
              onClick={() => apply({ ...p, types: toggle(p.types, type), sourceIds: [] })}
            >
              {SOURCE_TYPE_LABELS[type]}
            </Chip>
          ))}
        </Group>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Group label="Źródła">
          <details className="group relative">
            <summary className="flex h-7 cursor-pointer list-none items-center gap-1.5 rounded-full border border-input bg-card px-3 text-xs text-strong hover:border-[#c9d2de] [&::-webkit-details-marker]:hidden">
              {p.sourceIds.length === 0
                ? "Wszystkie źródła"
                : p.sourceIds.length === 1
                  ? sources.find((s) => s.id === p.sourceIds[0])?.name ?? "1 źródło"
                  : `Wybrane: ${p.sourceIds.length}`}
              <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="absolute z-20 mt-1 max-h-72 w-72 overflow-y-auto rounded-md border border-input bg-card p-2 shadow-lg">
              {visibleSources.length === 0 && (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">Brak źródeł dla wybranych filtrów.</p>
              )}
              {visibleSources.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted"
                >
                  <Checkbox
                    checked={p.sourceIds.includes(s.id)}
                    onCheckedChange={() => apply({ ...p, sourceIds: toggle(p.sourceIds, s.id) })}
                  />
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  {!s.active && <span className="text-[0.6875rem] text-muted-foreground">nieaktywne</span>}
                </label>
              ))}
              {p.sourceIds.length > 0 && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="mt-1 px-2!"
                  onClick={() => apply({ ...p, sourceIds: [] })}
                >
                  Wyczyść wybór
                </Button>
              )}
            </div>
          </details>
        </Group>

        <Group label="Status wpisów">
          {(Object.keys(STATUS_LABELS) as EntryStatus[]).map((status) => (
            <Chip
              key={status}
              pressed={p.statuses.includes(status)}
              onClick={() => {
                const next = toggle(p.statuses, status);
                apply({ ...p, statuses: next.length ? next : DEFAULT_STATUSES });
              }}
            >
              {STATUS_LABELS[status]}
            </Chip>
          ))}
        </Group>
      </div>
    </div>
  );
}
