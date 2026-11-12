import Link from "next/link";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { headingId } from "@/lib/manual/load";

const MANAGER_TAG = "Tylko Analityk";

function textOf(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return "";
}

function components(chapterId: string): Components {
  return {
    h2: ({ children }) => (
      <h3
        id={headingId(chapterId, textOf(children))}
        className="mt-8 scroll-mt-6 text-base font-semibold text-strong first:mt-0"
      >
        {children}
      </h3>
    ),
    h3: ({ children }) => (
      <h4 className="mt-5 text-sm font-semibold text-strong">{children}</h4>
    ),
    p: ({ children }) => <p className="mt-3 leading-relaxed">{children}</p>,
    ul: ({ children }) => <ul className="mt-3 list-disc space-y-1.5 pl-5">{children}</ul>,
    ol: ({ children }) => <ol className="mt-3 list-decimal space-y-1.5 pl-5">{children}</ol>,
    li: ({ children }) => <li className="pl-1 leading-relaxed [&>ul]:mt-1.5">{children}</li>,
    strong: ({ children }) =>
      textOf(children) === MANAGER_TAG ? (
        <Badge className="mr-1 bg-navy/10 align-[1px] text-navy">{MANAGER_TAG}</Badge>
      ) : (
        <strong className="font-semibold text-strong">{children}</strong>
      ),
    a: ({ href = "", children }) =>
      href.startsWith("/") || href.startsWith("#") ? (
        <Link href={href} className="text-primary underline-offset-4 hover:underline">
          {children}
        </Link>
      ) : (
        <a href={href} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
          {children}
        </a>
      ),
    blockquote: ({ children }) => (
      <blockquote className="mt-4 rounded-sm border-l-[3px] border-blue bg-muted px-4 py-1 pb-3 text-strong">
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="mt-4 overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-left text-[0.8125rem]">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="border-b border-border bg-muted/60 text-xs text-muted-foreground">{children}</thead>
    ),
    th: ({ children }) => <th className="px-3 py-2 font-medium">{children}</th>,
    tr: ({ children }) => <tr className="border-b border-border last:border-0">{children}</tr>,
    td: ({ children }) => <td className="px-3 py-2 align-top">{children}</td>,
    code: ({ children }) => (
      <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.8125rem]">{children}</code>
    ),
  };
}

export function ManualMarkdown({ chapterId, body }: { chapterId: string; body: string }) {
  return (
    <Markdown remarkPlugins={[remarkGfm]} components={components(chapterId)}>
      {body}
    </Markdown>
  );
}
