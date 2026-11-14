import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

const DOCS_DIR = path.join(process.cwd(), "docs");

export interface ManualHeading {
  id: string;
  title: string;
}

export interface ManualChapter {
  id: string;
  title: string;
  body: string;
  headings: ManualHeading[];
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function headingId(chapterId: string, text: string): string {
  return `${chapterId}--${slugify(text)}`;
}

function parseChapter(source: string): ManualChapter {
  const match = source.match(/^#\s+(.+)\r?\n/);
  const title = match?.[1]?.trim() ?? "Bez tytułu";
  const body = match ? source.slice(match[0].length) : source;
  const id = slugify(title);
  const headings = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => ({
    id: headingId(id, m[1]!),
    title: m[1]!.trim(),
  }));
  return { id, title, body, headings };
}

async function loadChapters(folder: string): Promise<ManualChapter[]> {
  const dir = path.join(DOCS_DIR, folder);
  const files = (await readdir(dir)).filter((f) => f.endsWith(".md")).sort();
  const sources = await Promise.all(files.map((f) => readFile(path.join(dir, f), "utf8")));
  return sources.map(parseChapter);
}

export const loadManual = cache(() => loadChapters("manual"));

export const loadTechnicalDocs = cache(() => loadChapters("technical"));
