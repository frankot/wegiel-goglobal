import { Card } from "@/components/ui/card";
import { FieldSkeleton } from "@/components/ui/skeleton";

const SECTIONS = [
  {
    title: "Dane identyfikacyjne",
    fields: [
      { label: "Pełna nazwa", wide: true },
      { label: "Nazwa skrócona", wide: true },
      { label: "NIP" },
      { label: "REGON" },
      { label: "KRS" },
    ],
  },
  {
    title: "Adres",
    fields: [{ label: "Ulica i numer", wide: true }, { label: "Kod pocztowy" }, { label: "Miejscowość" }, { label: "Kraj" }],
  },
];

export function CompanySkeleton() {
  return (
    <Card className="space-y-6 p-5">
      {SECTIONS.map((s) => (
        <section key={s.title} className="space-y-3">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{s.title}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {s.fields.map((f) => (
              <FieldSkeleton key={f.label} label={f.label} className={f.wide ? "sm:col-span-2" : undefined} />
            ))}
          </div>
        </section>
      ))}
    </Card>
  );
}
