# Plan implementacyjny — wsadowy import faktur XML (KSeF FA(3))

**Data:** 21.09.2026
**Funkcja kluczowa:** użytkownik wrzuca **jeden lub wiele** plików XML z KSeF. System parsuje każdy z nich i pokazuje **po jednym wypełnionym formularzu na fakturę** w jednym podglądzie. Użytkownik przegląda, poprawia co trzeba, zapisuje — emisja policzona dla całej paczki.
**Stan wyjściowy:** Faza 1 ukończona (auth, layout, schemat DB, seed wskaźników)
**Szacunek:** 8,5 dnia roboczego
**Nowe zależności: żadne** — `fast-xml-parser`, `@vercel/blob` i `zod` są już w `package.json`.

---

## 1. Decyzje projektowe

| # | Decyzja | Wybór |
|---|---|---|
| D1 | **Źródło danych** | **Wyłącznie XML FA(3) z KSeF.** PDF nie jest parsowany. |
| D2 | **PDF** | **Opcjonalny załącznik bez parsowania** — dokument czytelny dla człowieka, którym audytor faktycznie się posłuży. Upload i link, zero logiki. |
| D3 | **Wsad** | 1..N plików XML naraz. N plików → N faktur → N wypełnionych formularzy w jednym podglądzie. |
| D4 | **Zapis paczki** | **Per faktura, zapis częściowy.** Każda faktura zapisuje się lub nie niezależnie; wewnętrznie transakcyjna (faktura + jej wpisy razem albo wcale). Podsumowanie: „Zapisano 2 z 3". Nikt nie wgrywa 10 plików od nowa przez literówkę w siódmym. |
| D5 | **Układ podglądu** | **Karty składane (accordion), wszystkie na jednej stronie.** Faktury czyste — zwinięte z jednolinijkowym podsumowaniem. Wymagające uwagi — rozwinięte automatycznie. Na dole suma paczki. |
| D6 | **Uprawnienia** | Import dostępny dla **obu ról**. Pracownik → wszystko zapisuje się jako `DRAFT`. Manager → może zapisać od razu jako `VERIFIED`. Zbiorcza weryfikacja tylko dla Managera. |
| D7 | **Deduplikacja** | Klucz `ksefNumber`, fallback `(supplierNip, invoiceNumber)`. Sprawdzane **zarówno wobec bazy, jak i wewnątrz paczki** (ten sam plik wybrany dwa razy). |
| D8 | Dopasowanie pozycji do źródła emisji | Kaskada: PPE → nr licznika → NIP sprzedawcy → słownik słów kluczowych. |
| D9 | Wersja wskaźnika przy okresie na styku lat | Wg `periodEnd` (fallback `entryDate`). Formularz pokazuje wybraną wersję i pozwala nadpisać. |
| D10 | Edycja wskaźnika a istniejące wpisy | Zapisane wpisy nietykalne (snapshot). Przeliczenie tylko szkiców, tylko po jawnym potwierdzeniu. |
| D11 | **Wskaźniki KOBIZE** | Aktualizowane **raz na rok lub rzadziej** → prosty CRUD z wersjonowaniem, **najniższy priorytet**, ostatni etap. Wartość startowa **0,553 kg CO₂e/kWh**. |

**Struktura katalogów:** specyfikacja opisuje `src/app`, realny projekt ma wszystko w roocie (`app/`, `lib/`, alias `@/*` → `./*`). Pusty katalog `src/` do usunięcia.

> **Zaparkowane, nie stracone:** sprawdziłem, że PDF-y z KSeF (`example/unimot-e.pdf`) mają warstwę tekstową z CMapami `ToUnicode` i dają się parsować deterministycznie, bo ich układ narzuca krajowy generator KSeF, nie dostawca. Gdyby kiedyś pojawiły się faktury bez XML-a, ścieżka jest zbadana i wykonalna (~2 dni). Dziś jej nie budujemy — rejestr parserów (§4.1) zostawia na nią gniazdo.

---

## 2. Mapowanie XML FA(3) → dane systemu

Rozebrany `example/unimoto-x.xml`. Schemat `http://crd.gov.pl/wzor/2025/06/25/13775/`, `KodFormularza@kodSystemowy = "FA (3)"`.

**Nagłówek:**

| Ścieżka XML | Pole | Wartość w przykładzie |
|---|---|---|
| `Naglowek/KodFormularza/@kodSystemowy` | detekcja formatu | `FA (3)` |
| `Podmiot1/DaneIdentyfikacyjne/NIP` | `Invoice.supplierNip` | `9730421440` |
| `Podmiot1/DaneIdentyfikacyjne/Nazwa` | `Invoice.supplierName` | `UNIMOT ENERGIA i GAZ Sp. z o. o.` |
| `Podmiot2/DaneIdentyfikacyjne/NIP` | `Invoice.buyerNip` | `8133378641` |
| `Fa/P_2` | `Invoice.invoiceNumber` | `UE/F2/1103911/183/08/2026/FR` |
| `Fa/P_1` | `Invoice.issueDate` | `2026-08-11` |
| `Fa/OkresFa/P_6_Od` / `P_6_Do` | domyślny `periodStart` / `periodEnd` pozycji | `2026-07-01` / `2026-07-31` |

