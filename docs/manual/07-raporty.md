# Raporty

Sekcja Raporty pokazuje szczegółowy podgląd śladu węglowego za wybrany okres i pozwala pobrać go jako plik. **Pobrany plik zawiera dokładnie te dane, które widzisz na ekranie**, z tymi samymi filtrami.

## Filtry

| Filtr | Działanie |
|---|---|
| **Okres** | Gotowe zakresy: Bieżący rok, Poprzedni rok, Bieżący kwartał, Poprzedni kwartał, Bieżący miesiąc, Poprzedni miesiąc, Ostatnie 12 miesięcy — albo własne daty **Od / Do**. Zakresy „bieżące” liczą się od początku okresu do dziś, „poprzednie” obejmują pełny okres. |
| **Zakres** | Zakres 1, Zakres 2 albo oba. |
| **Kategoria** | Typy źródeł: energia elektryczna, pojazdy, instalacje itd. |
| **Źródła** | Wybór konkretnych źródeł emisji z listy (także nieaktywnych). |
| **Status wpisów** | Domyślnie **Zweryfikowany** i **Skorygowany**. Można dołączyć **Szkic**. |

Raport odświeża się automatycznie po każdej zmianie filtra. Przycisk **Wyczyść filtry** przywraca ustawienia domyślne.

Jeśli dołączysz szkice, zobaczysz żółte ostrzeżenie, a raport PDF zostanie oznaczony jako **zawierający dane niezweryfikowane**. Gdy szkice są pominięte, informacja pod filtrami podaje, ile ich jest i jaką mają emisję.

## Zawartość raportu

- **Kafelki z wynikami** — emisja łączna, Zakres 1, Zakres 2, zmiana rok do roku.
- **Podział na zakresy i porównanie okresów** — wybrany okres zestawiony z **poprzednim okresem** (tej samej długości) i z **tym samym okresem rok wcześniej**.
- **Emisja miesięczna** — wykres słupkowy, z porównaniem do roku wcześniej.
- **Emisja według kategorii źródeł** — które rodzaje źródeł emitują najwięcej.
- **Top 10 źródeł emisji** — ranking źródeł o największej emisji w okresie, z udziałem i **zmianą rok do roku** (wobec tego samego okresu rok wcześniej). Wzrost o 10% i więcej jest wyróżniony na czerwono; „—” oznacza brak danych sprzed roku.
- **Rekomendacje redukcji emisji** — kierunki działań dla źródeł, które razem dają ok. 80% emisji, oraz dla źródeł rosnących o 10% i więcej rok do roku. Rekomendacje są pogrupowane według typu źródła (np. energia elektryczna: umowa na energię z OZE, fotowoltaika, LED). To ogólne wskazówki — przed decyzją wymagają oceny technicznej i kosztowej.
- **Emisja według źródeł** — tabela: zużycie, wskaźnik, emisja w kg i tonach oraz udział procentowy każdego źródła.
- **Zastosowane wskaźniki emisji** — jakie wartości wskaźników zostały użyte (z chwili zapisu wpisów).
- **Jakość danych** — jaka część emisji pochodzi z wpisów zweryfikowanych oraz ile wpisów ma każdy status i czy jest ujęty w raporcie.
- **Faktury ujęte w raporcie** — lista faktur (kliknij **pokaż**, aby ją rozwinąć).

## Eksport

Przyciski na górnym pasku:

| Przycisk | Format | Do czego |
|---|---|---|
| **Generuj PDF** | PDF | Gotowy raport do wydruku lub przekazania (np. audytorowi, zarządowi). Zawiera dane firmy w nagłówku. |
| **XLSX** | Excel | Do dalszej analizy w arkuszu kalkulacyjnym. |
| **CSV** | tekst | Do importu w innych systemach. |
| **Zapisz w archiwum** | PDF + XLSX + CSV | Trwała wersja raportu do późniejszego pobrania (patrz niżej). |

Wskazówka: przed eksportem ustaw filtry, a potem pobierz plik — będzie zawierał dokładnie ten sam zakres danych.

## Archiwum raportów

Archiwum przechowuje **niezmienne wersje raportów** — np. tę, która trafiła do audytora lub zarządu. Pliki pokazują dane z chwili zapisu, nawet jeśli wpisy zostaną później poprawione.

**Zapisywanie** — **Tylko Analityk**:

1. Ustaw filtry raportu (okres, zakres, kategorie, źródła, statusy).
2. Kliknij **Zapisz w archiwum** na górnym pasku.
3. Podaj **nazwę** (podpowiadana na podstawie okresu) i opcjonalnie **notatkę**, np. „wersja przekazana audytorowi”.
4. Kliknij **Zapisz w archiwum** — system zapisze naraz pliki **PDF, XLSX i CSV**.

Jeśli raport zawiera szkice, w archiwum zostanie oznaczony jako zawierający dane niezweryfikowane.

**Przeglądanie** — zakładka **Archiwum** w sekcji Raporty (dostępna dla wszystkich):

- przyciski **PDF / XLSX / CSV** pobierają zapisane pliki,
- **Otwórz z aktualnymi danymi** pokazuje raport z tymi samymi filtrami, ale na dzisiejszych danych — przydatne do porównania,
- listę można sortować po nazwie, okresie, emisji i dacie zapisu.

**Usuwanie** — **Tylko Analityk**: ikona kosza usuwa wersję razem z plikami, po potwierdzeniu.

Każdy zapis, pobranie i usunięcie trafia do dziennika zdarzeń.
