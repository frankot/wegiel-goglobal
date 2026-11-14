# Akcje serwerowe i API

System nie udostępnia publicznego REST API. Interfejs komunikuje się z serwerem przez **Server Actions** (wywoływane z formularzy i komponentów) oraz kilka **route handlerów** do pobierania plików i zadań technicznych. Architektura pozwala dodać API w przyszłości: logika biznesowa jest wydzielona w `lib/` i może zostać wywołana z nowych route handlerów w `app/api/`.

Kolumna „Rola” oznacza minimalną rolę: **Wszyscy** = każdy zalogowany, **Analityk** = Analityk lub Administrator.

## Server Actions

### Konto i logowanie

| Akcja | Plik | Rola | Działanie |
|---|---|---|---|
| `login` | `lib/auth/actions.ts` | publiczna | Logowanie, blokada po błędach, utworzenie sesji |
| `logout` | `lib/auth/actions.ts` | Wszyscy | Usunięcie sesji |
| `activateAccount` | `lib/auth/activate.ts` | publiczna (token) | Aktywacja zaproszenia: imię, nazwisko, hasło |
| `requestPasswordReset` | `lib/auth/password-reset.ts` | publiczna | Wysłanie linku do zmiany hasła |
| `resetPassword` | `lib/auth/password-reset.ts` | publiczna (token) | Ustawienie nowego hasła |

### Faktury i wpisy

| Akcja | Plik | Rola | Działanie |
|---|---|---|---|
| `parseInvoiceBatch` | `lib/entries/actions.ts` | Wszyscy | Odczyt plików i podgląd — bez zapisu |
| `saveInvoiceBatch` | `lib/entries/actions.ts` | Wszyscy | Zapis faktur i wpisów (Użytkownik — tylko jako szkice) |
| `getInvoiceDetailAction`, `getEntriesForInvoice` | `lib/entries/actions.ts` | Wszyscy | Odczyt szczegółów faktury |
| `updateEntryQuantity` | `lib/entries/actions.ts` | autor szkicu / Analityk | Zmiana ilości i przeliczenie emisji |
| `verifyEntry`, `verifyInvoiceDrafts` | `lib/entries/actions.ts` | Analityk | Weryfikacja wpisu / wszystkich szkiców faktury |
| `correctEntry` | `lib/entries/actions.ts` | Analityk | Oznaczenie wpisu jako skorygowanego |
| `deleteEntry`, `deleteInvoice` | `lib/entries/actions.ts` | Analityk | Usunięcie wpisu / faktury z plikami |

### Słowniki i dane firmy

| Akcja | Plik | Rola | Działanie |
|---|---|---|---|
| `createSource`, `updateSource`, `setSourceActive` | `lib/sources/actions.ts` | Analityk | Źródła emisji |
| `getFactorHistory`, `getFactorCategories` | `lib/factors/actions.ts` | Wszyscy | Odczyt wersji i kategorii |
| `createFactor`, `createFactorVersion`, `updateFactor` | `lib/factors/actions.ts` | Analityk | Wskaźniki i ich wersje |
| `recalculateDrafts` | `lib/factors/actions.ts` | Analityk | Przeliczenie szkiców po zmianie wskaźnika |
| `updateCompany` | `lib/company/actions.ts` | Analityk | Dane firmy |

### Raporty i użytkownicy

| Akcja | Plik | Rola | Działanie |
|---|---|---|---|
| `saveReportToArchive`, `deleteArchivedReport` | `lib/reports/archive-actions.ts` | Analityk | Archiwum raportów (pliki w Blob) |
| `inviteUser`, `resendInvite`, `cancelInvite` | `lib/users/actions.ts` | Analityk | Zaproszenia |
| `changeUserRole`, `setUserActive` | `lib/users/actions.ts` | Analityk | Rola i aktywność konta |
| `sendPasswordResetLink` | `lib/users/actions.ts` | Analityk | Link do zmiany hasła dla aktywnego konta |

## Route handlery

| Metoda i ścieżka | Rola | Działanie |
|---|---|---|
| `GET /api/reports/[format]` | Wszyscy | Raport w formacie `pdf`, `xlsx` lub `csv`; parametry jak w adresie strony Raporty (okres, zakresy, typy, źródła, statusy, szablon) |
| `GET /api/reports/archive/[id]/[format]` | Wszyscy | Plik zarchiwizowanego raportu |
| `GET /api/attachments/[id]` | Wszyscy | Załącznik faktury (PDF / XML) |
| `GET /api/invoices/[id]/xml` | Wszyscy | Oryginalny XML faktury |
| `GET /api/audit/csv` | Analityk | Eksport dziennika zdarzeń do CSV (z bieżącymi filtrami) |
| `GET /api/auth/session-expired` | — | Usuwa sesję i przekierowuje na logowanie (używane po dezaktywacji konta) |
| `GET /api/cron/reminders` | `CRON_SECRET` | Comiesięczne przypomnienia e-mail; `?force=1` wymusza ponowną wysyłkę |
| `POST /api/setup` | `SETUP_KEY` | Utworzenie pierwszego konta na pustej bazie |

Route handlery `/api/*` nie przechodzą przez `proxy.ts` — każdy samodzielnie wywołuje `getCurrentUser()` lub sprawdza sekret.

## Strony

| Ścieżka | Rola | Zawartość |
|---|---|---|
| `/login`, `/zaproszenie`, `/reset-hasla`, `/nowe-haslo` | publiczne | Logowanie, aktywacja konta, reset hasła |
| `/dashboard` | Wszyscy | KPI, wykresy, przypomnienia |
| `/entries`, `/entries/new` | Wszyscy | Lista faktur i wpisów, dodawanie faktur |
| `/sources`, `/factors` | Wszyscy (edycja: Analityk) | Źródła emisji, wskaźniki |
| `/reports`, `/reports/archive` | Wszyscy | Raporty, archiwum |
| `/company` | Wszyscy (edycja: Analityk) | Dane firmy |
| `/admin`, `/admin/audit` | Analityk | Użytkownicy, dziennik zdarzeń |
| `/manual` | Wszyscy | Instrukcja obsługi |
| `/manual/techniczna` | Analityk | Ta dokumentacja |
