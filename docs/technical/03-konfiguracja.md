# Konfiguracja

Cała konfiguracja przekazywana jest przez zmienne środowiskowe. Lokalnie — w pliku `.env` (wzór: `.env.example`, plik `.env` nie trafia do repozytorium). Na Vercel — w **Project → Settings → Environment Variables**, osobno dla środowisk Production i Preview.

## Zmienne środowiskowe

| Zmienna | Wymagana | Opis |
|---|---|---|
| `DATABASE_URL` | tak | Connection string Neon **z poolerem** (host z `-pooler`). Używany przez aplikację. |
| `DIRECT_URL` | zalecana | Connection string Neon **bez poolera**. Używany przez Prisma CLI (migracje). Gdy brak — CLI użyje `DATABASE_URL`. |
| `SESSION_SECRET` | tak | Klucz podpisu sesji JWT, min. 32 znaki. Generowanie: `openssl rand -base64 32`. Zmiana wylogowuje wszystkich. |
| `NEXT_PUBLIC_APP_URL` | tak | Publiczny adres aplikacji bez końcowego `/`, np. `https://slad.example.pl`. Wstawiany do linków w e-mailach. **Wbudowywany podczas budowania** — po zmianie potrzebny ponowny deploy. |
| `RESEND_API_KEY` | do e-maili | Klucz API Resend. |
| `RESEND_FROM` | do e-maili | Nadawca, np. `Ślad węglowy <no-reply@example.pl>`. Domena musi być zweryfikowana w Resend. |
| `BLOB_READ_WRITE_TOKEN` | tak | Token magazynu Vercel Blob (ustawiany automatycznie po podłączeniu magazynu do projektu). Magazyn musi być **prywatny**. |
| `CRON_SECRET` | do przypomnień | Losowy sekret; Vercel dołącza go do wywołań cron jako `Authorization: Bearer …`. |
| `SETUP_KEY` | jednorazowo | Klucz do utworzenia pierwszego konta przez `POST /api/setup`. Po utworzeniu konta można usunąć. |

Brak `DATABASE_URL` lub zbyt krótki `SESSION_SECRET` zatrzymuje aplikację z czytelnym komunikatem (`lib/env.ts`).

## Działanie bez e-maila

Gdy `RESEND_API_KEY` lub `RESEND_FROM` nie są ustawione, system działa dalej:

- zaproszenia i linki do zmiany hasła wysyłane z Administracji pokazują link z przyciskiem **Kopiuj link** do ręcznego przekazania,
- samodzielny reset hasła ze strony logowania nie dociera do użytkownika (błąd trafia do logów serwera),
- przypomnienia cron kończą się odpowiedzią `email not configured`.

## Harmonogram cron

Zdefiniowany w `vercel.json`:

| Ścieżka | Harmonogram | Działanie |
|---|---|---|
| `/api/cron/reminders` | `0 7 10 * *` (10. dnia miesiąca, 7:00 UTC) | E-mail do aktywnych Analityków o brakujących fakturach i wskaźnikach kończących ważność |

Zadanie wysyła najwyżej jedno podsumowanie w miesiącu (sprawdza dziennik zdarzeń). Ponowne wysłanie wymusza parametr `?force=1`.

## Limity

| Limit | Wartość | Miejsce |
|---|---|---|
| Rozmiar żądania Server Action | 10 MB | `next.config.ts` |
| Plików w jednej paczce importu | 20 | `lib/import/limits.ts` |
| Łączny rozmiar paczki | 10 MB | `lib/import/limits.ts` |
| Faktur w jednej paczce | 100 | `lib/import/limits.ts` |
| Ważność sesji | 7 dni | `lib/auth/session.ts` |
| Ważność zaproszenia | 7 dni | `lib/users/actions.ts` |
| Ważność linku do zmiany hasła | 1 godzina, nowy najwcześniej po 5 min | `lib/auth/reset-rules.ts` |
| Blokada logowania | 5 błędów na konto+IP lub 20 na IP w 15 min | `lib/auth/rate-limit.ts` |
