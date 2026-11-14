import "server-only";
import { del, get, put } from "@vercel/blob";

export interface StoredFile {
  kind: "SOURCE_XML" | "EVIDENCE_PDF";
  fileName: string;
  mimeType: string;
  blobUrl: string;
}

/* Private blob storage */

export function isBlobUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && url.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export async function putPrivateFile(
  pathname: string,
  body: Blob | Buffer,
  contentType?: string,
): Promise<string> {
  const blob = await put(pathname, body, {
    access: "private",
    addRandomSuffix: true,
    contentType,
  });
  return blob.url;
}

export async function readStoredFile(blobUrl: string): Promise<ReadableStream<Uint8Array> | null> {
  if (!isBlobUrl(blobUrl)) return null;
  const access = new URL(blobUrl).hostname.includes(".public.") ? "public" : "private";
  try {
    const res = await get(blobUrl, { access, useCache: false });
    return res?.statusCode === 200 ? res.stream : null;
  } catch (e) {
    console.error("Nie udało się odczytać pliku z Vercel Blob:", e);
    return null;
  }
}

export async function storeInvoiceFile(
  file: File,
  kind: StoredFile["kind"],
): Promise<StoredFile> {
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const mimeType = file.type || (kind === "SOURCE_XML" ? "application/xml" : "application/pdf");
  const blobUrl = await putPrivateFile(`faktury/${Date.now()}-${safeName}`, file, mimeType);
  return { kind, fileName: file.name, mimeType, blobUrl };
}

export async function deleteInvoiceFiles(blobUrls: string[]): Promise<void> {
  if (blobUrls.length === 0) return;
  try {
    await del(blobUrls);
  } catch (e) {
    console.error("Nie udało się usunąć plików z Vercel Blob:", blobUrls, e);
  }
}
