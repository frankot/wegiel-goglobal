"use client";

import { useRef, useState, type DragEvent } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_FILES_PER_BATCH, MAX_BATCH_BYTES } from "@/lib/import/limits";

interface Props {
  onFiles: (files: File[]) => void;
  busy?: boolean;
}

/**
 * Dropzone przyjmujący 1..N plików XML.
 *
 * Ma PRAWDZIWY <input type="file" multiple> — samo `onDrop` odcięłoby obsługę
 * klawiaturą i czytnikiem ekranu. Limity walidowane tutaj, PRZED wysyłką,
 * bo przekroczenie bodySizeLimit odrzuca całą paczkę bez czytelnego powodu.
 */
export function InvoiceDropzone({ onFiles, busy }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function accept(fileList: FileList | null) {
    setError(null);
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const rejected: string[] = [];
    const accepted = files.filter((f) => {
      const ok = /\.(xml|pdf)$/i.test(f.name);
      if (!ok) rejected.push(f.name);
      return ok;
    });

    if (accepted.length > MAX_FILES_PER_BATCH) {
      setError(
        `Maksymalnie ${MAX_FILES_PER_BATCH} plików na paczkę — wybrano ${accepted.length}.`,
      );
      return;
    }

    const total = accepted.reduce((s, f) => s + f.size, 0);
    if (total > MAX_BATCH_BYTES) {
      setError(
        `Łączny rozmiar ${(total / 1024 / 1024).toFixed(1)} MB przekracza limit ${
          MAX_BATCH_BYTES / 1024 / 1024
        } MB. Podziel paczkę na mniejsze.`,
      );
      return;
    }

    if (accepted.length === 0) {
      setError(
        `Nie wybrano pliku XML. Odrzucono: ${rejected.join(", ")}.`,
      );
      return;
    }

    if (rejected.length > 0) {
      setError(`Pominięto pliki w nieobsługiwanym formacie: ${rejected.join(", ")}.`);
    }

    onFiles(accepted);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (busy) return;
    accept(e.dataTransfer.files);
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".xml,.pdf,application/xml,text/xml,application/pdf"
          className="sr-only"
          onChange={(e) => {
            accept(e.target.files);
            e.target.value = "";
          }}
        />

        {busy ? (
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Przetwarzanie plików…
          </p>
        ) : (
          <>
            <Upload
              className="mx-auto mb-2 h-6 w-6 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-sm font-medium">
              Przeciągnij pliki XML z KSeF (do {MAX_FILES_PER_BATCH})
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Każdy plik to jedna faktura. PDF zostanie dołączony jako załącznik —
              nie jest odczytywany automatycznie.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => inputRef.current?.click()}
            >
              Wybierz pliki
            </Button>
          </>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
