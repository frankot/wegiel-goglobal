import { getCurrentUser } from "@/lib/db/users";
import { loadManual } from "@/lib/manual/load";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { ManualMarkdown } from "@/components/manual/manual-markdown";

export default async function ManualPage() {
  await getCurrentUser();
  const chapters = await loadManual();

  return (
    <div className="space-y-4">
      <PageHeader description="Jak korzystać z systemu krok po kroku — od pierwszego logowania po eksport raportu." />

      <div className="grid items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav
          aria-label="Spis treści"
          className="rounded-sm bg-card p-4 text-sm lg:sticky lg:top-6 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto"
        >
          <p className="mb-2 text-[0.625rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            Spis treści
          </p>
          <ol className="space-y-2">
            {chapters.map((c, i) => (
              <li key={c.id}>
                <a href={`#${c.id}`} className="font-medium text-strong hover:text-primary">
                  <span className="mr-1.5 tabular-nums text-muted-foreground">{i + 1}.</span>
                  {c.title}
                </a>
                {c.headings.length > 0 && (
                  <ul className="mt-1 hidden space-y-1 border-l border-border pl-3 text-[0.8125rem] lg:block">
                    {c.headings.map((h) => (
                      <li key={h.id}>
                        <a href={`#${h.id}`} className="text-muted-foreground hover:text-primary">
                          {h.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-4">
          {chapters.map((c, i) => (
            <Card key={c.id} id={c.id} className="scroll-mt-6 px-5 py-6 sm:px-8 sm:py-8">
              <article className="max-w-3xl text-sm text-foreground">
                <h2 className="text-xl font-semibold tracking-tight text-strong">
                  <span className="mr-2 tabular-nums text-muted-foreground">{i + 1}.</span>
                  {c.title}
                </h2>
                <ManualMarkdown chapterId={c.id} body={c.body} />
              </article>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
