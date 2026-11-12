import { ksefXmlParser } from "./ksef-xml";
import { waproXlsxParser } from "./wapro-xlsx";
import { isAttachmentFile } from "./limits";
import { InvoiceParseError, type InvoiceParser, type ParsedInvoice } from "./types";

export const PARSERS: InvoiceParser[] = [ksefXmlParser];

export {
  MAX_FILES_PER_BATCH,
  MAX_BATCH_BYTES,
  MAX_INVOICES_PER_BATCH,
  ACCEPTED_EXTENSIONS,
  ATTACHMENT_EXTENSIONS,
  isAttachmentFile,
} from "./limits";

export function parseFile(file: { name: string; content: Buffer }): ParsedInvoice[] {
  if (waproXlsxParser.detect(file)) return waproXlsxParser.parseAll(file);
  const parser = PARSERS.find((p) => p.detect(file));
  if (!parser) {
    throw new InvoiceParseError(
      isAttachmentFile(file.name)
        ? "PDF nie jest odczytywany automatycznie — dołącz go do faktury jako załącznik i wprowadź dane ręcznie."
        : "Nie rozpoznano formatu pliku. Obsługiwany jest XML faktury z KSeF (FA(3)) oraz zestawienie przyjęć z WAPRO MAG (XLSX, XLS, ODS).",
    );
  }
  return [parser.parse(file)];
}