**Pozycje — `Fa/FaWiersz[]`:**

| Ścieżka | Pole | Wartość |
|---|---|---|
| `P_7` | opis pozycji (wejście do słownika) | `Energia elektryczna C11 Całodobowa` |
| `Indeks` | kod towaru sprzedawcy | `7310320` |
| `P_8A` | jednostka | `kWh` |
| `P_8B` | **ilość → `quantity`** | `2852.000` |
| `P_9A` / `P_11` | cena / wartość netto — wyłącznie podgląd, **nigdy podstawa obliczeń** | `0.49036` / `1398.51` |

**Załącznik — `Zalacznik/BlokDanych` (opcjonalny):**

| Ścieżka | Pole | Wartość |
|---|---|---|
| `MetaDane[ZKlucz="Numer punktu poboru"]/ZWartosc` | **PPE → dopasowanie źródła** | `590543550100711505` |
| `MetaDane[ZKlucz="Numer licznika"]/ZWartosc` | nr licznika | `50436458` |
| `MetaDane[ZKlucz="Grupa taryfowa"]/ZWartosc` | grupa taryfowa → notatka | `C11` |
| `MetaDane[ZKlucz="Adres punktu poboru"]/ZWartosc` | lokalizacja | `Tadeusza Boya-Żeleńskiego 11…` |
| `Tabela[Opis="Odczyty"]` → kol. `Zużycie [kWh]` | **kontrola krzyżowa** | `2852.0000` = `P_8B` ✓ |

Rozbieżność między odczytem a pozycją → `warnings[]` i żółte podświetlenie pola. **Nie blokuje zapisu** — decyzję podejmuje człowiek.

> **Uwaga:** nasz przykładowy XML to wersja przedwysyłkowa, **bez nadanego numeru KSeF** (numer `9730421440-20260811-8ECEF2C00000-65` jest tylko w PDF-ie). Parser czyta `ksefNumber`, jeśli jest w dokumencie, i po cichu sobie radzi, gdy go nie ma — wtedy deduplikacja schodzi na `(supplierNip, invoiceNumber)`.

---

## 3. Pułapki — wszystkie znalezione w tym jednym pliku

1. **`mc` to miesiąc, nie metr sześcienny.** Pozycja „Opłata handlowa": `P_8A = mc`, `P_8B = 1.000`. Naiwny mapper jednostek zrobi z tego 1 m³ gazu ziemnego i dopisze nieistniejącą emisję. Konwersja jednostek musi być **allow-listą**, nie zgadywaniem.
2. **Pojedyncza pozycja to obiekt, nie tablica.** `fast-xml-parser` przy jednym `FaWiersz` zwraca obiekt, nie tablicę jednoelementową. Zweryfikowane na wariancie jednopozycyjnym przykładowej faktury:

   ```
   one-line.xml    typeof: OBJECT | .length = undefined   → w.map() rzuca wyjątek
   unimoto-x.xml   typeof: ARRAY len=2                    → działa
   ```

   **Groźniejszy jest wariant cichy.** Wyjątek `w.map is not a function` jest głośny i natychmiast widoczny. Ale kod „obronny" w stylu `for (let i = 0; i < rows.length; i++)` przy `length === undefined` **nie wykona ani jednej iteracji** — faktura zaimportuje się „poprawnie", z zerem wpisów emisyjnych. Zielony komunikat, brak emisji, błąd wychodzi dopiero przy rocznym podsumowaniu. To jest dokładnie ta klasa błędu, którą §3 p. 7 nazywa najgorszą możliwą w tym systemie.

   Faktura z jedną pozycją to przypadek **najczęstszy** dla energii elektrycznej. Nasza jedyna próbka ma dwie pozycje, więc błąd przechodzi testy i wychodzi dopiero na produkcji. Obrona trójwarstwowa — szczegóły w §4.2.
3. **`_x000D_` w treści.** `Nazwa punktu poboru` kończy się zakodowanym CR. Czyścić każdą wartość tekstową.
4. **Domyślny namespace bez prefiksu**, ale prefiksy `etd:` pojawiają się w innych fakturach → `removeNSPrefix: true`.
5. **Liczby jako stringi.** `parseTagValue: false` — `"2852.000"` ma dojść do `Prisma.Decimal` bez wycieczki przez `Number`.
6. **`Zalacznik` jest opcjonalny.** Faktury paliwowe go nie mają. Brak PPE ≠ błąd — kaskada dopasowania po prostu leci dalej.
7. **Nie każda pozycja jest emisyjna.** „Opłata handlowa", abonamenty, korekty — odfiltrowane po jednostce i słowniku, ale **zawsze widoczne** w karcie faktury jako pominięte, z powodem i przyciskiem „użyj mimo to". Cicho zgubiona pozycja faktury to najgorszy błąd, jaki ten system może popełnić.

