import "server-only";
import { del, put } from "@vercel/blob";

export interface StoredFile {
  kind: "SOURCE_XML" | "EVIDENCE_PDF";
  fileName: string;
  mimeType: string;
  blobUrl: string;
}

export async function storeInvoiceFile(
  file: File,
  kind: StoredFile["kind"],
): Promise<StoredFile> {
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const blob = await put(`faktury/${Date.now()}-${safeName}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  return {
    kind,
    fileName: file.name,
    mimeType: file.type || (kind === "SOURCE_XML" ? "application/xml" : "application/pdf"),
    blobUrl: blob.url,
  };
}

export async function deleteInvoiceFiles(blobUrls: string[]): Promise<void> {
  if (blobUrls.length === 0) return;
  try {
    await del(blobUrls);
  } catch (e) {
    console.error("Nie udało się usunąć plików faktury z Vercel Blob:", blobUrls, e);
  }
}
