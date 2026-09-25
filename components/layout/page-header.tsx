/**
 * Opis strony pod górnym paskiem. Tytuł mieszka w `Topbar` (z `nav.ts`),
 * akcje strony — w `<TopbarActions>`.
 */
export function PageHeader({ description }: { description: React.ReactNode }) {
  return <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>;
}