---

## 4. Architektura importu wsadowego

### 4.1. Typy — `lib/import/types.ts`

```ts
export interface ParsedInvoice {
  clientId: string;              // id karty w podglądzie (uuid po stronie klienta)
  fileName: string;
  format: "KSEF_XML" | "MANUAL";
  invoiceNumber?: string;
  ksefNumber?: string;
  issueDate?: string;            // ISO
  periodStart?: string;
  periodEnd?: string;
  supplierNip?: string;
  supplierName?: string;
  buyerNip?: string;
  lines: ParsedLine[];
  warnings: string[];
  status: "OK" | "NEEDS_ATTENTION" | "ERROR";
  errors: string[];              // np. "Duplikat faktury", "Nieznany schemat"
  duplicateOf?: { invoiceId: string; invoiceNumber: string; where: "DB" | "BATCH" };
  raw: unknown;                  // → Invoice.rawPayload
}

export interface ParsedLine {
  lineNo: number;
  description: string;
  indeks?: string;
  quantity: string;              // string — precyzja, patrz §5.1
  unit: string;
  ppeNumber?: string;
  meterNumber?: string;
  tariffGroup?: string;
  emissionRelevant: boolean;
  skipReason?: string;
  match?: SourceMatch;           // wynik §5.4
  resolvedFactor?: ResolvedFactor; // wynik §5.3
}

export interface InvoiceParser {
  id: string;
  detect(file: { name: string; content: Buffer }): boolean;
  parse(content: Buffer): Promise<ParsedInvoice>;
}
```

`lib/import/registry.ts` — dziś jeden wpis: `ksefXmlParser`. Dołożenie parsera PDF/CSV to jeden moduł i jedna linia, bez dotykania UI ani akcji serwerowych.

### 4.2. `lib/import/ksef-xml.ts`

**Warstwa 1 — `isArray` po jPath, nie po nazwie taga.** Dopasowanie po samej nazwie jest nieprecyzyjne: `Wiersz`, `Kol` i `WKom` to nazwy generyczne w generycznej strukturze tabel załącznika, a `Zalacznik`/`BlokDanych` mogą się powtarzać. Pełna ścieżka jest jednoznaczna:

```ts
const ARRAY_PATHS = new Set([
  "Faktura.Fa.FaWiersz",
  "Faktura.Zalacznik",                  // wiele punktów poboru = wiele załączników
  "Faktura.Zalacznik.BlokDanych",
  "Faktura.Zalacznik.BlokDanych.MetaDane",
  "Faktura.Zalacznik.BlokDanych.Tabela",
  "Faktura.Zalacznik.BlokDanych.Tabela.TNaglowek.Kol",
  "Faktura.Zalacznik.BlokDanych.Tabela.Wiersz",
  "Faktura.Zalacznik.BlokDanych.Tabela.Wiersz.WKom",
]);

const parser = new XMLParser({
  ignoreAttributes: false, attributeNamePrefix: "@",
  removeNSPrefix: true,                 // pułapka 4
  parseTagValue: false,                 // pułapka 5 — liczby jako string
  trimValues: true,
  isArray: (_name, jpath) => ARRAY_PATHS.has(jpath),   // pułapka 2
});
```

**Warstwa 2 — totalny akcesor w każdym miejscu użycia.** To on faktycznie kupuje bezpieczeństwo: lista z warstwy 1 jest allow-listą, a każda allow-lista kiedyś się zdezaktualizuje (nowy wariant schemy, nowy typ załącznika). `toArray()` sprawia, że niekompletna lista daje poprawny wynik zamiast awarii lub — gorzej — cichego zera.

```ts
const toArray = <T,>(v: T | T[] | null | undefined): T[] =>
  v == null ? [] : Array.isArray(v) ? v : [v];

const rows   = toArray(d.Faktura.Fa.FaWiersz);
const blocks = toArray(d.Faktura.Zalacznik).flatMap(z => toArray(z.BlokDanych));
const meta   = blocks.flatMap(b => toArray(b.MetaDane));
const ppe    = meta.find(m => m.ZKlucz === "Numer punktu poboru")?.ZWartosc;
```

Brak `Zalacznik` → `[]` (pułapka 6, faktury paliwowe). Jeden `FaWiersz` → `[row]`. Dzięki temu `isArray` z warstwy 1 jest optymalizacją i wygodą typowania, a nie warunkiem poprawności.

