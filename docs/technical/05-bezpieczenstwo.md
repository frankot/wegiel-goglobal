# Bezpieczeństwo i role

## Uwierzytelnianie

- **Hasła** przechowywane są jako skrót bcrypt (`lib/auth/hash.ts`). Wymagania: min. 8 znaków, 1 wielka litera, 1 cyfra (`schemas/auth.ts`).
- **Sesja** to token JWT (HS256, klucz `SESSION_SECRET`) z polami `userId` i `role`, ważny 7 dni, w ciasteczku `session` (`httpOnly`, `secure` na produkcji, `sameSite=lax`).
- **Kontrola na dwóch poziomach:**
  1. `proxy.ts` — szybkie sprawdzenie podpisu tokenu przed każdą stroną (bez bazy).
  2. `getCurrentUser()` — przy każdej stronie i akcji odczytuje użytkownika z bazy. Rola i aktywność konta brane są **z bazy, nie z tokenu**, więc zmiana roli lub dezaktywacja działa od następnego żądania.
- **Logowanie** nie zdradza, czy konto istnieje: przy nieznanym e-mailu wykonywane jest „puste” sprawdzenie hasła (`burnPasswordCheck`), aby czas odpowiedzi był taki sam.

## Blokada logowania

Nieudane próby zapisywane są w tabeli `LoginAttempt` (`lib/auth/login-attempts.ts`, reguły w `lib/auth/rate-limit.ts`):

- 5 błędów dla pary e-mail + IP w ciągu 15 minut **lub** 20 błędów z jednego IP → blokada do upływu 15 minut od najstarszej z liczonych prób,
- udane logowanie oraz zmiana hasła linkiem kasują błędy danego konta,
- wpisy starsze niż 24 godziny są usuwane przy kolejnych zapisach.

## Zaproszenia i reset hasła

| | Zaproszenie | Reset hasła |
|---|---|---|
| Kto inicjuje | Analityk / Administrator (Administracja) | Użytkownik (strona logowania) lub Analityk (Administracja) |
| Ważność | 7 dni | 1 godzina, nowy link najwcześniej po 5 min |
| Strona | `/zaproszenie?token=…` | `/nowe-haslo?token=…` |
| Przechowywanie | tylko skrót SHA-256 tokenu | tylko skrót SHA-256 tokenu |

Tokeny mają 256 bitów losowości (`randomBytes(32)`), są jednorazowe i kasowane po użyciu. Formularz „Nie pamiętasz hasła?” zawsze zwraca ten sam komunikat, niezależnie od tego, czy konto istnieje.

## Role i uprawnienia

Reguły zebrane są w `lib/auth/permissions.ts` i sprawdzane **po stronie serwera** w każdej akcji i każdym route handlerze. Ukrycie przycisku w interfejsie jest wyłącznie wygodą — nie zabezpieczeniem.

| Czynność | Użytkownik | Analityk | Administrator |
|---|:-:|:-:|:-:|
| Podgląd dashboardu, faktur, źródeł, wskaźników, danych firmy | ✓ | ✓ | ✓ |
| Generowanie i pobieranie raportów, przeglądanie archiwum | ✓ | ✓ | ✓ |
| Dodawanie faktur (zawsze jako szkic) | ✓ | ✓ | ✓ |
| Poprawianie ilości we własnych szkicach | ✓ | ✓ | ✓ |
| Zapis faktur od razu jako zweryfikowane, weryfikacja, korekta, usuwanie wpisów | — | ✓ | ✓ |
| Źródła emisji, wskaźniki, kategorie, przeliczanie szkiców | — | ✓ | ✓ |
| Dane firmy | — | ✓ | ✓ |
| Archiwizacja i usuwanie raportów z archiwum | — | ✓ | ✓ |
| Administracja: zapraszanie, role, dezaktywacja, linki do zmiany hasła | — | ✓ (bez kont Administratora) | ✓ |
| Dziennik zdarzeń i eksport CSV | — | ✓ | ✓ |
| Dokumentacja techniczna | — | ✓ | ✓ |
| Widoczność kont Administratora | — | — | ✓ |

**Administrator** to konto techniczne wykonawcy — niewidoczne na liście użytkowników klienta. Nikt nie może zmienić roli ani dezaktywować **własnego** konta.

## Pliki

- Wszystkie pliki (XML i PDF faktur, archiwum raportów) zapisywane są w magazynie Vercel Blob o dostępie **prywatnym** — adres pliku nie wystarcza, by go pobrać.
- Pobieranie odbywa się wyłącznie przez route handlery aplikacji (`/api/attachments/[id]`, `/api/invoices/[id]/xml`, `/api/reports/archive/[id]/[format]`), które najpierw sprawdzają sesję, a następnie strumieniują plik z nagłówkiem `Cache-Control: private, no-store`.
- Nazwy plików są oczyszczane, a do ścieżki dodawany jest losowy sufiks.

## Dziennik zdarzeń

Każda zmiana danych zapisuje wpis w `AuditLog`: kto (`userId`, `userName`), co (`action`, `entity`, `entityId`), szczegóły (JSON, przy edycjach — wartość poprzednia i nowa) oraz adres IP (z nagłówka `x-forwarded-for`). Rejestrowane są m.in.: logowania, import i zapis faktur, weryfikacje i korekty, zmiany źródeł, wskaźników i danych firmy, generowanie i archiwizacja raportów, operacje na kontach i resety haseł, wysyłka przypomnień.

Aplikacja nie udostępnia edycji ani usuwania wpisów dziennika. Czytelne opisy zdarzeń buduje `lib/audit/describe.ts`.

## Endpointy techniczne

| Endpoint | Zabezpieczenie |
|---|---|
| `POST /api/setup` | Nagłówek `x-setup-key` = `SETUP_KEY` (porównanie stałoczasowe); działa tylko na pustej bazie |
| `GET /api/cron/reminders` | Nagłówek `Authorization: Bearer CRON_SECRET` (porównanie stałoczasowe) |

## Dane osobowe

System przechowuje dane osobowe pracowników w minimalnym zakresie: imię i nazwisko, e-mail, adresy IP w dzienniku zdarzeń i próbach logowania. Dane są przechowywane w UE (Neon, region UE), jeśli tak skonfigurowano projekt bazy.
