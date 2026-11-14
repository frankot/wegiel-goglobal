"use client";

import { useEffect, useId, useState } from "react";

/** Mermaid diagram */
export function MermaidDiagram({ chart }: { chart: string }) {
  const id = `mermaid-${useId().replace(/[^\w-]/g, "")}`;
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("mermaid")
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "strict", fontFamily: "inherit" });
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled) setSvg(svg);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [id, chart]);

  if (failed || !svg) {
    return (
      <pre className="mt-4 overflow-x-auto rounded-sm bg-muted p-4 font-mono text-xs text-muted-foreground">
        {failed ? chart : "Wczytywanie diagramu…"}
      </pre>
    );
  }
  return (
    <div
      role="img"
      aria-label="Diagram"
      className="mt-4 overflow-x-auto rounded-sm border border-border bg-white p-4 [&_svg]:mx-auto [&_svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