**Warstwa 3 — fixtury, które by to złapały.** Jedyna próbka ma dwie pozycje, więc błąd przechodzi testy. Do `example/` dochodzą warianty wygenerowane z prawdziwej faktury:

| Fixture | Co pokrywa |
|---|---|
| `unimoto-x.xml` | oryginał, 2 pozycje |
| `unimot-1poz.xml` | jedna pozycja — pułapka 2 |
| `unimot-bez-zalacznika.xml` | brak `Zalacznik` — kształt faktury paliwowej, pułapka 6 |

Test złoty (`2852 × 0,553 = 1577,156 kg`) przechodzi na pierwszych dwóch; trzeci sprawdza, że brak PPE degraduje się do `match-source` kroku 3–4, a nie do wyjątku.

Plus `cleanText()` usuwający `_x000D_` (pułapka 3).
`detect()`: rozszerzenie `.xml` **i** `Naglowek/KodFormularza/@kodSystemowy` zaczyna się od `FA`. Inny wariant schemy → czytelny komunikat na karcie, nigdy cicha porażka.

### 4.3. Przepływ paczki

```
1. Użytkownik wybiera 1..N plików .xml (+ opcjonalnie PDF-y jako załączniki)
        │
2. parseInvoiceBatch(formData)  — jedna akcja serwerowa na całą paczkę
        ├── per plik: detect → parse → match-source → resolve-factor
        ├── dedup wobec BAZY        (ksefNumber → supplierNip+invoiceNumber)
        ├── dedup WEWNĄTRZ PACZKI   (ten sam plik wybrany dwa razy)   [D7]
        └── zwraca ParsedInvoice[] — pliki NIE są jeszcze zapisywane
        │
3. Podgląd: N kart składanych, sumy, edycja pól                       [D5]
        │
4. saveInvoiceBatch(formData)  — pliki przesyłane ponownie razem z poprawkami
        ├── per faktura: $transaction { Invoice + EmissionEntry[] + Blob + AuditLog }
        ├── sukces → karta znika, licznik rośnie
        └── błąd  → karta zostaje z powodem, reszta zapisana            [D4]
        │
5. Podsumowanie: „Zapisano 2 z 3" + karty, które zostały do poprawy
```

**Dlaczego pliki wędrują dwa razy:** etap 2 niczego nie zapisuje do Vercel Blob. Gdybyśmy wrzucali pliki od razu przy parsowaniu, każda porzucona paczka zostawiałaby sieroty w storage. Przy plikach rzędu 4 KB powtórny transfer jest darmowy, a model danych zostaje czysty — do Bloba trafia wyłącznie to, co faktycznie wylądowało w bazie.

**Limity:** maks. **20 plików** na paczkę, łącznie 10 MB (`experimental.serverActions.bodySizeLimit` już ustawione w `next.config.ts`). Walidacja po stronie klienta **i** serwera, z komunikatem mówiącym, ile plików odrzucono i dlaczego.

---

## 5. Warstwa domenowa — `lib/emissions/`

### 5.1. `calculate.ts`

**Żelazna zasada: żadnych `number` w ścieżce obliczeniowej.** Wszystko przez `Prisma.Decimal` (decimal.js, dostępny jako `Prisma.Decimal` w wygenerowanym kliencie).

```
co2eKg  = quantityInFactorUnit.mul(factorValue)
co2eTon = co2eKg.div(1000)
```

**Test złoty (musi przechodzić od pierwszego dnia):**
`2852 kWh × 0,553 = 1577,156 kg = 1,577156 t` — zgodnie z `example/unimot-calc.md`.

### 5.2. `units.ts` — allow-lista (pułapka 1)

| Z | Do | Mnożnik |
|---|---|---|
| MWh | kWh | 1000 |
| GJ | kWh | 277,777778 |
| kWh | kWh | 1 |
| m³ / m3 | m³ | 1 |
| l / L / litr | litr | 1 |
| t / tona | kg | 1000 |
| kg | kg | 1 |

Cokolwiek spoza tabeli (`mc`, `szt`, `usł`, `kpl`) → `emissionRelevant: false` z powodem. Oryginał do `originalQuantity`/`originalUnit`, przeliczona wartość do `quantity`/`unit`; karta pokazuje obie.

### 5.3. `resolve-factor.ts` (D9)

`refDate = periodEnd ?? entryDate`; kandydaci: `validFrom <= refDate <= validTo`.
Jeden → bierzemy. Kilku → priorytet `source.defaultFactorId`, inaczej karta prosi o wybór. Zero → karta dostaje status `NEEDS_ATTENTION` z komunikatem „Brak wskaźnika obowiązującego dla 31.07.2026" i linkiem do `/factors`.
Zawsze zwraca `factorSnapshotValue` + `factorSnapshotUnit` do zapisania na wpisie.

### 5.4. `match-source.ts` (D8)

