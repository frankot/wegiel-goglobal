"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, type SelectItem } from "@/components/ui/select";

interface Props {
  users: SelectItem[];
  entities: SelectItem[];
  actions: SelectItem[];
}

const FIELDS = ["uzytkownik", "obiekt", "akcja", "od", "do"] as const;

export function AuditFilters({ users, entities, actions }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  function set(key: (typeof FIELDS)[number], value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("strona");
    start(() => router.push(`${pathname}${next.size ? `?${next}` : ""}`));
  }

  const any = FIELDS.some((f) => params.get(f));
  const all = (label: string, items: SelectItem[]) => [{ value: "", label }, ...items];

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="f-user">Użytkownik</Label>
        <Select id="f-user" items={all("Wszyscy", users)} value={params.get("uzytkownik") ?? ""} onValueChange={(v) => set("uzytkownik", v)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="f-entity">Obiekt</Label>
        <Select id="f-entity" items={all("Wszystkie", entities)} value={params.get("obiekt") ?? ""} onValueChange={(v) => set("obiekt", v)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="f-action">Akcja</Label>
        <Select id="f-action" items={all("Wszystkie", actions)} value={params.get("akcja") ?? ""} onValueChange={(v) => set("akcja", v)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="f-from">Od</Label>
        <Input id="f-from" type="date" className="w-40" value={params.get("od") ?? ""} onChange={(e) => set("od", e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="f-to">Do</Label>
        <Input id="f-to" type="date" className="w-40" value={params.get("do") ?? ""} onChange={(e) => set("do", e.target.value)} />
      </div>
      {any && (
        <Button variant="ghost" size="sm" onClick={() => start(() => router.push(pathname))}>
          <RotateCcw aria-hidden="true" />
          Wyczyść filtry
        </Button>
      )}
      {pending && <Loader2 className="mb-2 size-4 animate-spin text-muted-foreground" aria-label="Odświeżanie" />}
    </div>
  );
}
