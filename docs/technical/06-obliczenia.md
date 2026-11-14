# Logika obliczeń i importu

## Wzór

> **Emisja CO₂e [kg] = Ilość [jednostka wskaźnika] × Wskaźnik [kg CO₂e / jednostka]**

Implementacja: `calculateEmission()` w `lib/emissions/calculate.ts`. Obliczenia prowadzone są na liczbach dziesiętnych (`Prisma.Decimal`), bez zaokrągleń pośrednich; wynik w tonach = kg / 1000.

Zakres (Scope) wynika z typu źródła (`lib/emissions/source-types.ts`):

| Typ źródła | Zakres |
|---|---|
| Instalacja stacjonarna, pojazd firmowy | Scope 1 |
| Energia elektryczna, ciepło, chłód | Scope 2 |

## Jednostki

Jednostka wskaźnika ma postać `kg CO₂e/<jednostka>`; część po ostatnim `/` to **jednostka docelowa**. Ilość z faktury przeliczana jest na nią według tabeli w `lib/emissions/unit-table.ts`:

| Wielkość | Jednostki (przelicznik do bazowej) |
|---|---|
| Energia — kWh | kWh (1), MWh (1000), GJ (277,777778) |
| Objętość gazu — m³ | m³, Nm³ (1) |
| Objętość paliwa — litr | l, litr, dm³ (1) |
| Masa — kg | kg (1), t / Mg (1000) |

Przeliczenie możliwe jest tylko w obrębie tej samej wielkości — np. litry na kWh dają błąd „różne wielkości fizyczne”. Pozycje faktury z jednostką spoza tabeli (np. „szt”, „usł”, opłaty) są pomijane jako niezwiązane z emisją. Gdy jednostka została przeliczona, wpis zachowuje także ilość i jednostkę oryginalną.

## Wybór wskaźnika

`resolveFactor()` w `lib/emissions/resolve-factor.ts`:

1. **Data odniesienia** = koniec okresu rozliczeniowego faktury, a gdy go brak — data wpisu.
2. Kandydaci = wskaźniki, których jednostka docelowa jest tej samej wielkości co jednostka pozycji (np. energia), o zakresie zgodnym ze źródłem i dla których `validFrom ≤ data ≤ validTo`.
3. Jeden kandydat → wybrany. Kilku → pierwszeństwo ma wskaźnik domyślny źródła, potem inna wersja z tej samej linii wersji. Nadal kilka → użytkownik wybiera ręcznie. Brak → błąd „Brak wskaźnika obowiązującego dla daty…”.

Okresy ważności wersji tej samej linii nie mogą się nakładać (`findOverlappingVersions`).

## Migawka i przeliczanie

Przy zapisie wpis otrzymuje kopię wartości i jednostki wskaźnika (`factorSnapshotValue`, `factorSnapshotUnit`). Dzięki temu:

- poprawka lub nowa wersja wskaźnika **nie zmienia** historycznych, zweryfikowanych wyników,
- szkice powiązane ze wskaźnikiem można jawnie przeliczyć (`recalculateDrafts`) — operacja liczy od ilości oryginalnej i trafia do dziennika zdarzeń.

## Statusy wpisów

| Status | Znaczenie | Kto ustawia |
|---|---|---|
| `DRAFT` | Szkic, wymaga sprawdzenia | Każdy wpis Użytkownika; Analityk opcjonalnie |
| `VERIFIED` | Zweryfikowany | Analityk (przy zapisie lub później) |
| `CORRECTED` | Skorygowany po weryfikacji | Analityk |

Raporty domyślnie obejmują wpisy `VERIFIED` i `CORRECTED`; szkice można dołączyć filtrem (raport jest wtedy oznaczony).

## Import faktur

Przepływ (`lib/entries/actions.ts`):

1. **`parseInvoiceBatch`** — odczyt plików (`lib/import/registry.ts`), wykrycie duplikatów, dopasowanie źródeł i wskaźników, podgląd obliczeń. Nic nie jest zapisywane.
2. Użytkownik poprawia dane na ekranie „Dodaj faktury”.
3. **`saveInvoiceBatch`** — ponowna walidacja na serwerze, zapis faktur, wpisów i plików (Blob) oraz wpis w dzienniku.

