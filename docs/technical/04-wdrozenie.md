# Wdrożenie

## Uruchomienie lokalne

Wymagania: Node.js 20+ (zalecany aktualny LTS), npm, dostęp do bazy Neon (osobna gałąź bazy do developmentu).

1. `npm install` — instaluje zależności i generuje klienta Prisma.
2. Skopiuj `.env.example` do `.env` i uzupełnij wartości (zob. Konfiguracja).
3. `npm run db:deploy` — zakłada tabele na pustej bazie.
4. Opcjonalnie `npm run db:seed` — wskaźniki bazowe i dane demonstracyjne (wymaga istniejącego konta administratora dla historii demo).
5. `npm run dev` — aplikacja pod `http://localhost:3000`.
6. Utwórz pierwsze konto (zob. „Pierwsze konto” niżej).

Polecenia kontrolne przed każdym wdrożeniem:

| Polecenie | Sprawdza |
|---|---|
| `npx tsc --noEmit` | typy TypeScript |
| `npm run lint` | ESLint |
| `npm test` | testy jednostkowe (`lib/**/*.test.ts`) |
| `npm run build` | pełne budowanie produkcyjne |

## Infrastruktura produkcyjna

| Usługa | Konfiguracja |
|---|---|
| **GitHub** | Repozytorium; gałąź `main` = produkcja |
| **Vercel** | Projekt połączony z repozytorium. Framework: Next.js, polecenia domyślne. Push do `main` → wdrożenie produkcyjne; inne gałęzie → wdrożenia Preview. |
| **Neon** | Projekt PostgreSQL w regionie UE (np. Frankfurt). Gałąź `main` dla produkcji; do testów można tworzyć gałęzie bazy. |
| **Vercel Blob** | Magazyn typu **Private** podłączony do projektu (Storage → Connect) — ustawia `BLOB_READ_WRITE_TOKEN`. |
| **Resend** | Zweryfikowana domena nadawcy (rekordy DNS: SPF, DKIM), klucz API. |
| **Domena** | Vercel → Settings → Domains; po zmianie domeny zaktualizuj `NEXT_PUBLIC_APP_URL` i wykonaj redeploy. |

## Proces wdrożenia zmian

1. Zmiana w kodzie na gałęzi, kontrole lokalne (tabela wyżej).
2. Jeśli zmienia się schemat bazy: `npm run db:migrate -- --name opis` na bazie deweloperskiej; plik migracji trafia do repozytorium razem z kodem.
3. **Przed** scaleniem do `main` zastosuj migrację na produkcji: `DATABASE_URL=… DIRECT_URL=… npm run db:deploy`. Migracje w projekcie są addytywne (nowe kolumny opcjonalne), więc stara wersja aplikacji działa na nowym schemacie.
4. Scal / wypchnij do `main` — Vercel zbuduje i wdroży aplikację.
5. Sprawdź wdrożenie: logowanie, dashboard, podgląd raportu.

Budowanie na Vercel **nie uruchamia migracji automatycznie** — to świadoma decyzja, aby zmiany schematu były wykonywane kontrolowanie.

## Pierwsze konto

Na pustej bazie nie ma żadnego użytkownika. Pierwsze konto (rola Administrator) zakłada się jednorazowo:

```bash
curl -X POST https://ADRES-APLIKACJI/api/setup \
  -H "Content-Type: application/json" \
  -H "x-setup-key: WARTOŚĆ_SETUP_KEY" \
  -d '{"email":"admin@example.pl","name":"Jan Kowalski","password":"MocneHaslo1"}'
```

Hasło: min. 8 znaków, 1 wielka litera, 1 cyfra. Endpoint działa tylko, gdy w bazie nie ma jeszcze żadnego konta. Kolejne osoby zaprasza się już z poziomu **Administracja**. Po utworzeniu konta zmienną `SETUP_KEY` można usunąć.

## Wycofanie wdrożenia

- **Kod:** Vercel → Deployments → wybierz poprzednie wdrożenie → **Promote to Production** (natychmiastowe, bez budowania).
- **Baza:** migracji nie cofa się automatycznie. Przy problemie po migracji przywróć bazę z punktu w czasie (zob. Utrzymanie → Kopie zapasowe) lub dopisz migrację naprawczą.
