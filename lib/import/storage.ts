import "server-only";
import { put } from "@vercel/blob";

/**
 * Upload plików źródłowych do Vercel Blob.
 *
 * WYWOŁYWANE WYŁĄCZNIE PRZY ZAPISIE, nigdy przy parsowaniu — inaczej każda
 * porzucona paczka zostawiałaby sieroty w storage. Przy plikach rzędu 4 KB
 * ponowny transfer przy zapisie jest darmowy, a do Bloba trafia tylko to,
 * co faktycznie wylądowało w bazie (kryterium akceptacji 11).
 */
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
