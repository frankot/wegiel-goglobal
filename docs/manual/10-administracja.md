# Administracja

**Tylko Analityk** — sekcja służy do zapraszania osób do systemu i zarządzania ich dostępem.

## Zapraszanie użytkownika

1. Przejdź do **Administracja**.
2. Wpisz **adres e-mail** osoby i wybierz **rolę**:
   - **Analityk** — pełna praca z danymi i zarządzanie użytkownikami,
   - **Użytkownik** — podgląd danych, pobieranie raportów, dodawanie faktur jako szkice.
3. Kliknij **Wyślij zaproszenie**.

Osoba otrzyma e-mail z przyciskiem **Aktywuj konto**. Link jest ważny **7 dni** — po jego otwarciu ustawia imię, nazwisko i hasło. Do tego czasu na liście widnieje status **Zaproszenie wysłane**.

Jeśli wysyłka e-maili nie jest skonfigurowana albo się nie powiedzie, system pokaże link aktywacyjny z przyciskiem **Kopiuj link** — przekaż go zapraszanej osobie samodzielnie (np. w wiadomości).

## Lista użytkowników

| Status | Znaczenie |
|---|---|
| **Aktywne** | Osoba ma konto i może się logować. |
| **Zaproszenie wysłane** | Czeka na aktywację; obok widać termin ważności linku. |
| **Zaproszenie wygasło** | Link stracił ważność — wyślij go ponownie. |
| **Nieaktywne** | Konto dezaktywowane — logowanie jest zablokowane. |

Dostępne czynności:

- **Rola** — zmienisz ją, wybierając inną wartość z listy w wierszu użytkownika. Zmiana działa od następnego odświeżenia strony przez tę osobę.
- **Wyślij ponownie** — wysyła nowe zaproszenie (poprzedni link przestaje działać).
- **Anuluj zaproszenie (✕)** — usuwa oczekujące zaproszenie.
- **Link do zmiany hasła (ikona klucza)** — przy aktywnym koncie wysyła e-mail z linkiem do ustawienia nowego hasła (ważny 1 godzinę). Gdy e-mail nie zostanie wysłany, system pokaże link z przyciskiem **Kopiuj link** do przekazania.
- **Dezaktywuj / Aktywuj** — blokuje lub przywraca logowanie. Kont się nie usuwa: wpisy i faktury dodane przez daną osobę zostają w historii.

Nie możesz zmienić roli ani dezaktywować własnego konta.

## Dziennik zdarzeń

Zakładka **Dziennik zdarzeń** pokazuje historię operacji w systemie: kto, kiedy i co zrobił — logowania, zapis i usuwanie faktur, weryfikacje i korekty wpisów, zmiany źródeł, wskaźników i danych firmy, wygenerowane raporty oraz zaproszenia i zmiany kont.

- Każde zdarzenie jest opisane jednym zdaniem. Kliknij je, aby zobaczyć szczegóły — przy zmianach widać wartość poprzednią i nową (np. „Zweryfikowany → Skorygowany”).
- **Przejdź do obiektu** otwiera fakturę, źródło, wskaźnik lub raport, którego dotyczy zdarzenie — o ile nadal istnieje.
- Listę zawęzisz filtrami: **Użytkownik**, **Obiekt**, **Akcja** oraz zakresem dat **Od / Do**. Zdarzenia są wyświetlane po 50, od najnowszych.
- **Eksport CSV** na górnym pasku pobiera wszystkie zdarzenia pasujące do filtrów (np. dla audytora). Sam eksport też trafia do dziennika.

Czynności wykonane przez konto techniczne dostawcy systemu są widoczne jako **Administrator systemu**.

## Dokumentacja techniczna

Na stronie **Instrukcja obsługi** (ikona znaku zapytania na górnym pasku) widoczny jest link **Dokumentacja techniczna**. Zawiera opis budowy systemu, konfiguracji, wdrożenia, bezpieczeństwa i procedur utrzymaniowych — dla działu IT lub firmy utrzymującej system.
