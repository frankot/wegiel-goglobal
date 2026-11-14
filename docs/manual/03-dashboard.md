# Dashboard

Dashboard to strona startowa po zalogowaniu. Pokazuje emisje firmy **od początku bieżącego roku**, wyłącznie z wpisów **zweryfikowanych i skorygowanych** (szkice nie są wliczane).

## Kafelki z wynikami

| Kafelek | Co pokazuje |
|---|---|
| **Emisja łączna** | Suma emisji w tonach CO₂e oraz liczba wpisów, źródeł i faktur. |
| **Zakres 1 — bezpośrednie** | Emisja ze spalania paliw na miejscu i w pojazdach oraz jej udział w całości. |
| **Zakres 2 — energia zakupiona** | Emisja z kupionego prądu, ciepła i chłodu oraz jej udział w całości. |
| **Zmiana rok do roku** | O ile procent emisja wzrosła lub spadła w porównaniu z tym samym okresem rok wcześniej. |

## Wykresy

- **Emisja miesięczna** — słupki dla każdego miesiąca, z podziałem na Zakres 1 i Zakres 2.
- **Emisja według kategorii źródeł** — które rodzaje źródeł (prąd, pojazdy, ciepło…) odpowiadają za największą część emisji.
- **Top 5 źródeł emisji** — pięć źródeł o największej emisji w bieżącym roku, z udziałem i zmianą rok do roku. Link **Pełny ranking i rekomendacje** prowadzi do Raportów.

## Wskazówki

- Jeśli w danym roku nie ma jeszcze zweryfikowanych wpisów, zamiast wykresów zobaczysz link **Dodaj faktury**.
- Pod wykresami pojawia się informacja, ile wpisów **czeka na weryfikację** i nie jest jeszcze ujętych w podsumowaniu.
- Przycisk **Pełny raport i eksport** przenosi do sekcji [Raporty](#raporty), gdzie można zmienić okres i pobrać plik.

## Wymaga uwagi

Gdy czegoś brakuje, nad kafelkami pojawia się karta **Wymaga uwagi**:

- **Brakujące dane** — źródła, dla których za ostatni zamknięty okres rozliczeniowy nie ma żadnego wpisu (np. „Licznik główny — brak danych za październik 2026”). Okres uznaje się za zamknięty 10 dni po jego końcu, żeby faktury zdążyły dotrzeć. Jak często źródło jest rozliczane, ustawia się w polu **Częstotliwość rozliczeń** źródła.
- **Wskaźniki emisji** — wskaźnik wygasa w ciągu 30 dni, ma lukę między wersjami albo źródło nie ma ważnego wskaźnika na dziś; w styczniu dodatkowo przypomnienie o nowym wskaźniku KOBiZE.

Szkice też liczą się jako wprowadzone dane. Karta znika, gdy wszystko jest uzupełnione.

**Tylko Analityk** — 10. dnia każdego miesiąca Analitycy dostają e-mail z tym samym podsumowaniem (tylko wtedy, gdy coś wymaga uwagi).
