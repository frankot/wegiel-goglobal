# Pliki demo — import faktur

Fikcyjne faktury do pokazu systemu (odbiorca: STAL-RES, NIP 8133378641). Wgraj wszystkie naraz w **Faktury i wpisy → Dodaj faktury**.

Pliki są dostępne po zalogowaniu pod adresem `/demo/<nazwa pliku>`.

| Plik | Co pokazuje | Wynik |
|---|---|---|
| `01-prad-magazyn-krosno-2026-09.xml` | dopasowanie po numerze PPE, przeliczenie MWh → kWh, pominięta opłata abonamentowa | ✓ Gotowa · 11,92 MWh → 6,59 t CO₂e (wskaźnik 0,553) |
| `02-prad-magazyn-krosno-2026-10.xml` | ten sam licznik w październiku — system sam bierze nową wersję wskaźnika | ✓ Gotowa · 13,205 MWh → 8,93 t CO₂e (wskaźnik 0,676) |
| `03-cieplo-biuro-2026-09.xml` | ciepło sieciowe, przeliczenie GJ → kWh | ✓ Gotowa · 9,8 GJ → 1,03 t CO₂e |
| `04-cieplo-biuro-2026-10.xml` | początek sezonu grzewczego — wzrost zużycia | ✓ Gotowa · 41,7 GJ → 4,40 t CO₂e |
| `05-gaz-kotlownia-2026-q3.xml` | faktura kwartalna, bez załącznika — dopasowanie po NIP dostawcy | ⚠ do potwierdzenia · 2960 m³ → 5,89 t CO₂e |
| `06-paliwo-flota-2026-10.xml` | paliwo floty po NIP, pominięta opłata za karty (szt) | ⚠ do potwierdzenia · 436,8 l → 1,14 t CO₂e |
| `07-prad-nowy-punkt-mielec-2026-10.xml` | nieznany punkt poboru — przycisk **+ nowe** przy źródle tworzy źródło z PPE z faktury | ⚠ wskaż źródło i wskaźnik |
| `08-duplikat-prad-magazyn-krosno-2026-10.xml` | ta sama faktura co 02 — system blokuje duplikat | ✗ Błąd · duplikat |
| `09-wapro-mag-przyjecia-2026-11.xlsx` | zestawienie przyjęć z WAPRO MAG — 4 dokumenty | patrz niżej |

## WAPRO MAG (`09-wapro-mag-przyjecia-2026-11.xlsx`)

| Dokument | Co pokazuje |
|---|---|
| UNIMOT `PZ /ŚW/001/1126` — 3310 kWh | dopasowanie po wcześniejszych fakturach dostawcy (Licznik główny) |
| ORLEN `PZ /PAL/007/1026` — 48,23 l | nieznany dostawca — wybierz źródło (np. Skoda Fabia) i wskaźnik (benzyna / ON) |
| ORLEN `PZ /PAL/008/1126` — 51,7 l | jak wyżej |
| WÜRTH `PZ /MAT/031/1126` — 12 szt. | materiały (szt.) nie tworzą emisji — usuń z paczki |

Zestawienie WAPRO nie zawiera okresu rozliczeniowego — przed zapisem uzupełnij **Okres od / do** w każdej karcie.

## Przebieg pokazu

1. Wgraj wszystkie pliki — karty sortują się: Gotowe, Wymaga uwagi, Błąd.
2. Pokaż komunikaty (01 i 02 — różne wersje wskaźnika dla września i października) „dopasowano po PPE / NIP / wcześniejszych fakturach” i „przeliczono MWh → kWh”.
3. 07 — kliknij **+ nowe** przy źródle emisji: formularz ma już PPE i NIP z faktury.
4. 08 — duplikat nie da się zapisać.
5. WAPRO — uzupełnij okres, wybierz źródło dla ORLEN, usuń WÜRTH.
6. **Zapisz** — faktury trafiają do listy, emisja do dashboardu i raportów.

Po zapisie ponowne wgranie tych plików pokaże duplikaty.