| Krok | Klucz | Pewność |
|---|---|---|
| 1 | `ppeNumber` == PPE z załącznika | `EXACT` |
| 2 | `meterNumber` == nr licznika | `EXACT` |
| 3 | `supplierNip` i dokładnie jedno źródło pasuje | `LIKELY` |
| 4 | słownik słów kluczowych na `P_7` | `GUESS` |
| 5 | brak | `NONE` → karta `NEEDS_ATTENTION` |

UI: `EXACT` → zielony znacznik „dopasowano po PPE". `LIKELY`/`GUESS` → żółty, z informacją jak dopasowano. `NONE` → pole puste i wymagane.

Po ręcznym przypisaniu źródła do pozycji z nieznanym PPE — checkbox **„Zapamiętaj PPE 590543550100711505 dla źródła «Licznik główny»"** → zapis do `EmissionSource.ppeNumber`. **To jest mechanizm, dzięki któremu paczka faktur od znanych dostawców po kilku miesiącach wchodzi w całości na zielono i nie wymaga żadnej pracy.**

---

## 6. Zmiany w schemacie Prisma

Migracja `add_invoice_import_fields`.

```prisma
model EmissionSource {
  ppeNumber   String? @unique   // klucz dopasowania #1
  meterNumber String?           // klucz #2
  supplierNip String?           // klucz #3
}

model Invoice {
  ksefNumber   String?  @unique        // klucz deduplikacji, gdy obecny  [D7]
  supplierNip  String?
  supplierName String?
  buyerNip     String?
  sourceFormat String   @default("MANUAL")   // KSEF_XML | MANUAL
  rawPayload   Json?                   // surowy wynik parsera — audyt, re-interpretacja
  attachments  InvoiceAttachment[]
  uploadedById String?
  uploadedBy   User?    @relation("Uploader", fields: [uploadedById], references: [id])

  @@unique([supplierNip, invoiceNumber])
}

model InvoiceAttachment {                    // XML źródłowy + opcjonalny PDF  [D2]
  id        String   @id @default(cuid())
  invoiceId String
  invoice   Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  kind      String                           // SOURCE_XML | EVIDENCE_PDF
  fileName  String
  mimeType  String
  blobUrl   String
  createdAt DateTime @default(now())
}

model EmissionEntry {
  originalQuantity Decimal? @db.Decimal(14, 4)   // np. 2,852 MWh
  originalUnit     String?
  co2eTon          Decimal  @db.Decimal(16, 6)   // ZMIANA z Decimal(12,4)
}
```

Do `User` dopisać `uploadedInvoices Invoice[] @relation("Uploader")`.

**Dlaczego `co2eTon` musi się zmienić:** przy `Decimal(12,4)` wynik 1 577,156 kg zapisze się jako **1,5772 t** zamiast 1,577156 t. Przy wsadowym imporcie — a o to tu chodzi — dziesiątki takich zaokrągleń rozjadą sumę roczną względem sumy kilogramów. Tego nie da się obronić przed audytorem.

`InvoiceAttachment` zastępuje pojedyncze `sourceFileUrl`: jedna faktura ma źródłowy XML, a często też PDF do wglądu.

---

## 7. UI

### 7.1. `/entries/new` — dropzone i podgląd paczki (D3, D5)

```
┌─ Dodaj faktury ─────────────────────────────────┐
│  ⬆ Przeciągnij pliki XML z KSeF (do 20)         │
│     …albo wypełnij jeden wpis ręcznie ↓         │
└─────────────────────────────────────────────────┘

╔═ Podgląd importu: 3 faktury ════════════════════╗
║ ▸ ✓ UNIMOT ENERGIA   UE/F2/1103911/183/08/2026  ║
║     1 poz. · 2852 kWh · 1,577156 t · PPE ✓      ║
║                                                 ║
║ ▾ ⚠ PGE OBRÓT        FV/2026/08/4471            ║
║     Okres    01.07.2026 – 31.07.2026         ↺  ║
║     Źródło   [wybierz źródło ▾]  ← wymagane     ║
║              PPE 590712… nieznany               ║
║              ☐ Zapamiętaj PPE dla tego źródła   ║
║     Ilość    1240            kWh             ↺  ║
║     Wskaźnik Energia elektr. PL 0,553 kg/kWh    ║
║     ⇒ 685,720 kg = 0,685720 t CO₂e              ║
║     Pominięto: „Opłata abonamentowa" (mc)       ║
║                                  [Użyj mimo to] ║
║                                                 ║
║ ▸ ✗ TAURON           1/08/2026/EE               ║
║     Duplikat — faktura już w systemie (12.08)   ║
║                        [Pokaż] [Usuń z paczki]  ║
╠═════════════════════════════════════════════════╣
║ Do zapisania: 2 faktury · Σ 2,262876 t CO₂e     ║
║ [Zapisz jako szkice]  [Zapisz i zweryfikuj]*    ║
╚═════════════════════════════════════════════════╝
                                   * tylko MANAGER
```

