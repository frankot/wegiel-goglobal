# System IT do obliczania i monitorowania śladu węglowego GO GLOBAL GROUP

## Szczegółowy opis przepływu danych i struktury aplikacji (Zakres 1 i 2)

**Data:** 15.06.2026  
**Zamawiający:** GO GLOBAL GROUP  
**Deadline wdrożenia produkcyjnego:** 03.11.2026  
**Szacowany budżet:** 16 000 – 20 000 PLN netto  

---

## Spis treści

1. [Streszczenie projektu](#1-streszczenie-projektu)
2. [Podstawa metodologiczna](#2-podstawa-metodologiczna)
3. [Struktura organizacyjna i role](#3-struktura-organizacyjna-i-role)
4. [Model danych i przepływ informacji](#4-model-danych-i-przepływ-informacji)
5. [Zakładki aplikacji — szczegółowy opis](#5-zakładki-aplikacji--szczegółowy-opis)
   - [5.1. Dashboard](#51-dashboard)
   - [5.2. Źródła emisji](#52-źródła-emisji)
   - [5.3. Współczynniki emisji](#53-współczynniki-emisji)
   - [5.4. Faktury i wpisy](#54-faktury-i-wpisy)
   - [5.5. Raporty](#55-raporty)
   - [5.6. Administracja](#56-administracja)
6. [Przepływy danych — scenariusze](#6-przepływy-danych--scenariusze)
7. [Harmonogram MVP](#7-harmonogram-mvp)
8. [Podsumowanie techniczne](#8-podsumowanie-techniczne)

---

## 1. Streszczenie projektu

System informatyczny służący do **obliczania, monitorowania i raportowania śladu węglowego** przedsiębiorstwa GO GLOBAL GROUP, zgodnie z metodyką **GHG Protocol (Greenhouse Gas Protocol)**. System obejmuje:

- **Zakres 1 (Scope 1)** — emisje bezpośrednie ze spalania paliw w instalacjach stacjonarnych (kotły, piece, agregaty) oraz w pojazdach firmowych.
- **Zakres 2 (Scope 2)** — emisje pośrednie wynikające z zakupu energii elektrycznej, cieplnej i chłodniczej.

Architektura systemu została zaprojektowana z myślą o przyszłej rozbudowie o **Zakres 3** (pozostałe emisje pośrednie w łańcuchu wartości — 15 kategorii wg GHG Protocol).

---

## 2. Podstawa metodologiczna

### 2.1. GHG Protocol — zasada obliczania emisji

Obliczanie śladu węglowego opiera się na fundamentalnym wzorze:

> **Emisja CO₂e [kg] = Zużycie [jednostka] × Wskaźnik emisyjny [kg CO₂e / jednostka]**

Gdzie:
- **Zużycie** to ilość paliwa/energii w jednostce naturalnej (litry, m³, kWh, GJ, tony)
- **Wskaźnik emisyjny** (emission factor) publikowany jest przez KOBIZE (dla energii elektrycznej) oraz przez IPCC/GHG Protocol dla standardowych paliw

**Przykład — Zakres 1 (spalanie oleju napędowego w pojeździe):**
- Zużycie: 500 litrów ON
- Wskaźnik emisyjny ON: 2,62 kg CO₂e / litr *(wartość referencyjna GHG Protocol)*
- Emisja = 500 × 2,62 = **1 310 kg CO₂e = 1,31 tony CO₂e**

**Przykład — Zakres 2 (zakup energii elektrycznej):**
- Zużycie: 10 000 kWh
- Wskaźnik emisyjny dla Polski (KOBIZE 2024, publikacja grudzień 2025): ~0,685 kg CO₂e / kWh
- Emisja = 10 000 × 0,685 = **6 850 kg CO₂e = 6,85 tony CO₂e**

### 2.2. KOBIZE — Krajowy Ośrodek Bilansowania i Zarządzania Emisjami

KOBIZE (IOŚ-PIB) co roku publikuje **wskaźniki emisyjności dla energii elektrycznej** w oparciu o Krajową bazę o emisjach gazów cieplarnianych i innych substancji. System:
- Jest fabrycznie zasilony aktualnymi wskaźnikami KOBIZE (energia elektryczna) oraz standardowymi wskaźnikami GHG Protocol (paliwa: ON, benzyna, gaz ziemny, LPG, węgiel itp.)
- Umożliwia **aktualizację wskaźników przez import pliku XML** pobranego z KOBIZE (nowe wersje z datą obowiązywania)
- Umożliwia **ręczne dodawanie własnych wskaźników** przez Managera (np. dane od dostawcy energii)
- Każdy wskaźnik jest **wersjonowany** (z polami `validFrom`–`validTo`) — zmiana wskaźnika nie modyfikuje historycznych obliczeń

### 2.3. Otoczenie regulacyjne UE

System przygotowuje firmę do zgodności z:
- **CSRD (Corporate Sustainability Reporting Directive)** — obowiązek raportowania ESG dla dużych przedsiębiorstw
- **ESRS E1 (European Sustainability Reporting Standards — Climate Change)** — standard raportowania zmian klimatu, obejmujący 9 wymogów ujawnieniowych (DR) w tym emisje Scope 1 i 2 (DR E1-6)
- **NFRD (Non-Financial Reporting Directive)** — poprzedniczka CSRD
- **Dyrektywa o sprawozdawczości niefinansowej** — wymóg ujawniania danych środowiskowych

Raporty generowane przez system są strukturyzowane zgodnie z wymaganiami ESRS E1: zawierają dane zagregowane w tonach CO₂e z podziałem na Scope 1 i Scope 2, porównania okres-do-okresu oraz wskazanie metodologii (location-based dla Scope 2).

---

## 3. Struktura organizacyjna i role

### 3.1. Model uprawnień (v1)

System obsługuje **jedną firmę, jeden oddział**, z podziałem na dwa typy kont:

| Rola | Uprawnienia |
|------|-------------|
| **Manager** | Pełny dostęp: zarządzanie źródłami emisji, współczynnikami, fakturami i wpisami (edycja, zatwierdzanie, usuwanie), generowanie raportów, zapraszanie pracowników (wysyłka e-mail z linkiem aktywacyjnym przez aplikację), przegląd dziennika audytu |
| **Pracownik** | Ograniczony dostęp: wprowadzanie odczytów i faktur (ręcznie i przez import plików), edycja **tylko własnych** wpisów w statusie "Szkic", podgląd dashboardu i raportów. Nie może zatwierdzać ani usuwać wpisów |

### 3.2. Przyszła rozbudowa — działy

W v1 nie są potrzebne. Architektura jest jednak przygotowana na dodanie encji `Department` z polem `parentId` (hierarchia), dzięki czemu w przyszłości Manager otrzyma dostęp tylko do danych swojego działu.

---

## 4. Model danych i przepływ informacji

### 4.1. Główne encje systemu

```
┌──────────────────────────────────────────────────────────┐
│                    WSPÓŁCZYNNIK EMISJI                    │
│  (EmissionFactor)                                         │
│                                                           │
│  • Nazwa (np. "Energia elektr. PL - KOBIZE 2024")        │
│  • Wartość (np. 0,685 kg CO₂e/kWh)                       │
│  • Jednostka (kg CO₂e/kWh, kg CO₂e/litr, itd.)           │
│  • Źródło: KOBIZE / GHG Protocol / Własny                │
│  • Zakres: Scope 1 / Scope 2                             │
│  • Kategoria: Energia elektr. / ON / Benzyna / Gaz...    │
│  • Ważny od – Ważny do (wersjonowanie)                   │
└──────────┬───────────────────────────────────────────────┘
           │ przypisany do
           ▼
┌──────────────────────────────────────────────────────────┐
│                    ŹRÓDŁO EMISJI                          │
│  (EmissionSource)                                         │
│                                                           │
│  • Nazwa (np. "Kocioł gazowy - hala A", "VW Transporter")│
│  • Typ: Stacjonarne / Pojazd / Energia elektr. / Ciepło  │
│  • Zakres: Scope 1 / Scope 2                             │
│  • Domyślny wskaźnik emisji (↑ powiązanie)               │
│  • Jednostka miary (litr, m³, kWh)                       │
│  • Numer rejestracyjny / lokalizacja (opcjonalnie)       │
└──────────┬───────────────────────────────────────────────┘
           │ generuje wpisy przez
           ▼
┌──────────────────────────────────────────────────────────┐
│                     FAKTURA (opcjonalnie)                 │
│  (Invoice)                                                │
│                                                           │
│  • Numer faktury / nazwa pliku                           │
│  • Data wystawienia / Data wpływu                        │
│  • Źródło: Ręczna / KSeF XML / WF-MAG / CSV / XLSX      │
│  • Status importu: Oczekuje / Przetworzona / Błędy       │
│  • Plik źródłowy (opcjonalnie)                           │
└──────────┬───────────────────────────────────────────────┘
           │ zawiera wiele
           ▼
┌──────────────────────────────────────────────────────────┐
│                     WPIS EMISYJNY                         │
│  (EmissionEntry)  ←←← PODSTAWOWA JEDNOSTKA DANYCH        │
│                                                           │
│  • Źródło emisji (↑ powiązanie)                          │
│  • Faktura (↑ powiązanie, opcjonalnie)                   │
│  • Data wpisu / Okres (od–do)                            │
│  • Ilość + jednostka (np. 500 litrów)                    │
│  • Wskaźnik użyty do obliczeń (snapshot z momentu wpisu) │
│  • Wyliczone CO₂e [kg] ← automatycznie                   │
│  • Wyliczone CO₂e [tony] ← automatycznie                 │
│  • Status: Szkic → Zweryfikowany → Skorygowany           │
│  • Autor wpisu / Osoba zatwierdzająca                    │
└──────────────────────────────────────────────────────────┘
```

### 4.2. Kluczowa zasada: wersjonowanie wskaźników

Wpis emisyjny **zawsze przechowuje snapshot** wskaźnika emisyjnego użytego w momencie kalkulacji (wartość + jednostka). Dzięki temu:
- Aktualizacja wskaźnika przez KOBIZE (co rok) nie zmienia historycznych obliczeń
- Każdy wpis jest odtwarzalny i audytowalny
- Można zidentyfikować, którą wersją wskaźnika posłużono się dla danego okresu

### 4.3. Uproszczony diagram przepływu danych

```
KSeF XML ───┐
WF-MAG CSV ─┤
Ręczne wpisy┄┼──→ FAKTURA ──→ WPISY EMISYJNE ──→ RAPORT PDF/XLSX/CSV
KOBIZE XML ─┘                    │
                                 │ automatyczne przeliczenie
                                 ▼
                         WSPÓŁCZYNNIKI EMISJI
                         (KOBIZE / GHG / własne)
                                 │
                                 ▼
                          CO₂e [kg] = ilość × wskaźnik
```

---

## 5. Zakładki aplikacji — szczegółowy opis

Aplikacja składa się z **6 zakładek** dostępnych z bocznego menu (sidebar). Każda zakładka jest opisana poniżej z podziałem na: cel, widoki, akcje, walidacje.

---

### 5.1. Dashboard

**Funkcja:** Strona główna po zalogowaniu. Szybki podgląd kluczowych wskaźników (KPI) emisyjności firmy.

#### Widżety

| Widżet | Treść |
|--------|-------|
| KPI: Całkowite CO₂e | Suma emisji w tonach CO₂e za bieżący rok kalendarzowy (Scope 1 + Scope 2) |
| KPI: Scope 1 | Emisje bezpośrednie [t CO₂e] — paliwa stacjonarne + pojazdy |
| KPI: Scope 2 | Emisje pośrednie [t CO₂e] — energia elektryczna + cieplna + chłodnicza |
| KPI: Zmiana % | Porównanie bieżącego roku do poprzedniego (YoY) — zielona/czerwona strzałka |
| Wykres słupkowy | Emisje miesięczne (stacked: Scope 1 vs Scope 2) za ostatnie 12 miesięcy |
| Top 5 źródeł | Tabela: nazwa źródła → CO₂e [t] → % udziału w całkowitej emisji |

#### Filtry

- Zakres dat (domyślnie: bieżący rok kalendarzowy)
- Zakres emisji (Scope 1 / Scope 2 / Oba)

#### Zachowanie

- Dashboard przelicza dane w czasie rzeczywistym na podstawie zatwierdzonych wpisów emisyjnych
- Jeśli brak danych za poprzedni rok, KPI "Zmiana %" pokazuje "—" (brak danych)
- Wykres słupkowy pokazuje miesiące z zerową emisją jako puste słupki (nie ukrywa ich)

---

### 5.2. Źródła emisji

**Funkcja:** Zarządzanie katalogiem instalacji, pojazdów i punktów poboru energii. Każde źródło ma przypisany domyślny wskaźnik emisji.

#### Typy źródeł (Scope 1 i 2)

| Typ | Zakres | Przykłady | Jednostki |
|-----|--------|-----------|-----------|
| Instalacja stacjonarna | Scope 1 | Kocioł gazowy, piec olejowy, agregat prądotwórczy | litr, m³, kg, tona |
| Pojazd firmowy | Scope 1 | Samochód dostawczy, wózek widłowy, ciągnik | litr, kg |
| Energia elektryczna | Scope 2 | Licznik główny, licznik hali A | kWh, MWh |
| Energia cieplna | Scope 2 | Ciepło sieciowe, kocioł wspólnotowy | GJ, kWh |
| Energia chłodnicza | Scope 2 | Klimatyzacja centralna | kWh |

#### Widok: Lista źródeł

- Tabela z kolumnami: Nazwa, Typ, Zakres, Domyślny wskaźnik, Jednostka, Aktywny (tak/nie), Akcje
- Filtry: typ źródła, zakres, status (aktywne/nieaktywne)
- Paginacja (mała liczba rekordów, ~20-50)

#### Akcje

| Akcja | Dostęp | Opis |
|-------|--------|------|
| Dodaj źródło | Manager | Formularz z polami: nazwa, typ (select), domyślny wskaźnik (select z listy aktywnych wskaźników), jednostka, dodatkowe info (np. nr rej.) |
| Edytuj źródło | Manager | Zmiana nazwy, typu, wskaźnika, dezaktywacja |
| Dezaktywuj | Manager | Źródło znika z list wyboru przy dodawaniu wpisów, ale historyczne wpisy pozostają |

#### Walidacje

- Nazwa źródła musi być unikalna w ramach typu
- Domyślny wskaźnik musi być aktywny w momencie przypisania
- Przy dezaktywacji: sprawdzenie czy nie ma wpisów "Szkic" przypisanych do tego źródła

---

### 5.3. Współczynniki emisji

**Funkcja:** Centralny katalog wskaźników emisyjnych. Wskaźniki są wersjonowane datami obowiązywania — system automatycznie stosuje właściwą wersję na podstawie daty wpisu emisyjnego.

#### Widok: Lista wskaźników

- Tabela pogrupowana wg kategorii (Energia elektryczna, Paliwa ciekłe, Paliwa gazowe, Ciepło, Chłodnictwo)
- Kolumny: Nazwa, Kategoria, Wartość, Jednostka, Źródło (KOBIZE/GHG/Własny), Ważny od, Ważny do, Akcje
- Wskaźniki przeterminowane (ważny do < dziś) oznaczone szarym kolorem

#### Akcje

| Akcja | Dostęp | Opis |
|-------|--------|------|
| Dodaj ręcznie | Manager | Formularz: nazwa, kategoria (select), wartość liczbowa, jednostka (np. kg CO₂e/kWh), źródło (KOBIZE/GHG/Własny), zakres (Scope 1/2), data obowiązywania od–do |
| Import z KOBIZE XML | Manager | Upload pliku XML pobranego z kobize.pl → system parsuje XML, tworzy nowe wersje wskaźników z datą `validFrom` = data publikacji KOBIZE |
| Edytuj | Manager | Zmiana wartości, daty obowiązywania, nazwy |
| Historia wersji | Manager | Modal pokazujący wszystkie wersje danego wskaźnika z datami i wartościami |

#### Mechanizm wersjonowania — szczegóły

1. Manager dodaje wskaźnik "Energia elektr. PL" z wartością **0,685 kg CO₂e/kWh**, ważny od 01.01.2025 do 31.12.2025
2. W grudniu 2025 KOBIZE publikuje nowe wskaźniki za 2024 rok
3. Manager importuje XML z KOBIZE → system tworzy **nową wersję**: "Energia elektr. PL" z wartością **0,642 kg CO₂e/kWh**, ważny od 01.01.2026 do 31.12.2026
4. Wszystkie wpisy emisyjne z 2025 roku **zachowują** wartość 0,685
5. Nowe wpisy z 2026 roku automatycznie otrzymują wartość 0,642

#### Seed danych (fabryczne zasilenie)

System jest dostarczany z predefiniowanymi wskaźnikami:

| Kategoria | Wskaźnik | Wartość | Jednostka | Źródło |
|-----------|----------|---------|-----------|--------|
| Energia elektr. | Energia elektr. PL (KOBIZE 2024) | 0,685 | kg CO₂e/kWh | KOBIZE |
| Paliwa ciekłe | Olej napędowy | 2,62 | kg CO₂e/litr | GHG Protocol |
| Paliwa ciekłe | Benzyna silnikowa | 2,30 | kg CO₂e/litr | GHG Protocol |
| Paliwa ciekłe | LPG | 1,66 | kg CO₂e/litr | GHG Protocol |
| Paliwa gazowe | Gaz ziemny | 1,99 | kg CO₂e/m³ | GHG Protocol |
| Paliwa stałe | Węgiel kamienny energetyczny | 2,45 | kg CO₂e/kg | GHG Protocol |
| Ciepło | Ciepło sieciowe (PL) | 0,38 | kg CO₂e/kWh | GHG Protocol |

---

### 5.4. Faktury i wpisy

**Funkcja:** Główne narzędzie wprowadzania danych emisyjnych. Obsługuje trzy ścieżki: ręczne dodawanie, import plików (XML/CSV/XLSX), import faktur KSeF. Jedna faktura może generować wiele wpisów emisyjnych.

#### 5.4.1. Widok: Lista faktur

- Tabela: Numer faktury, Data, Źródło (Ręczna/KSeF/CSV/WF-MAG), Liczba wpisów, Suma CO₂e, Status (Szkic/Zweryfikowany), Akcje
- Filtry: data od–do, źródło, zakres (Scope 1/2), status
- Kliknięcie w fakturę → rozwinięcie listy wpisów emisyjnych wewnątrz

#### 5.4.2. Dodawanie ręczne

**Krok 1: Dane nagłówkowe faktury (opcjonalne)**
- Numer faktury, data wystawienia, data wpływu
- Możliwość pominięcia — system generuje automatyczny identyfikator

**Krok 2: Dodawanie pozycji (rekordów emisyjnych)**

Każda pozycja to jeden wpis:

| Pole | Opis |
|------|------|
| Źródło emisji | Select z listy aktywnych źródeł (sekcja 5.2.) |
| Wskaźnik emisji | Auto-wybór na podstawie źródła (możliwość ręcznej zmiany) |
| Data zużycia | Data, której dotyczy wpis |
| Ilość | Wartość liczbowa |
| Jednostka | Auto-wybór na podstawie źródła (możliwość zmiany) |
| Wyliczone CO₂e | Automatycznie: `ilość × wskaźnik.wartość` |
| Notatka | Opcjonalne pole tekstowe |

**Krok 3: Zapis**
- Przycisk "Zapisz jako szkic" → status: Szkic
- Przycisk "Zapisz i zweryfikuj" (tylko Manager) → status: Zweryfikowany
- Pracownik widzi tylko "Zapisz jako szkic"

#### 5.4.3. Import plików (CSV / XLSX / XML)

**Flow importu:**

```
1. Upload pliku
   ├── CSV/XLSX: kreator mapowania kolumn (interaktywny, "przeciągnij kolumnę na pole")
   └── XML (KSeF / KOBIZE): automatyczne parsowanie według schematu FA(3) / schemat KOBIZE

2. Walidacja ("dry run")
   ├── Sprawdzenie typów danych (ilość musi być liczbą > 0)
   ├── Sprawdzenie kompletności (wymagane pola niepuste)
   ├── Sprawdzenie zgodności jednostek
   ├── Sprawdzenie czy źródło emisji istnieje w systemie
   └── Raport błędów: lista wierszy z problemami + opis błędu

3. Podgląd przed importem
   ├── Tabela z przeliczonym CO₂e
   ├── Możliwość ręcznej korekty pojedynczych wierszy
   └── Możliwość odrzucenia całego pliku

4. Zapis do bazy
   ├── Wszystkie poprawne wiersze → status "Szkic" (lub "Zweryfikowany" jeśli Manager)
   └── Błędne wiersze → pominięte, raport do pobrania
```

**Import XML z KSeF (FA(3)):**
- System parsuje strukturę FA(3) obowiązującą od 01.02.2026
- Wyodrębnia pozycje faktury (nazwa towaru/usługi, ilość, jednostka, cena)
- Automatycznie próbuje przypisać pozycje do źródeł emisji na podstawie nazwy/słownika
- Manager może ręcznie skorygować przypisania przed zatwierdzeniem

**Import z WF-MAG:**
- Dedukowany szablon mapowania po otrzymaniu przykładowego pliku od klienta
- Oczekiwane kolumny: data, pojazd/instalacja, rodzaj paliwa, ilość, jednostka

#### 5.4.4. Zarządzanie wpisami

| Akcja | Manager | Pracownik |
|-------|---------|-----------|
| Edycja wpisu | Tak (wszystkie) | Tylko własne w statusie "Szkic" |
| Zmiana statusu: Szkic → Zweryfikowany | Tak | Nie |
| Zmiana statusu: Zweryfikowany → Skorygowany | Tak | Nie |
| Usunięcie wpisu | Tak | Nie |

#### 5.4.5. Dziennik zmian (Audit Trail)

Każda zmiana wpisu emisyjnego jest logowana:
- Kto zmienił (użytkownik)
- Kiedy (data i czas)
- Co zmienił (stara wartość → nowa wartość)
- Z jakiego adresu IP

---

### 5.5. Raporty

**Funkcja:** Generowanie raportów okresowych (miesięcznych, kwartalnych, rocznych, niestandardowych) w formatach PDF, XLSX i CSV.

#### 5.5.1. Widok: Generator raportów

**Krok 1: Wybór parametrów**
- Typ raportu: Miesięczny / Kwartalny / Roczny / Niestandardowy
- Okres: od–do (dla miesięcznego: wybór miesiąca i roku; dla rocznego: wybór roku)
- Zakres: Scope 1 / Scope 2 / Oba
- Format: PDF / XLSX / CSV
- Grupowanie: wg źródła / wg miesiąca / wg zakresu

**Krok 2: Generowanie**
- Przycisk "Generuj" → przetwarzanie po stronie serwera
- Progress bar dla dużych raportów
- Po wygenerowaniu: link do pobrania pliku

**Krok 3: Archiwum**
- Lista wcześniej wygenerowanych raportów z możliwością ponownego pobrania
- Kolumny: Data wygenerowania, Typ, Okres, Format, Wygenerował

#### 5.5.2. Zawartość raportu PDF

Raport PDF zawiera (układ jednostronicowy lub wielostronicowy):

1. **Strona tytułowa**
   - Nazwa firmy: GO GLOBAL GROUP
   - Tytuł: "Raport śladu węglowego"
   - Okres raportowania
   - Data wygenerowania raportu
   - Osoba generująca

2. **Podsumowanie wykonawcze**
   - Tabela: Scope 1 [t CO₂e], Scope 2 [t CO₂e], Razem [t CO₂e]
   - Porównanie do poprzedniego okresu (zmiana %)

3. **Tabela szczegółowa**
   - Źródło emisji → Ilość → Jednostka → Wskaźnik emisyjny → CO₂e [kg] → CO₂e [t]
   - Podział na Scope 1 i Scope 2
   - Sumy częściowe dla każdej kategorii

4. **Wykres kołowy**
   - Udział procentowy Scope 1 vs Scope 2 w całkowitej emisji

5. **Metodologia**
   - Informacja o zastosowanych wskaźnikach (KOBIZE, GHG Protocol)
   - Informacja o metodzie location-based dla Scope 2
   - Zakres raportowania (Scope 1 i 2 wg GHG Protocol)

6. **Stopka**
   - Numer strony
   - Data i godzina wygenerowania
   - "Wygenerowano automatycznie przez system śladu węglowego GO GLOBAL GROUP"

#### 5.5.3. Eksport XLSX/CSV

- Format tabelaryczny: wszystkie kolumny raportu szczegółowego
- Jeden wiersz = jeden wpis emisyjny
- Dodatkowe kolumny: kategoria, status wpisu, autor

---

### 5.6. Administracja

**Funkcja:** Zarządzanie użytkownikami i przegląd dziennika audytu. Dostępne tylko dla roli **Manager**.

#### 5.6.1. Zarządzanie użytkownikami

**Widok: Lista użytkowników**
- Tabela: Imię i nazwisko, E-mail, Rola (Manager/Pracownik), Data utworzenia, Aktywny

**Akcje:**

| Akcja | Opis |
|-------|------|
| Zaproś pracownika | Manager wpisuje adres e-mail nowego pracownika → system wysyła e-mail z linkiem aktywacyjnym (unikalny token, ważny 48h). Po kliknięciu: formularz ustawienia hasła → konto aktywne |
| Dezaktywuj konto | Blokada logowania bez usuwania danych historycznych |
| Reset hasła | Wysłanie nowego linku aktywacyjnego |

**Proces zapraszania — szczegóły:**
1. Manager klika "Zaproś pracownika" w zakładce Administracja
2. Wpisuje adres e-mail i wybiera rolę "Pracownik"
3. System generuje unikalny token (JWT, 48h ważności) i wysyła e-mail (przez nodemailer / Resend)
4. Pracownik otrzymuje e-mail z tytułem "Zaproszenie do systemu śladu węglowego GO GLOBAL GROUP"
5. Po kliknięciu linku: formularz z polami: imię, nazwisko, hasło (z walidacją min. 8 znaków, 1 wielka litera, 1 cyfra)
6. Konto zostaje aktywowane — pracownik może się zalogować

#### 5.6.2. Dziennik audytu

- Tabela: Data i czas, Użytkownik, Akcja (CREATE/UPDATE/DELETE/LOGIN), Encja (Źródło emisji/Wpis/Współczynnik), ID encji, Szczegóły zmiany
- Filtry: data od–do, użytkownik, typ akcji
- Tylko do odczytu (brak możliwości edycji/usuwania wpisów audytu)
- Eksport dziennika do CSV

---

## 6. Przepływy danych — scenariusze

### Scenariusz A: Ręczne dodanie zużycia paliwa (Scope 1)

```
1. Pracownik loguje się do systemu
2. Wchodzi w zakładkę "Faktury i wpisy"
3. Klika "Dodaj ręcznie"
4. Wypełnia dane nagłówkowe (np. data, notatka "Tankowanie - listopad 2026")
5. Dodaje pozycję:
   ├── Źródło emisji: "VW Transporter WZ 12345"
   ├── Wskaźnik: auto-wybór "Olej napędowy - 2,62 kg CO₂e/litr"
   ├── Ilość: 120 litrów
   ├── Jednostka: litr
   └── Wyliczone CO₂e: 314,4 kg (automatycznie)
6. Klika "Zapisz jako szkic"
7. Manager loguje się, widzi wpis w statusie "Szkic"
8. Manager weryfikuje dane → zmienia status na "Zweryfikowany"
9. Wpis jest widoczny na Dashboardzie i w Raportach
```

### Scenariusz B: Import faktury z KSeF XML (Scope 1 i Scope 2)

```
1. Manager pobiera XML faktury z KSeF (przez przeglądarkę KSeF)
2. Wchodzi w zakładkę "Faktury i wpisy" → "Importuj plik"
3. Wybiera plik XML → system rozpoznaje format FA(3) KSeF
4. System parsuje XML:
   ├── Wyodrębnia numer faktury, datę, pozycje
   ├── Pozycja 1: "Olej napędowy 500L" → auto-mapowanie na źródło "Zbiornik ON - hala A"
   ├── Pozycja 2: "Energia elektryczna 2000 kWh" → auto-mapowanie na źródło "Licznik główny"
   └── Podgląd z przeliczonym CO₂e
5. Manager sprawdza mapowania:
   ├── Pozycja 1: OK, potwierdza
   └── Pozycja 2: zmienia źródło na "Licznik hala B" (ręczna korekta)
6. Manager klika "Zatwierdź import"
7. System tworzy 1 fakturę z 2 wpisami emisyjnymi (status: Zweryfikowany)
8. Dane pojawiają się na Dashboardzie
```

### Scenariusz C: Aktualizacja wskaźników z KOBIZE XML

```
1. KOBIZE publikuje nowe wskaźniki (np. grudzień 2026)
2. Manager pobiera plik XML ze strony kobize.pl
3. Wchodzi w zakładkę "Współczynniki emisji" → "Import z KOBIZE"
4. Upload pliku XML
5. System parsuje XML:
   ├── Rozpoznaje wskaźnik "Energia elektryczna PL"
   ├── Odczytuje nową wartość: 0,642 kg CO₂e/kWh
   └── Tworzy nową wersję z validFrom = 01.01.2027
6. Manager widzi podgląd: stara wartość 0,685 → nowa wartość 0,642
7. Manager zatwierdza
8. Wszystkie nowe wpisy emisyjne od 01.01.2027 używają wartości 0,642
9. Wszystkie historyczne wpisy z 2026 roku zachowują wartość 0,685
```

### Scenariusz D: Import danych z WF-MAG (Scope 1)

```
1. Pracownik eksportuje dane z systemu WF-MAG do pliku CSV
2. Wchodzi w zakładkę "Faktury i wpisy" → "Importuj plik"
3. Wybiera plik CSV → system otwiera kreator mapowania
4. Kreator mapowania:
   ├── Kolumna A ("Data") → mapuje na pole "Data zużycia"
   ├── Kolumna B ("Pojazd") → mapuje na pole "Źródło emisji"
   ├── Kolumna C ("Paliwo") → mapuje na pole "Wskaźnik emisji" (przez słownik)
   └── Kolumna D ("Ilość L") → mapuje na pole "Ilość", jednostka "litr"
5. Pracownik zapisuje szablon mapowania jako "WF-MAG standard" (do ponownego użycia)
6. System wykonuje walidację "dry run" → 0 błędów
7. Pracownik klika "Importuj"
8. System tworzy wpisy emisyjne w statusie "Szkic"
9. Manager weryfikuje i zatwierdza
```

---

## 7. Harmonogram MVP

**Deadline:** 03.11.2026  
**Dostępny czas:** ~4,5 miesiąca (20 tygodni)  
**Zespół:** 1 deweloper full-stack

### Faza 1 — Fundament (do 18.07.2026) — 2 tygodnie

| Zadanie | Czas |
|---------|------|
| Inicjalizacja projektu (Next.js 15 + TypeScript + Tailwind CSS 4 + shadcn/ui) | 1 dzień |
| Konfiguracja bazy danych PostgreSQL (Neon DB) + Prisma ORM + migracje | 1 dzień |
| Schemat bazy: User, EmissionSource, EmissionFactor, EmissionEntry, Invoice, AuditLog | 2 dni |
| System autoryzacji (NextAuth.js v5): logowanie, rejestracja, JWT, middleware ochrony routingu | 2 dni |
| Layout aplikacji: sidebar nawigacyjny, górny pasek, responsywność, design system shadcn/ui | 3 dni |
| Seed danych: predefiniowane wskaźniki KOBIZE + GHG Protocol (7 wskaźników) | 1 dzień |

### Faza 2 — Scope 1 i 2 (do 23.08.2026) — 5 tygodni

| Zadanie | Czas |
|---------|------|
| **Zakładka: Źródła emisji** — CRUD, lista z filtrami, przypisywanie wskaźników | 3 dni |
| **Zakładka: Współczynniki emisji** — lista, dodawanie ręczne, edycja, wersjonowanie | 3 dni |
| **Zakładka: Współczynniki** — import XML z KOBIZE (parser XML + logika wersji) | 2 dni |
| **Zakładka: Faktury i wpisy** — formularz ręcznego dodawania, auto-przeliczanie CO₂e | 3 dni |
| **Zakładka: Faktury i wpisy** — import CSV/XLSX z kreatorem mapowania kolumn | 3 dni |
| **Zakładka: Faktury i wpisy** — import XML KSeF (parser FA(3), auto-mapowanie) | 2 dni |
| **Zakładka: Faktury i wpisy** — statusy wpisów (Szkic/Zweryfikowany/Skorygowany), edycja | 2 dni |
| Mechanizm wersjonowania wskaźników + snapshot w EmissionEntry | 2 dni |
| Walidacje Zod (serwer + klient) dla wszystkich formularzy | 2 dni |
| Dziennik audytu (automatyczne logowanie CRUD) | 1 dzień |

### Faza 3 — Dashboard i Raporty (do 20.09.2026) — 4 tygodnie

| Zadanie | Czas |
|---------|------|
| **Dashboard** — KPI cards (całkowite CO₂e, Scope 1, Scope 2, zmiana YoY) | 2 dni |
| **Dashboard** — wykres słupkowy miesięczny (Recharts), Top 5 źródeł | 2 dni |
| **Raporty** — silnik generowania PDF (z wykresami, tabelami, stopką metodologiczną) | 4 dni |
| **Raporty** — szablon PDF zgodny z ESRS E1 (opisany w sekcji 5.5.2.) | 2 dni |
| **Raporty** — generowanie XLSX i CSV, archiwum raportów | 2 dni |
| **Zakładka: Administracja** — lista użytkowników, zapraszanie (e-mail), dezaktywacja | 3 dni |
| **Zakładka: Administracja** — dziennik audytu (widok + filtrowanie + eksport CSV) | 2 dni |

### Faza 4 — Integracje i finalizacja (do 18.10.2026) — 4 tygodnie

| Zadanie | Czas |
|---------|------|
| Import WF-MAG — dedykowany szablon mapowania (po otrzymaniu przykładowego pliku) | 2 dni |
| Obsługa XML dla faktur własnych (poza KSeF) | 1 dzień |
| Powiadomienia e-mail: zaproszenie pracownika, reset hasła | 1 dzień |
| Testy integracyjne (end-to-end scenariusze A–D) | 3 dni |
| Dokumentacja techniczna (README.md, schemat bazy, instrukcja wdrożenia) | 3 dni |
| Dokumentacja użytkowa w j. polskim (podręcznik Managera, podręcznik Pracownika) | 3 dni |

### Faza 5 — Wdrożenie i UAT (do 03.11.2026) — 2 tygodnie

| Zadanie | Czas |
|---------|------|
| Wdrożenie produkcyjne na Vercel + Neon DB | 1 dzień |
| Konfiguracja domeny, SSL, zmienne środowiskowe | 1 dzień |
| Testy akceptacyjne (UAT) z użytkownikami GO GLOBAL GROUP | 5 dni |
| Poprawki po UAT | 3 dni |
| Szkolenie (sesja online ~2h lub dokumentacja wideo) | 1 dzień |
| Przekazanie kodu źródłowego (repozytorium Git) | 1 dzień |

**Łącznie: 20 tygodni — zakończenie 03.11.2026**  

### Kamienie milowe

| Data | Kamień milowy | Co jest gotowe |
|------|---------------|----------------|
| 18.07.2026 | Fundament | Działająca aplikacja z logowaniem, pustym layoutem, seedem wskaźników |
| 23.08.2026 | Core v1 | Wszystkie zakładki Scope 1 i 2 działają (bez raportów PDF) |
| 20.09.2026 | Raporty i Admin | Dashboard, raporty PDF/XLSX/CSV, administracja użytkownikami |
| 18.10.2026 | Feature complete | Wszystkie funkcje gotowe, dokumentacja, testy |
| 03.11.2026 | **PRODUKCJA** | Wdrożone, przeszkolone, odebrane |

---

## 8. Podsumowanie techniczne

### Stack technologiczny

| Warstwa | Technologia |
|---------|-------------|
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript |
| Stylizacja | Tailwind CSS 4 + shadcn/ui (komponenty Radix UI) |
| Backend API | Next.js Server Actions + API Routes |
| Baza danych | PostgreSQL (Neon DB) + Prisma ORM |
| Walidacja | Zod (serwer + klient) |
| Autoryzacja | NextAuth.js v5 (Auth.js) — credentials + JWT |
| Import plików | SheetJS (XLSX) + PapaParse (CSV) + fast-xml-parser (XML) |
| Generowanie PDF | jsPDF + jspdf-autotable |
| Wykresy | Recharts |
| E-mail | Resend / Nodemailer |
| Deployment | Vercel + GitHub CI/CD |
| Monitoring | Vercel Analytics + Neon DB monitoring |

### Architektura — modularny monolit

```
src/
├── app/                    # Next.js App Router (strony, layouty)
│   ├── (auth)/            # Strony logowania/rejestracji
│   └── (dashboard)/       # Chronione strony aplikacji
│       ├── dashboard/     # Strona główna z KPI
│       ├── sources/       # Źródła emisji
│       ├── factors/       # Współczynniki emisji
│       ├── invoices/      # Faktury i wpisy
│       ├── reports/       # Raporty
│       └── admin/         # Administracja
├── components/            # Komponenty React (ui/, forms/, charts/)
├── lib/                   # Logika biznesowa, Prisma client, utils
├── server/                # Server Actions, API routes
├── schemas/               # Schematy Zod
└── prisma/                # Schema bazy danych, migracje, seed
```

### Bezpieczeństwo

- Hasła hashowane bcrypt (NextAuth.js credentials provider)
- Sesje JWT z rotacją tokenów
- Middleware Next.js blokujące dostęp do routów na podstawie roli
- Walidacja Zod na wszystkich danych wejściowych (formularze + API)
- HTTPS wymuszany na Vercel
- Automatyczne backupy Neon DB (point-in-time recovery)
- Dziennik audytu wszystkich operacji CRUD

---

## Dokumenty źródłowe

- Brief techniczny GO GLOBAL GROUP z 07.05.2026
- Załącznik nr 1 do OPZ — Opis Przedmiotu Zamówienia
- GHG Protocol — Corporate Accounting and Reporting Standard
- KOBIZE — Wskaźniki emisyjności dla energii elektrycznej (publikacja grudzień 2025)
- CSRD / ESRS E1 — Delegated Regulation (EU) 2023/2772

---

*Dokument przygotowany na podstawie analizy wymagań, odpowiedzi Zamawiającego na pytania uzupełniające oraz konsultacji technicznej.*