### Formaty

| Format | Parser | Co odczytuje |
|---|---|---|
| **KSeF XML (FA, np. FA(3))** | `lib/import/ksef-xml.ts` | Numer KSeF i faktury, NIP-y, daty, okres `P_6_Od`–`P_6_Do`, pozycje (`P_7` opis, `P_8A` jednostka, `P_8B` ilość), z załącznika faktury: numer punktu poboru (PPE), licznik, grupa taryfowa; zużycie z tabeli odczytów służy do kontroli krzyżowej |
| **WAPRO MAG (XLSX, XLS, ODS)** | `lib/import/wapro-xlsx.ts` | Zestawienie przyjęć: kolumny „Nazwa dostawcy”, „Dok. magazynowy”, „Dok. handlowy”, „Data”, „Ilość”, „J.m.”, „Cena netto”. Wiersze grupowane są w faktury według dokumentu magazynowego |
| **PDF** | — | Nie jest odczytywany; dołączany jako załącznik dowodowy |

Nowy format dodaje się, implementując interfejs `InvoiceParser` (`lib/import/types.ts`) i rejestrując go w `registry.ts`.

### Dopasowanie źródła

`matchSource()` w `lib/emissions/match-source.ts` sprawdza kolejno i zatrzymuje się na pierwszym trafieniu:

| Krok | Klucz | Pewność |
|---|---|---|
| 1 | Numer PPE | dokładne |
| 2 | Numer licznika | dokładne |
| 3 | Źródło z poprzednich faktur tego dostawcy | prawdopodobne |
| 4 | NIP dostawcy (jedno źródło z tym NIP) | prawdopodobne |
| 5 | Słowa kluczowe w opisie pozycji („energia elektryczna”, „olej napędowy”…) → jedno źródło danego typu | zgadywane |
| 6 | Jedyne aktywne źródło rozliczane w tej jednostce | zgadywane |

Wynik „zgadywane” lub brak dopasowania oznacza fakturę jako wymagającą uwagi.

### Duplikaty

`lib/import/dedupe.ts` porównuje z bazą i w obrębie paczki według: numeru KSeF, pary NIP dostawcy + numer faktury, a gdy brak NIP — znormalizowanej nazwy dostawcy + numeru. Duplikat nie może zostać zapisany.

## Raporty

- Wpis trafia do okresu raportu według `entryDate` (koniec okresu rozliczeniowego lub data wystawienia).
- Agregacja (`lib/reports/aggregate.ts`): sumy Scope 1/2, podział na miesiące, kategorie i źródła, porównanie z poprzednim okresem i rokiem wcześniej, jakość danych (udział emisji zweryfikowanej, wpisy bez faktury, pominięte szkice).
- **Top 10 i rekomendacje** (`lib/reports/recommendations.ts`): rekomendacje obejmują źródła, które razem dają ok. 80% emisji, oraz te z wzrostem r/r ≥ 10%. Treść działań to stały katalog per typ źródła.
- **Szablony** (`lib/reports/templates.ts`): pełny, miesięczny, kwartalny, roczny ESRS E1-6. Intensywność emisji = t CO₂e / 1 mln PLN przychodów netto (przychód podawany przy generowaniu).
- Eksport: PDF (`lib/reports/pdf.ts`, czcionki z `lib/reports/fonts/`), XLSX i CSV (`lib/reports/export.ts`).

## Przypomnienia

`lib/reminders/rules.ts`:

- Dla każdego aktywnego źródła z częstotliwością rozliczeń (miesięcznie / kwartalnie / rocznie) wyznaczany jest ostatni zamknięty okres, który skończył się co najmniej **10 dni** temu. Brak wpisu pokrywającego ten okres = brakujące dane.
- Dla wskaźników używanych przez aktywne źródła system ostrzega, gdy: brak wersji obowiązującej dziś, ostatnia wersja wygasa w ciągu **30 dni**, między wersjami jest luka w okresach ważności, a w styczniu — gdy nie ma jeszcze wersji KOBiZE na bieżący rok.
- Te same informacje widać w aplikacji (dashboard, Faktury i wpisy, Współczynniki) oraz w comiesięcznym e-mailu cron.
