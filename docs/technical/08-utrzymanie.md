# Utrzymanie

Procedury dla typowych sytuacji utrzymaniowych.

## Kopie zapasowe bazy

- **Neon** przechowuje historię zmian bazy (Point-in-Time Restore). Okno historii zależy od planu Neon — sprawdź w Neon → Project → Settings → **History retention** i ustaw zgodnie z wymaganiami klienta (zalecane min. 7 dni).
- **Przywrócenie:** Neon → Branches → **Restore** do wybranego momentu. Bezpieczniej: utwórz nową gałąź bazy z wybranego punktu w czasie, sprawdź dane, a następnie przełącz `DATABASE_URL`/`DIRECT_URL` na Vercel i wykonaj redeploy.
- **Kopia niezależna od dostawcy** (np. przed większą zmianą lub okresowo):

```bash
pg_dump "$DIRECT_URL" --format=custom --no-owner --file=slad-$(date +%F).dump
# odtworzenie na pustej bazie:
pg_restore --no-owner --dbname="$DIRECT_URL_NOWEJ_BAZY" slad-RRRR-MM-DD.dump
```

- **Pliki** w Vercel Blob nie są objęte kopią bazy. Baza przechowuje tylko ich adresy. Przy przywracaniu bazy pliki pozostają na miejscu; pliki usuniętych faktur są kasowane z Blob w momencie usuwania.

## Zmiana sekretów

| Sekret | Procedura | Skutek |
|---|---|---|
| `SESSION_SECRET` | Nowa wartość na Vercel → redeploy | Wszyscy użytkownicy zostają wylogowani |
| Hasło bazy Neon | Neon → Roles → Reset password → zaktualizuj `DATABASE_URL` i `DIRECT_URL` → redeploy | Krótka niedostępność do czasu redeployu |
| `RESEND_API_KEY` | Nowy klucz w Resend → Vercel → redeploy → usuń stary klucz | Brak |
| `BLOB_READ_WRITE_TOKEN` | Vercel → Storage → magazyn → rotate token (lub ponowne podłączenie) → redeploy | Brak |
| `CRON_SECRET` | Nowa wartość na Vercel → redeploy | Brak |

Po każdej zmianie zmiennych na Vercel konieczny jest **redeploy** (Deployments → ostatnie wdrożenie → Redeploy).

## Konta

- **Nowa osoba:** Administracja → zaproszenie e-mail.
- **Zapomniane hasło:** użytkownik sam — „Nie pamiętasz hasła?” na stronie logowania; lub Analityk — ikona klucza w Administracji.
- **Odejście pracownika:** Administracja → **Dezaktywuj**. Konta nie usuwa się, aby historia wpisów i dziennik zachowały autora.
- **Blokada logowania:** mija sama po 15 minutach; natychmiast zdejmuje ją zmiana hasła linkiem.
- **Nowe konto Administratora (wykonawca):** zalogowany Administrator zaprasza osobę z rolą Administrator. Gdy nie ma żadnego aktywnego Administratora ani Analityka, rolę można nadać bezpośrednio w bazie (Neon → SQL Editor): `UPDATE "User" SET role = 'ADMIN' WHERE email = '…';`

## Przypomnienia e-mail

1. Vercel → Project → **Cron Jobs** — sprawdź, czy zadanie `/api/cron/reminders` jest widoczne i kiedy było uruchomione.
2. Logi wywołania: Vercel → Logs, filtr `/api/cron/reminders`. Odpowiedź zawiera powód, np. `already sent this month`, `nothing to report`, `no active Analityk`, `email not configured`.
3. Ręczne uruchomienie (np. test):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://ADRES-APLIKACJI/api/cron/reminders?force=1"
```

4. Wysłanie jest zapisywane w dzienniku zdarzeń (użytkownik „System”).

## E-mail nie dociera

1. Sprawdź, czy ustawione są `RESEND_API_KEY` i `RESEND_FROM` (Administracja pokaże wtedy link do skopiowania zamiast wysyłki).
2. Resend → **Emails** — status wiadomości (dostarczona, odrzucona, spam).
3. Resend → **Domains** — domena nadawcy musi mieć status Verified.
4. Zaproszenia i linki z Administracji pokazują powód błędu na ekranie; błąd samodzielnego resetu hasła trafia do logów Vercel („Nie udało się wysłać linku do zmiany hasła”).

## Wskaźniki emisji — coroczna aktualizacja

KOBiZE publikuje nowe wskaźniki dla energii elektrycznej zwykle na przełomie roku. Analityk dodaje w zakładce Współczynniki **nową wersję** wskaźnika z nowym okresem ważności (bez edycji starej wersji). System przypomina o tym w styczniu. Szkice wpisów można następnie przeliczyć; wpisy zweryfikowane zachowują dotychczasowe wartości.

## Typowe problemy

| Objaw | Przyczyna i rozwiązanie |
|---|---|
| „Nieprawidłowa konfiguracja środowiska — DATABASE_URL…” | Brak lub błędna zmienna na Vercel → popraw i redeploy |
| Linki w e-mailach prowadzą pod zły adres | `NEXT_PUBLIC_APP_URL` ustawiony błędnie lub zmieniony bez redeployu |
| Błąd przy pobieraniu załącznika lub raportu z archiwum | Brak/nieważny `BLOB_READ_WRITE_TOKEN` albo plik usunięty z magazynu |
| Po wdrożeniu błąd bazy „column … does not exist” | Nie zastosowano migracji → `npm run db:deploy` na produkcji |
| Faktura „wymaga uwagi” — nieznany PPE | Dodaj numer PPE do właściwego źródła emisji; kolejne faktury dopasują się automatycznie |
| „Brak wskaźnika obowiązującego dla daty…” | Dodaj wersję wskaźnika obejmującą okres faktury |

## Aktualizacje zależności

- Raz na kwartał: `npm outdated`, aktualizacja wersji poprawkowych (`npm update`), następnie pełny zestaw kontroli (`tsc`, `lint`, `test`, `build`).
- Aktualizacje wersji głównych (Next.js, Prisma, React) wykonuj osobno, z testem na wdrożeniu Preview.
- `npm audit` — przegląd zgłoszonych podatności.

## Monitorowanie

- **Vercel → Logs / Observability:** błędy serwera, czasy odpowiedzi.
- **Neon → Monitoring:** obciążenie, liczba połączeń, rozmiar bazy.
- **Dziennik zdarzeń w aplikacji:** kto i kiedy zmieniał dane.