Zasady:

- **Karty `OK` zwinięte, `NEEDS_ATTENTION` i `ERROR` rozwinięte automatycznie.** Użytkownik z miejsca patrzy tylko na to, co wymaga decyzji.
- **Każde pole z pliku ma ikonę ↺ (przywróć wartość z faktury).** Zawsze widać, co przyszło z dokumentu, a co człowiek zmienił.
- Przeliczenie CO₂e **na żywo po stronie klienta**; wartość **zapisywana liczona wyłącznie na serwerze**. Klient nigdy nie dyktuje wyniku.
- Zmiana źródła → podmiana wskaźnika i jednostki. Zmiana okresu → ponowne rozwiązanie wersji wskaźnika, z widoczną informacją którą wersję wybrano.
- Karta `ERROR` nie blokuje zapisu pozostałych (D4); można ją usunąć z paczki albo zostawić i poprawić.
- Suma na dole liczy **tylko faktury, które faktycznie pójdą do zapisu**.
- Po zapisie: „Zapisano 2 z 3", karty zapisane znikają, nieudane zostają z powodem.
- Dropzone musi mieć działający `<input type="file" multiple>`, nie sam `onDrop` — inaczej odpada obsługa klawiaturą i czytnikiem ekranu.
- Bez plików: ten sam formularz w wersji pustej, jedna karta, `format: "MANUAL"`. **Jedna ścieżka kodu dla importu i wpisu ręcznego.**

### 7.2. `/entries` — lista

Tabela faktur: Numer, Data, Okres, Dostawca, Liczba pozycji, Suma CO₂e [t], Status, Format źródła, Akcje.
Wiersze rozwijalne (`components/ui/collapsible.tsx` już jest) → wpisy emisyjne. Filtry: data, dostawca, zakres (Scope 1/2), status. Podgląd i pobranie załączników.

---

## 8. Akcje serwerowe

```ts
// lib/entries/actions.ts
parseInvoiceBatch(formData: FormData): Promise<
  | { ok: true; invoices: ParsedInvoice[] }
  | { ok: false; errors: string[] }>

saveInvoiceBatch(formData: FormData, status: "DRAFT" | "VERIFIED"): Promise<{
  saved:  Array<{ clientId: string; invoiceId: string }>;
  failed: Array<{ clientId: string; error: string }>;
}>

updateEntry / verifyEntry / correctEntry / deleteEntry    // trzy ostatnie: MANAGER
attachFileToInvoice(invoiceId, formData)
```

`saveInvoiceBatch` **nie rzuca wyjątkiem na pierwszym błędzie** — iteruje po fakturach, każdą opakowuje w `prisma.$transaction`, zbiera wyniki do `saved` / `failed` (D4).

Zasady obowiązujące w **każdej** akcji:

1. `getCurrentUser()` na wejściu (`lib/db/users.ts` już to ma). **Sprawdzenie roli powtarzamy w akcji** — nie ufamy temu, że strona była chroniona. Dokumentacja Next 16 (`02-guides/forms.md`) otwiera się ostrzeżeniem dokładnie o tym.
2. `status: "VERIFIED"` wymaga `canVerifyEntry(user)` — Pracownik zawsze dostaje `DRAFT`, niezależnie od tego, co przyszło z klienta (D6).
3. Walidacja Zod per faktura (`schemas/invoice.ts`, `schemas/entry.ts`).
4. Obliczenia CO₂e wyłącznie serwerowo, na `Prisma.Decimal`.
5. `AuditLog` per zapisana faktura (akcja, encja, id, przed→po, IP z `headers()`).
6. `revalidatePath()` po zakończeniu całej paczki, nie po każdej fakturze.

**Serializacja `Decimal` przez granicę RSC:** `Prisma.Decimal` to instancja klasy i **nie przechodzi** z Server Component do Client Component ani z akcji serwerowej do stanu klienta. Warstwa `lib/db/*.ts` i akcje mapują na `string` przed oddaniem danych. Bez tego błąd pojawi się dopiero w runtime, przy pierwszym renderze podglądu paczki.

---

## 9. Wskaźniki KOBIZE — `/factors` (ostatni etap, D11)

Aktualizowane raz na rok lub rzadziej, więc bez kreatorów i automatyzacji:

