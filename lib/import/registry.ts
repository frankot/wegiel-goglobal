import { ksefXmlParser } from "./ksef-xml";
import { isAttachmentFile } from "./limits";
import { InvoiceParseError, type InvoiceParser, type ParsedInvoice } from "./types";

/**
 * Rejestr parserów. Dziś jeden wpis.
 *
 * Dołożenie parsera (PDF z KSeF, CSV, WF-MAG) to nowy moduł implementujący
 * `InvoiceParser` i jedna linia w tej tablicy — bez dotykania UI ani akcji
 * serwerowych. Kolejność ma znaczenie: pierwszy pasujący wygrywa.
 *
 * UWAGA: ten moduł wciąga parser XML i `node:crypto`, więc NIE wolno go
 * importować z komponentu klienckiego. Limity paczki są w `./limits`.
 */
export const PARSERS: InvoiceParser[] = [ksefXmlParser];

export {
  MAX_FILES_PER_BATCH,
  MAX_BATCH_BYTES,
  ACCEPTED_EXTENSIONS,
  ATTACHMENT_EXTENSIONS,
  isAttachmentFile,
} from "./limits";

export function parseFile(file: { name: string; content: Buffer }): ParsedInvoice {
  const parser = PARSERS.find((p) => p.detect(file));
  if (!parser) {
    throw new InvoiceParseError(
      isAttachmentFile(file.name)
        ? "PDF nie jest odczytywany automatycznie — dołącz go do faktury jako załącznik i wprowadź dane ręcznie."
        : "Nie rozpoznano formatu pliku. Obsługiwany jest XML faktury z KSeF (FA(3)).",
    );
  }
  return parser.parse(file);
}
