import { Card } from "@/components/ui/card";
import { FieldSkeleton, PillSkeleton, Skeleton, SkeletonText, TableSkeleton } from "@/components/ui/skeleton";

export function InviteFormSkeleton() {
  return (
    <Card className="px-5">
      <div>
        <h2 className="text-[0.9375rem] text-strong">Zaproś użytkownika</h2>
        <p className="text-[0.8125rem] text-muted-foreground">
          Osoba otrzyma e-mail z linkiem do ustawienia hasła. Link jest ważny 7 dni.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-start">
        <FieldSkeleton label="Adres e-mail" />
        <FieldSkeleton label="Rola" />
        <PillSkeleton className="h-8 w-44 sm:mt-6" />
      </div>
      <div className="-mt-2">
        <SkeletonText size="xs" className="w-80" />
      </div>
    </Card>
  );
}

export function UserTableSkeleton() {
  return (
    <Card className="p-0 pt-4">
      <div className="px-5">
        <h2 className="text-[0.9375rem] text-strong">Użytkownicy</h2>
        <p className="text-[0.8125rem] text-muted-foreground">
          Dezaktywowane konto nie może się zalogować, ale jego wpisy zostają w historii.
        </p>
      </div>
      <TableSkeleton
        rows={4}
        columns={[
          { label: "Użytkownik", cell: "two", widths: ["w-32", "w-40", "w-28"], sub: ["w-44", "w-36"] },
          { label: "Rola", widths: ["w-20", "w-16"] },
          { label: "Status", cell: "dot", widths: ["w-16", "w-20"] },
          { label: "Akcje", align: "right", cell: "actions" },
        ]}
      />
    </Card>
  );
}

export function AuditFiltersSkeleton() {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <FieldSkeleton label="Użytkownik" input="w-40" />
      <FieldSkeleton label="Obiekt" input="w-36" />
      <FieldSkeleton label="Akcja" input="w-32" />
      <FieldSkeleton label="Od" input="w-40" />
      <FieldSkeleton label="Do" input="w-40" />
    </div>
  );
}

const ROWS = ["w-64", "w-48", "w-80", "w-56", "w-72", "w-40", "w-60", "w-52", "w-72", "w-44", "w-64", "w-56"];

export function AuditListSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="gap-0 p-0">
        <div className="hidden grid-cols-[9.5rem_12rem_minmax(0,1fr)] gap-4 border-b border-border px-5 py-2.5 text-[0.8125rem] text-strong md:grid">
          <span>Data</span>
          <span>Użytkownik</span>
          <span>Zdarzenie</span>
        </div>
        <ul className="divide-y divide-border">
          {ROWS.map((w, i) => (
            <li key={i} className="grid gap-x-4 gap-y-0.5 px-5 py-2.5 md:grid-cols-[9.5rem_12rem_minmax(0,1fr)]">
              <SkeletonText className="w-28" />
              <SkeletonText className={i % 3 ? "w-24" : "w-36"} />
              <span className="flex items-center gap-1.5">
                <Skeleton className="size-3.5 shrink-0 rounded-[3px]" />
                <SkeletonText className={w} />
                <SkeletonText size="xs" className="w-24" />
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <SkeletonText className="w-32" />
    </div>
  );
}