- Lista pogrupowana po kategorii; wersje archiwalne wyszarzone.
- **Dodaj wskaźnik** — formularz: nazwa, kategoria, wartość, jednostka, źródło, zakres, okres ważności.
- **Dodaj nową wersję** — klonuje wskaźnik, pyta o nową wartość i `validFrom`, sam domyka poprzednią (`validTo = validFrom − 1 dzień`). Cała coroczna obsługa KOBIZE: dwie minuty raz na rok.
- **Edytuj** (korekta literówki) → jeśli dotyczy wpisów `DRAFT`, pytanie „przeliczyć N szkiców?". `VERIFIED`/`CORRECTED` nietykalne zawsze (D10).
- **Historia wersji** — modal po linii `parentId`.
- Walidacja: w obrębie jednej linii wersji okresy `validFrom`–`validTo` **nie mogą się nakładać** — inaczej `resolve-factor` zwraca wielu kandydatów i każda karta w paczce zaczyna pytać o oczywistości.

**KOBIZE publikuje wskaźniki wyłącznie jako PDF** (`example/links.md`) — plik XML do importu nie istnieje. Punkt specyfikacji „Import z KOBIZE XML" jest niewykonalny, a przy częstotliwości „raz na rok" nie warto go niczym zastępować: wpisanie jednej liczby jest tańsze niż jakakolwiek automatyzacja.

**Poprawka seeda** (`prisma/seed.ts`): energia elektryczna → **0,553 kg CO₂e/kWh**, `validFrom` 2026-01-01, nazwa „Energia elektryczna PL — odbiorcy końcowi (KOBIZE, dane 2024)". Obecne 0,685 zostaje jako wersja archiwalna tej samej linii (`parentId`) — od razu mamy działającą historię wersji i dane testowe.

---

## 10. Pliki do utworzenia

```
prisma/
  migrations/…_add_invoice_import_fields/
  seed.ts                          [edycja — §9]

lib/import/
  types.ts        ParsedInvoice, ParsedLine, InvoiceParser
  registry.ts     dziś: ksefXmlParser
  ksef-xml.ts     parser + cleanText + kontrola krzyżowa odczytów
  dedupe.ts       wobec bazy i wewnątrz paczki            [D7]
  numbers.ts      bezpieczna konwersja string → Decimal
  storage.ts      Vercel Blob (wywoływane dopiero przy zapisie)

lib/emissions/
  calculate.ts  units.ts  resolve-factor.ts  match-source.ts  format.ts

lib/db/         invoices.ts  entries.ts  factors.ts  sources.ts  audit.ts
lib/entries/actions.ts      lib/factors/actions.ts
schemas/        invoice.ts  entry.ts  factor.ts

app/(dashboard)/entries/page.tsx        [zastąpienie zaślepki]
app/(dashboard)/entries/new/page.tsx
app/(dashboard)/entries/[id]/page.tsx
app/(dashboard)/factors/page.tsx        [zastąpienie zaślepki]

components/entries/
  invoice-dropzone.tsx      multiple, drag & drop + input, walidacja limitów
  batch-preview.tsx         lista kart + sumy + przyciski zapisu
  invoice-card.tsx          jedna faktura: nagłówek, status, zwijanie
  entry-line-row.tsx        pozycja: źródło, ilość, live CO₂e, ikony ↺
  skipped-lines.tsx         pominięte pozycje z powodem
  batch-result.tsx          „Zapisano 2 z 3" + nieudane karty
  invoice-list.tsx  entry-table.tsx  status-badge.tsx

components/factors/
  factor-table.tsx  factor-form.tsx  factor-version-dialog.tsx  factor-history-dialog.tsx
```

---

## 11. Kolejność prac

| Etap | Zakres | Dni |
|---|---|---|
| **1** | Migracja schematu (§6) + poprawka seeda + `lib/emissions/*` z testem złotym `2852 × 0,553` | 1 |
| **2** | Parser XML FA(3) + `match-source` + `resolve-factor` + `dedupe`, weryfikowane na `unimoto-x.xml` | 1,5 |
| **3** | `/entries/new`: dropzone, **jedna** karta, formularz, live CO₂e, zapis **← jeden XML działa end-to-end** | 2 |
| **4** | Wsad: N plików, N kart, statusy kart, dedup w paczce, zapis częściowy, ekran wyniku **← funkcja kluczowa gotowa** | 1,5 |
| **5** | `/entries`: lista, rozwijane wpisy, filtry, edycja, statusy, załączniki (XML + PDF) | 1,5 |
| **6** | `/factors`: CRUD + wersje + historia + przeliczanie szkiców (§9) | 1 |
| | **Razem** | **8,5** |

Po Etapie 3 (≈4,5 dnia) działa pojedyncza faktura end-to-end. Po Etapie 4 (≈6 dni) **funkcja kluczowa jest gotowa do pokazania klientowi**: trzy pliki wchodzą, trzy wypełnione formularze wychodzą.

---

## 12. Kryteria akceptacji

