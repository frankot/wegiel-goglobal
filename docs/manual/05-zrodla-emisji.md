# Źródła emisji

Źródło emisji to konkretna rzecz, której zużycie rejestrujesz: licznik prądu w biurze, kocioł gazowy w hali, samochód służbowy. Każda pozycja faktury jest przypisywana do jednego źródła.

## Lista źródeł

Tabela pokazuje dla każdego źródła: nazwę i lokalizację, typ, zakres, domyślny wskaźnik, jednostkę, identyfikatory (PPE, numer licznika lub rejestracyjny), liczbę wpisów (w nawiasie liczbę szkiców) oraz status **Aktywne / Nieaktywne**.

Listę możesz zawęzić filtrami: **typ źródła**, **zakres** oraz pole **Pokaż nieaktywne**.

Jeśli nad tabelą widzisz żółtą informację, że źródła energii nie mają numeru PPE ani licznika, oznacza to, że faktury nie przypiszą się do nich automatycznie. Uzupełnij identyfikatory z faktury.

## Typy źródeł

| Typ | Przykłady | Zakres | Jednostki |
|---|---|---|---|
| **Instalacja stacjonarna** | kocioł, piec, agregat prądotwórczy | Zakres 1 | m³, litr, kg, t |
| **Pojazd firmowy** | samochód, wózek widłowy, ciągnik | Zakres 1 | litr, kg |
| **Energia elektryczna** | licznik energii elektrycznej | Zakres 2 | kWh, MWh |
| **Energia cieplna** | ciepło sieciowe, węzeł cieplny | Zakres 2 | GJ, kWh |
| **Energia chłodnicza** | klimatyzacja, chłodnictwo | Zakres 2 | kWh |

## Dodawanie źródła

**Tylko Manager**

1. Kliknij **Dodaj źródło** na górnym pasku.
2. Podaj **nazwę**, np. „Licznik główny — hala A".
3. Wybierz **typ źródła**. Zakres ustawi się automatycznie.
4. Wybierz **jednostkę zużycia** i **domyślny wskaźnik**. Lista pokazuje tylko wskaźniki pasujące do zakresu i jednostki, które są nadal ważne.
5. Uzupełnij identyfikatory:
   - dla energii (prąd, ciepło, chłodzenie): **numer PPE**, **numer licznika**, **NIP dostawcy** — znajdziesz je na fakturze. Dzięki nim kolejne faktury przypiszą się do źródła automatycznie,
   - dla instalacji i pojazdów: **numer rejestracyjny / identyfikator**.
6. Opcjonalnie podaj **lokalizację**.
7. Kliknij **Dodaj źródło**.

Jeśli zobaczysz komunikat „Brak aktywnego wskaźnika…", najpierw dodaj odpowiedni wskaźnik w sekcji [Współczynniki emisji](#wspolczynniki-emisji).

Źródło możesz też dodać bezpośrednio podczas importu faktury — przyciskiem **+ nowe** przy polu źródła.

## Edycja źródła

**Tylko Manager** — kliknij ikonę ołówka w wierszu źródła, zmień dane i kliknij **Zapisz zmiany**.

## Dezaktywacja źródła

**Tylko Manager** — źródeł się **nie usuwa**, tylko dezaktywuje (historia emisji musi zostać zachowana). Kliknij ikonę zasilania w wierszu źródła. Tą samą ikoną źródło można ponownie aktywować.

Źródła nie da się dezaktywować, dopóki są do niego przypisane wpisy w statusie **Szkic**.
