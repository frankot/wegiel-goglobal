/**
 * Limity paczki — moduł BEZ zależności serwerowych, żeby dropzone po stronie
 * klienta mógł walidować te same wartości, których pilnuje serwer.
 *
 * (Import tych stałych z `registry.ts` wciągnąłby do bundla przeglądarki
 * parser XML razem z `node:crypto` i wysypał build.)
 */
export const MAX_FILES_PER_BATCH = 20;

/** Zgodne z `experimental.serverActions.bodySizeLimit` w next.config.ts. */
export const MAX_BATCH_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_EXTENSIONS = [".xml"] as const;

/** PDF przyjmujemy jako załącznik dowodowy — nie jest parsowany (D2). */
export const ATTACHMENT_EXTENSIONS = [".pdf"] as const;

export function isAttachmentFile(name: string): boolean {
  return ATTACHMENT_EXTENSIONS.some((e) => name.toLowerCase().endsWith(e));
}