1. **Test złoty:** import `example/unimoto-x.xml` → 1 faktura, 1 wpis, `quantity = 2852 kWh`, wskaźnik 0,553, `co2eKg = 1577,156`, `co2eTon = 1,577156`. Zgodne z `example/unimot-calc.md` co do cyfry.
2. **Wsad:** 3 pliki XML → **3 karty z wypełnionymi formularzami** w jednym podglądzie, z poprawną sumą CO₂e paczki.
3. **Fixture `unimot-1poz.xml` (jedna pozycja) daje ten sam wynik co test złoty** — nie wyjątek i **nie zero wpisów** (pułapka 2). To przypadek najczęstszy dla energii elektrycznej.
3a. Fixture `unimot-bez-zalacznika.xml` (brak `Zalacznik`) parsuje się bez błędu; brak PPE degraduje dopasowanie do kroku 3–4 kaskady, karta dostaje `NEEDS_ATTENTION` zamiast wyjątku.
4. Pozycja „Opłata handlowa" (`1,000 mc`) nie tworzy wpisu i **jest widoczna** na liście pominiętych z powodem.
5. Paczka z duplikatem: duplikat oznaczony `ERROR`, **pozostałe faktury zapisują się normalnie**, wynik „Zapisano 2 z 3".
6. Ten sam plik wybrany dwukrotnie w jednej paczce → wykryty wewnątrz paczki, nie dubluje się w bazie.
7. Po zapamiętaniu PPE `590543550100711505` kolejna faktura tego dostawcy wchodzi na zielono, bez pytania o źródło.
8. Pracownik importujący z `status: "VERIFIED"` w żądaniu i tak dostaje wpisy `DRAFT`; `verifyEntry` zwraca odmowę.
9. Faktura z okresem 15.12.2026–14.01.2027 dostaje wskaźnik wersji 2027 (wg `periodEnd`), karta pokazuje którą wersję wybrano.
10. Polskie znaki zachowane (`SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ`), bez `_x000D_`.
11. Porzucenie podglądu bez zapisu **nie zostawia żadnego pliku** w Vercel Blob.
12. Każda zapisana faktura zostawia wpis w `AuditLog` z użytkownikiem, IP i zmianą przed→po.

---

## 13. Ryzyka

| Ryzyko | Skutek | Reakcja |
|---|---|---|
| **Termin: 03.11.2026, gotowa 1 z 5 faz** | Brak odbioru | Etapy 1–4 (≈6 dni) dają funkcję kluczową. Rozmowa z klientem o przycięciu reszty zakresu **w pierwszym tygodniu października**, nie 30.10. |
| Jedna próbka XML, jeden dostawca | Parser przetestowany na jednym układzie | `Zalacznik` traktowany jako opcjonalny, dane krytyczne brane z obowiązkowego `FaWiersz`. **Poprosić klienta o XML-e od 2–3 innych dostawców, natychmiast.** |
| Faktury paliwowe (Scope 1) nieprzetestowane | Nieznane zachowanie dla ON/benzyny | Brak `Zalacznik`/PPE obsłużony (pułapka 6), kaskada ma krok słownikowy. Poprosić o przykład. |
| Brak `ksefNumber` w XML-ach przedwysyłkowych | Słabsza deduplikacja | Fallback na `(supplierNip, invoiceNumber)` — unikat w bazie, nie tylko walidacja aplikacyjna. |
| Utrata precyzji `Decimal` | Sumy w raportach się nie zgadzają | Zakaz `number` (§5.1), `co2eTon` → `Decimal(16,6)`, test złoty w CI. |
| Zgubiona pozycja faktury | Zaniżona emisja, błąd niewykrywalny | Pominięte pozycje zawsze widoczne z powodem, `rawPayload` zachowany do ponownej interpretacji. |
| Duża paczka przekracza `bodySizeLimit` | Cała paczka odrzucona bez wyjaśnienia | Limit 20 plików / 10 MB walidowany **po stronie klienta przed wysyłką**, z czytelnym komunikatem. |

---

## 14. Do klienta — wyślij teraz

1. **XML-e faktur od 2–3 innych dostawców energii** — jedyny sposób na potwierdzenie, że parser jest uniwersalny.
2. **Faktura paliwowa** (ON/benzyna) w XML — cała ścieżka Scope 1 jest dziś nieprzetestowana.
3. Czy faktury pobierane są z KSeF **po nadaniu numeru** (wtedy XML ma `ksefNumber` i deduplikacja jest pewna), czy eksportowane z systemu sprzedawcy przed wysyłką?
4. Ile faktur miesięcznie wchodzi typowo do systemu? (Decyduje, czy limit 20 plików na paczkę wystarczy.)
5. Czy 0,553 kg CO₂e/kWh jest uzgodnione z ich audytorem/doradcą ESG?
6. Czy **ciepło sieciowe** wchodzi w zakres v1? (Scope 2, GJ — konwersja przewidziana, wskaźnika dla dostawcy nie mamy.)
7. Przy obecnym opóźnieniu: **co jest ważniejsze na 03.11** — raporty PDF czy import masowy CSV/WF-MAG? Tylko jedno zdąży być dopracowane.
