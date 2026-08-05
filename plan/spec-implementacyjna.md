# Specyfikacja implementacyjna — System śladu węglowego GO GLOBAL GROUP

**Wersja:** 1.0  
**Data:** 24.07.2026  
**Deadline:** 03.11.2026  
**Bazowy dokument:** `plan/opis-systemu-slad-weglowy.md`

---

## Spis treści

1. [Stack technologiczny — wersje i konfiguracja](#1-stack-technologiczny--wersje-i-konfiguracja)
2. [Architektura katalogów](#2-architektura-katalogów)
3. [Model danych — schemat Prisma](#3-model-danych--schemat-prisma)
4. [Autoryzacja i sesje](#4-autoryzacja-i-sesje)
5. [Routing i ochrona stron](#5-routing-i-ochrona-stron)
6. [Server Actions — kontrakty](#6-server-actions--kontrakty)
7. [Komponenty i widoki](#7-komponenty-i-widoki)
8. [Import plików — strategia](#8-import-plików--strategia)
9. [Raporty PDF/XLSX/CSV](#9-raporty-pdfxlsxcsv)
10. [Testy](#10-testy)
11. [Deployment i CI/CD](#11-deployment-i-cicd)
12. [Harmonogram implementacji](#12-harmonogram-implementacji)

---

## 1. Stack technologiczny — wersje i konfiguracja

### 1.1. Wersje — stan zastany i docelowy

| Pakiet | Wersja obecna | Wersja docelowa | Uwagi |
|--------|--------------|-----------------|-------|
| `next` | 16.2.9 | ✅ bez zmian | Next.js 16 — `middleware` → `proxy`, Turbopack domyślny |
| `react` / `react-dom` | 19.2.4 | ✅ bez zmian | React 19.2 — `useActionState`, Server Components stabilny |
| `tailwindcss` | ^4 | ✅ bez zmian | Tailwind CSS v4 — konfiguracja CSS-first, brak `tailwind.config.js` |
| `@tailwindcss/postcss` | ^4 | ✅ bez zmian | PostCSS plugin dla Tailwind v4 |
| `typescript` | ^5 | ✅ bez zmian | TS 5.x, zgodne z wymogami Next.js 16 |

### 1.2. Pakiety do dodania

| Kategoria | Pakiet | Wersja | Przeznaczenie |
|-----------|-------|--------|---------------|
| **ORM** | `prisma` | ^6.x | ORM bazy danych |
| | `@prisma/client` | ^6.x | Klient typowany |
| | `@prisma/adapter-neon` | ^0.x | Adapter Neon DB serwerless |
| | `@neondatabase/serverless` | ^1.x | Neon driver |
| **Auth** | `jose` | ^6.x | JWT — szyfrowanie/weryfikacja sesji (zgodne z Edge Runtime, jeśli potrzebne) |
| | `bcryptjs` | ^2.x | Haszowanie haseł (czysty JS, brak natywnych zależności) |
| **UI** | `shadcn/ui` (new-york) | latest | Komponenty Radix UI + Tailwind |
| | `lucide-react` | ^0.x | Ikony (zależność shadcn) |
| | `recharts` | ^2.x | Wykresy na dashboard |
| **Walidacja** | `zod` | ^4.x | Schematy walidacji (serwer + klient) |
| **Import plików** | `xlsx` (SheetJS) | ^0.20 | Parsowanie XLSX |
| | `papaparse` | ^5.x | Parsowanie CSV |
| | `fast-xml-parser` | ^5.x | Parsowanie XML (KSeF, KOBIZE) |
| **Storage** | `@vercel/blob` | ^1.x | Przechowywanie plików (S3-compatible) |
| **PDF** | `jspdf` | ^2.x | Generowanie PDF |
| | `jspdf-autotable` | ^4.x | Tabele w PDF |
| **E-mail** | `resend` | ^4.x | Wysyłka e-mail (zaproszenia, reset hasła) |
| | `react-email` | ^3.x | Szablony e-mail (opcjonalnie) |
| **Testy** | `vitest` | ^3.x | Unit + integration tests |
| | `@testing-library/react` | ^16.x | Testowanie komponentów |
| | `@testing-library/user-event` | ^14.x | Symulacja interakcji użytkownika |
| | `@vitejs/plugin-react` | ^4.x | Integracja Vitest z React |
| | `jsdom` | ^26.x | DOM environment |
| | `vite-tsconfig-paths` | ^5.x | Rozwiązywanie ścieżek TS |
| | `@playwright/test` | ^1.x | E2E tests |

### 1.3. Konfiguracja Next.js 16

```ts
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Server Actions — zwiększenie limitu na upload plików
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // React Compiler — opcjonalnie, dla optymalizacji
  reactCompiler: {
    compilationMode: 'infer',
  },

  // Pakiety zewnętrzne niekompatybilne z bundlingiem
  serverExternalPackages: ['@neondatabase/serverless'],
}

export default nextConfig
```

### 1.4. Tailwind CSS v4 — konfiguracja

```css
/* app/globals.css */
@import 'tailwindcss';

/* Design tokens — shadcn/new-york */
@theme {
  --color-background: hsl(0 0% 100%);
  --color-foreground: hsl(0 0% 3.9%);
  --color-primary: hsl(142.1 76.2% 36.3%);
  --color-primary-foreground: hsl(355.7 100% 97.3%);
  --color-muted: hsl(0 0% 96.1%);
  --color-muted-foreground: hsl(0 0% 45.1%);
  --color-accent: hsl(0 0% 96.1%);
  --color-accent-foreground: hsl(0 0% 9%);
  --color-destructive: hsl(0 84.2% 60.2%);
  --color-border: hsl(0 0% 89.8%);
  --color-input: hsl(0 0% 89.8%);
  --color-ring: hsl(142.1 76.2% 36.3%);
  --radius: 0.5rem;
}
```

Green accent ( `--color-primary: hsl(142.1 76.2% 36.3%)` ) — motyw ekologiczny, pasujący do tematyki śladu węglowego.

---

## 2. Architektura katalogów

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Route group — niezalogowany
│   │   ├── login/
│   │   │   └── page.tsx          # Formularz logowania
│   │   ├── zaproszenie/
│   │   │   └── page.tsx          # Aktywacja konta (token w URL)
│   │   └── layout.tsx            # Layout auth (czysty, bez sidebar)
│   │
│   ├── (dashboard)/              # Route group — zalogowany
│   │   ├── layout.tsx            # Layout z sidebar + górny pasek
│   │   ├── dashboard/
│   │   │   └── page.tsx          # KPI + wykresy
│   │   ├── sources/
│   │   │   └── page.tsx          # Źródła emisji (CRUD)
│   │   ├── factors/
│   │   │   └── page.tsx          # Współczynniki emisji
│   │   ├── entries/
│   │   │   ├── page.tsx          # Lista faktur i wpisów
│   │   │   ├── new/
│   │   │   │   └── page.tsx      # Ręczne dodawanie wpisu
│   │   │   └── import/
│   │   │       └── page.tsx      # Import plików
│   │   ├── reports/
│   │   │   └── page.tsx          # Generator raportów
│   │   └── admin/
│   │       └── page.tsx          # Użytkownicy + dziennik audytu
│   │
│   ├── api/                      # Route Handlers
│   │   ├── auth/
│   │   │   └── login/route.ts    # POST login
│   │   └── reports/
│   │       └── download/route.ts # Pobieranie wygenerowanego raportu
│   │
│   ├── proxy.ts                  # Ochrona routingu (dawniej middleware.ts)
│   ├── layout.tsx                # Root layout (html, body)
│   └── globals.css               # Tailwind + tokeny
│
├── components/                   # Komponenty React
│   ├── ui/                       # Komponenty shadcn/ui (auto-generowane)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   ├── dialog.tsx
│   │   ├── select.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── toast.tsx
│   │   ├── tabs.tsx
│   │   ├── progress.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── sidebar.tsx           # Boczne menu
│   │   ├── topbar.tsx            # Górny pasek (user menu, logout)
│   │   └── app-layout.tsx        # Kompozycja sidebar + main
│   ├── dashboard/
│   │   ├── kpi-card.tsx          # Karta KPI (CO₂e, Scope 1, Scope 2)
│   │   ├── monthly-chart.tsx     # Wykres słupkowy miesięczny
│   │   └── top-sources-table.tsx # Top 5 źródeł
│   ├── sources/
│   │   ├── source-table.tsx      # Tabela źródeł
│   │   └── source-form.tsx       # Formularz dodawania/edycji
│   ├── factors/
│   │   ├── factor-table.tsx      # Tabela współczynników
│   │   ├── factor-form.tsx       # Formularz ręcznego dodawania
│   │   └── factor-history.tsx    # Modal historii wersji
│   ├── entries/
│   │   ├── entry-table.tsx       # Tabela wpisów
│   │   ├── entry-form.tsx        # Formularz ręcznego wpisu
│   │   ├── invoice-list.tsx      # Lista faktur
│   │   ├── import-wizard.tsx     # Kreator importu plików
│   │   └── status-badge.tsx      # Badge statusu (Szkic/Zweryfikowany/...)
│   ├── reports/
│   │   └── report-generator.tsx  # Formularz generowania raportu
│   └── admin/
│       ├── user-table.tsx        # Tabela użytkowników
│       ├── invite-form.tsx       # Formularz zaproszenia
│       └── audit-log-table.tsx   # Dziennik audytu
│
├── lib/                          # Logika biznesowa, utils
│   ├── prisma.ts                 # Prisma client singleton
│   ├── db/                       # Data Access Layer (DAL)
│   │   ├── users.ts              # User queries + auth
│   │   ├── sources.ts            # EmissionSource queries
│   │   ├── factors.ts            # EmissionFactor queries
│   │   ├── entries.ts            # EmissionEntry queries
│   │   ├── invoices.ts           # Invoice queries
│   │   └── audit.ts              # AuditLog queries
│   ├── auth/
│   │   ├── session.ts            # encrypt/decrypt/verify JWT
│   │   ├── hash.ts               # bcrypt hash/compare
│   │   └── permissions.ts        # Role checks
│   ├── reports/
│   │   ├── pdf-generator.ts      # Generowanie PDF
│   │   ├── xlsx-generator.ts     # Generowanie XLSX
│   │   ├── csv-generator.ts      # Generowanie CSV
│   │   └── templates/            # Szablony PDF
│   ├── import/
│   │   ├── csv-parser.ts         # Parsowanie CSV
│   │   ├── xlsx-parser.ts        # Parsowanie XLSX
│   │   ├── ksef-parser.ts        # Parsowanie KSeF XML (FA(3))
│   │   ├── kobize-parser.ts      # Parsowanie KOBIZE XML
│   │   └── validator.ts          # Walidacja zaimportowanych danych
│   ├── email/
│   │   └── send.ts               # Wysyłka e-mail (Resend)
│   └── utils.ts                  # Helpers (formatowanie CO₂e, daty, etc.)
│
├── schemas/                      # Schematy Zod
│   ├── auth.ts                   # Login, register, invite
│   ├── source.ts                 # EmissionSource create/update
│   ├── factor.ts                 # EmissionFactor create/update
│   ├── entry.ts                  # EmissionEntry create/update
│   └── report.ts                 # Report generation params
│
└── hooks/                        # React hooks
    ├── use-current-user.ts       # Pobranie zalogowanego usera
    └── use-kpi.ts                # Dane dashboard KPI
```

---

## 3. Model danych — schemat Prisma

### 3.1. Diagram relacji

```
User ──1:N──> EmissionEntry (autor, zatwierdzający)
EmissionSource ──1:N──> EmissionEntry
EmissionFactor ──1:N──> EmissionSource (domyślny wskaźnik)
EmissionFactor ──1:N──> EmissionEntry (snapshot wskaźnika)
Invoice ──1:N──> EmissionEntry
AuditLog (samodzielna, polimorficzna)
```

### 3.2. Schemat

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  MANAGER
  EMPLOYEE
}

enum EmissionScope {
  SCOPE_1
  SCOPE_2
}

enum SourceType {
  STATIONARY_INSTALLATION
  COMPANY_VEHICLE
  ELECTRICITY
  HEAT
  COOLING
}

enum FactorSource {
  KOBIZE
  GHG_PROTOCOL
  CUSTOM
}

enum EntryStatus {
  DRAFT
  VERIFIED
  CORRECTED
}

model User {
  id             String    @id @default(cuid())
  email          String    @unique
  name           String
  passwordHash   String
  role           UserRole  @default(EMPLOYEE)
  active         Boolean   @default(true)
  invitationToken String?  @unique
  invitationExpires DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  authoredEntries   EmissionEntry[] @relation("Author")
  verifiedEntries   EmissionEntry[] @relation("Verifier")
}

model EmissionSource {
  id              String       @id @default(cuid())
  name            String       @unique
  type            SourceType
  scope           EmissionScope
  defaultFactorId String?
  unit            String       // litr, m3, kWh, MWh, GJ, kg, tona
  active          Boolean      @default(true)
  registrationNumber String?   // nr rejestracyjny pojazdu
  location        String?      // lokalizacja

  defaultFactor EmissionFactor? @relation(fields: [defaultFactorId], references: [id])
  entries       EmissionEntry[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model EmissionFactor {
  id         String       @id @default(cuid())
  name       String       // "Energia elektr. PL (KOBIZE 2024)"
  category   String       // "Energia elektryczna", "Paliwa ciekłe", itd.
  value      Decimal      @db.Decimal(12, 6)  // np. 0.685
  unit       String       // "kg CO₂e/kWh", "kg CO₂e/litr", itd.
  source     FactorSource
  scope      EmissionScope
  validFrom  DateTime
  validTo    DateTime
  parentId   String?      // dla wersjonowania — wskazuje na poprzednią wersję

  parent     EmissionFactor? @relation("VersionHistory", fields: [parentId], references: [id])
  versions   EmissionFactor[] @relation("VersionHistory")

  sources    EmissionSource[]
  entries    EmissionEntry[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Invoice {
  id            String   @id @default(cuid())
  invoiceNumber String?
  issueDate     DateTime?
  receiptDate   DateTime?
  source        String   @default("MANUAL")  // MANUAL, KSEF, CSV, XLSX, WF_MAG
  importStatus  String   @default("PENDING") // PENDING, PROCESSED, ERRORS
  sourceFileUrl String?  // URL do pliku w S3/Vercel Blob

  entries  EmissionEntry[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model EmissionEntry {
  id         String   @id @default(cuid())

  // Powiązania
  sourceId   String
  source     EmissionSource @relation(fields: [sourceId], references: [id])

  factorId   String
  factor     EmissionFactor @relation(fields: [factorId], references: [id])

  invoiceId  String?
  invoice    Invoice?       @relation(fields: [invoiceId], references: [id])

  // Dane wpisu
  entryDate  DateTime       // data, której dotyczy wpis
  periodStart DateTime?     // dla wpisów okresowych
  periodEnd   DateTime?
  quantity   Decimal        @db.Decimal(12, 4)  // ilość w jednostce źródłowej
  unit       String         // jednostka (snapshot ze źródła)

  // Snapshot wskaźnika (niezmienny po zapisie)
  factorSnapshotValue Decimal @db.Decimal(12, 6)
  factorSnapshotUnit  String

  // Wyliczone emisje
  co2eKg   Decimal @db.Decimal(12, 4)  // quantity × factorSnapshotValue
  co2eTon  Decimal @db.Decimal(12, 4)  // co2eKg / 1000

  // Status i audyt
  status       EntryStatus @default(DRAFT)
  note         String?

  authorId     String
  author       User        @relation("Author", fields: [authorId], references: [id])

  verifierId   String?
  verifier     User?       @relation("Verifier", fields: [verifierId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model AuditLog {
  id         String   @id @default(cuid())
  userId     String?
  userName   String?      // snapshot nazwy usera
  action     String       // CREATE, UPDATE, DELETE, LOGIN
  entity     String       // EmissionSource, EmissionEntry, EmissionFactor, Invoice, User
  entityId   String?
  details    String?      // JSON ze szczegółami zmiany
  ipAddress  String?

  createdAt DateTime @default(now())
}
```

### 3.3. Dane seed

```typescript
// prisma/seed.ts
const factors: EmissionFactorSeed[] = [
  { name: "Energia elektr. PL (KOBIZE 2024)", category: "Energia elektryczna", value: 0.685, unit: "kg CO₂e/kWh", source: "KOBIZE", scope: "SCOPE_2", validFrom: "2025-01-01", validTo: "2025-12-31" },
  { name: "Olej napędowy (GHG Protocol)",   category: "Paliwa ciekłe",      value: 2.62,  unit: "kg CO₂e/litr", source: "GHG_PROTOCOL", scope: "SCOPE_1", validFrom: "2025-01-01", validTo: "2027-12-31" },
  { name: "Benzyna silnikowa (GHG Protocol)", category: "Paliwa ciekłe",    value: 2.30,  unit: "kg CO₂e/litr", source: "GHG_PROTOCOL", scope: "SCOPE_1", validFrom: "2025-01-01", validTo: "2027-12-31" },
  { name: "LPG (GHG Protocol)",             category: "Paliwa ciekłe",      value: 1.66,  unit: "kg CO₂e/litr", source: "GHG_PROTOCOL", scope: "SCOPE_1", validFrom: "2025-01-01", validTo: "2027-12-31" },
  { name: "Gaz ziemny (GHG Protocol)",      category: "Paliwa gazowe",      value: 1.99,  unit: "kg CO₂e/m³",   source: "GHG_PROTOCOL", scope: "SCOPE_1", validFrom: "2025-01-01", validTo: "2027-12-31" },
  { name: "Węgiel kamienny (GHG Protocol)", category: "Paliwa stałe",       value: 2.45,  unit: "kg CO₂e/kg",   source: "GHG_PROTOCOL", scope: "SCOPE_1", validFrom: "2025-01-01", validTo: "2027-12-31" },
  { name: "Ciepło sieciowe PL (GHG Protocol)", category: "Ciepło",          value: 0.38,  unit: "kg CO₂e/kWh",  source: "GHG_PROTOCOL", scope: "SCOPE_2", validFrom: "2025-01-01", validTo: "2027-12-31" },
]
```

---

## 4. Autoryzacja i sesje

### 4.1. Decyzja: własna implementacja z `jose`, bez NextAuth.js

**Uzasadnienie:**
- Aplikacja ma tylko credentials (login + hasło), bez OAuth/providerów
- Next.js 16 oferuje natywny pattern autoryzacji przez Server Actions + `jose` (opisany w `node_modules/next/dist/docs/01-app/02-guides/authentication.md`)
- Mniej zależności, prostsza konfiguracja
- Stateless JWT — sesja zaszyfrowana i przechowywana w httpOnly cookie

### 4.2. Flow logowania

```
1. User wysyła formularz login (email + hasło)
2. Server Action `login()`:
   a. Waliduje pola (Zod)
   b. Szuka usera w DB po email
   c. Porównuje hasło (bcryptjs.compare)
   d. Jeśli OK → tworzy sesję JWT (jose.SignJWT)
   e. Ustawia httpOnly cookie "session" (Next.js cookies API)
   f. Redirect do /dashboard
3. Każde kolejne żądanie:
   a. `verifySession()` odczytuje cookie, deszyfruje JWT
   b. Zwraca { userId, role }
```

### 4.3. Implementacja

```typescript
// src/lib/auth/session.ts
import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET!)

interface SessionPayload {
  userId: string
  role: 'MANAGER' | 'EMPLOYEE'
}

export async function createSession(payload: SessionPayload) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dni

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(SECRET)

  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })

  return token
}

export async function verifySession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, SECRET, { algorithms: ['HS256'] })
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}
```

### 4.4. Data Access Layer (DAL)

```typescript
// src/lib/db/users.ts
import 'server-only'
import { cache } from 'react'
import { verifySession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

export const getCurrentUser = cache(async () => {
  const session = await verifySession()
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true },
  })

  if (!user) {
    await deleteSession()
    redirect('/login')
  }

  return user
})
```

### 4.5. Page-level auth check

Każda strona w `(dashboard)` wywołuje `getCurrentUser()` jako pierwszą linię:

```typescript
// app/(dashboard)/sources/page.tsx
export default async function SourcesPage() {
  const user = await getCurrentUser()
  // ...
}
```

### 4.6. Server Action auth check

Każda Server Action sprawdza uprawnienia przed mutacją:

```typescript
'use server'
import { getCurrentUser } from '@/lib/db/users'

export async function createSource(formData: FormData) {
  const user = await getCurrentUser()
  if (user.role !== 'MANAGER') throw new Error('Unauthorized')
  // ... reszta logiki
}
```

---

## 5. Routing i ochrona stron

### 5.1. `proxy.ts` (Next.js 16 — dawniej `middleware.ts`)

```typescript
// src/app/proxy.ts
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET!)

const PUBLIC_PATHS = ['/login', '/zaproszenie']
const ALLOWED_UNAUTH = ['/_next', '/api/auth', '/favicon.ico']

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname

  // Allow static assets and API
  if (ALLOWED_UNAUTH.some(p => path.startsWith(p))) {
    return NextResponse.next()
  }

  // Check session cookie
  const token = req.cookies.get('session')?.value
  let isAuthenticated = false

  if (token) {
    try {
      await jwtVerify(token, SECRET, { algorithms: ['HS256'] })
      isAuthenticated = true
    } catch {}
  }

  const isPublicPath = PUBLIC_PATHS.includes(path)

  if (!isAuthenticated && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  if (isAuthenticated && isPublicPath) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.png$).*)'],
}
```

**Uwaga:** Proxy działa w Node.js runtime (Next.js 16) — kompatybilne z `jose`.

---

## 6. Server Actions — kontrakty

### 6.1. Emission Sources

```typescript
// src/schemas/source.ts
import { z } from 'zod'

export const sourceSchema = z.object({
  name: z.string().min(2, 'Nazwa musi mieć min. 2 znaki'),
  type: z.enum(['STATIONARY_INSTALLATION', 'COMPANY_VEHICLE', 'ELECTRICITY', 'HEAT', 'COOLING']),
  scope: z.enum(['SCOPE_1', 'SCOPE_2']),
  defaultFactorId: z.string().min(1, 'Wybierz domyślny wskaźnik'),
  unit: z.string().min(1),
  registrationNumber: z.string().optional(),
  location: z.string().optional(),
})

export type SourceInput = z.infer<typeof sourceSchema>
```

```typescript
// Server Actions
async function createSource(input: SourceInput): Promise<{ ok: true; id: string } | { ok: false; errors: string[] }>
async function updateSource(id: string, input: SourceInput): Promise<{ ok: true } | { ok: false; errors: string[] }>
async function deactivateSource(id: string): Promise<{ ok: true } | { ok: false; error: string }>
```

### 6.2. Emission Factors

```typescript
async function createFactor(input: FactorInput): Promise<Result>
async function updateFactor(id: string, input: FactorInput): Promise<Result>
async function importFactorsFromXML(xmlContent: string): Promise<{ ok: true; created: number } | { ok: false; errors: string[] }>
```

### 6.3. Emission Entries

```typescript
async function createEntry(input: EntryInput, status: 'DRAFT' | 'VERIFIED'): Promise<Result>
async function updateEntry(id: string, input: EntryInput): Promise<Result>
async function verifyEntry(id: string): Promise<Result>       // MANAGER only
async function correctEntry(id: string): Promise<Result>      // MANAGER only
async function deleteEntry(id: string): Promise<Result>       // MANAGER only
```

Przy tworzeniu wpisu system automatycznie:
1. Pobiera wskaźnik aktywny dla daty wpisu (`validFrom <= entryDate <= validTo`)
2. Przelicza `co2eKg = quantity × factor.value`
3. Przelicza `co2eTon = co2eKg / 1000`
4. Zapisuje snapshot (`factorSnapshotValue`, `factorSnapshotUnit`)

### 6.4. Users

```typescript
async function inviteUser(email: string): Promise<{ ok: true } | { ok: false; error: string }>  // MANAGER only
async function activateUser(token: string, name: string, password: string): Promise<{ ok: true } | { ok: false; errors: string[] }>
async function deactivateUser(id: string): Promise<Result>  // MANAGER only
```

---

## 7. Komponenty i widoki

### 7.1. Sidebar

```
┌─────────────┐
│   🏠 Panel   │
│             │
│ 📊 Dashboard │
│ 🏭 Źródła    │
│ ⚖️ Wskaźniki │
│ 📄 Faktury   │
│ 📈 Raporty   │
│ ⚙️ Admin     │
│             │
│ [Manager    │
│  user@...]  │
└─────────────┘
```

- Stała szerokość: 240px
- Aktywna zakładka — podświetlenie green accent
- Na dole: nazwa usera + rola + przycisk wylogowania
- Responsywność: na mobile zwijany (hamburger menu)

### 7.2. Dashboard

**KPI Cards (4 kolumny):**
- Całkowite CO₂e [t] — duża liczba
- Scope 1 [t] — zielony badge
- Scope 2 [t] — niebieski badge
- Zmiana YoY % — zielona/czerwona strzałka

**Wykres miesięczny:**
- Recharts `BarChart` stacked
- Oś X: miesiące (sty...gru)
- Oś Y: tony CO₂e
- Scope 1 (ciemnozielony), Scope 2 (jasnozielony)
- Filtry: zakres dat, zakres emisji

**Top 5 źródeł:**
- Tabela: Nazwa źródła, CO₂e [t], % udziału

### 7.3. Źródła emisji

- Tabela z kolumnami: Nazwa, Typ, Zakres, Wskaźnik, Jednostka, Aktywny, Akcje
- Filtry: typ, zakres, aktywny/nieaktywny
- Akcje: Edytuj (dialog), Dezaktywuj (potwierdzenie)
- Przycisk "Dodaj źródło" — dialog z formularzem

### 7.4. Współczynniki emisji

- Tabela grupowana po kategorii (accordion lub sekcje)
- Kolumny: Nazwa, Kategoria, Wartość, Jednostka, Źródło, Ważny od, Ważny do
- Przeterminowane — szary kolor
- Akcje: Edytuj, Historia wersji (modal)
- Przyciski: "Dodaj ręcznie", "Import XML KOBIZE"

### 7.5. Faktury i wpisy

**Sub-nawigacja:** Lista faktur | Dodaj ręcznie | Importuj plik

**Lista faktur:**
- Tabela z możliwością rozwinięcia (expandable rows)
- Po rozwinięciu: lista wpisów emisyjnych danej faktury
- Filtry: data, źródło, zakres, status

**Dodawanie ręczne (wizard 2-krokowy):**
- Krok 1: Nagłówek faktury (opcjonalny) — numer, data
- Krok 2: Pozycje emisyjne
  - Dynamiczne dodawanie wierszy
  - Select dla źródła → auto-wybór wskaźnika i jednostki
  - Pole ilość → auto-przeliczanie CO₂e
  - Przycisk "Dodaj kolejną pozycję"

**Import plików (wizard 3-krokowy):**
- Krok 1: Upload pliku (CSV, XLSX, XML)
- Krok 2: Mapowanie kolumn / podgląd
- Krok 3: Walidacja (dry-run) → tabela błędów/ostrzeżeń → zatwierdzenie

### 7.6. Raporty

- Formularz z parametrami: typ raportu, okres, zakres, format, grupowanie
- Progress bar podczas generowania
- Po wygenerowaniu: link do pobrania
- Archiwum: lista poprzednich raportów

### 7.7. Administracja

**Zakładka 1: Użytkownicy**
- Tabela: Imię i nazwisko, Email, Rola, Data utworzenia, Aktywny
- Akcje: Zaproś (dialog), Dezaktywuj, Reset hasła

**Zakładka 2: Dziennik audytu**
- Tabela: Data, Użytkownik, Akcja, Encja, Szczegóły
- Filtry: data, user, typ akcji
- Eksport CSV

---

## 8. Import plików — strategia

### 8.1. Architektura uniwersalnego importera

```
┌─────────────────┐
│  Upload pliku   │  (Vercel Blob — tymczasowo)
└───────┬─────────┘
        │
        ▼
┌─────────────────┐
│ Detekcja formatu│  (rozszerzenie + struktura)
└───────┬─────────┘
        │
        ├── CSV  ──→ PapaParse
        ├── XLSX ──→ SheetJS
        ├── XML  ──→ fast-xml-parser
        │           │
        │           ├── FA(3) schema → KSeF parser
        │           └── KOBIZE schema → KOBIZE parser
        │
        ▼
┌─────────────────┐
│  Mapowanie      │  Kolumny → pola encji
│  (interaktywne) │  + auto-mapowanie wg słownika
└───────┬─────────┘
        │
        ▼
┌─────────────────┐
│  Walidacja      │  Zod per wiersz
│  (dry-run)      │  → lista błędów + wiersze OK
└───────┬─────────┘
        │
        ▼
┌─────────────────┐
│  Zapis do bazy  │  Poprawne → EmissionEntry (DRAFT)
│                 │  Błędne → pominięte, raport CSV
└─────────────────┘
```

### 8.2. WF-MAG i KSeF/KOBIZE

Parsery dla WF-MAG, KSeF FA(3) i KOBIZE zostaną zaimplementowane po dostarczeniu przykładowych plików przez klienta. Architektura importera jest od początku przygotowana na plug-in parserów — każdy format to osobny moduł implementujący interfejs:

```typescript
interface FileParser {
  parse(file: Buffer): Promise<ParsedRow[]>
}

interface ParsedRow {
  data: Record<string, string | number>
  source?: string    // auto-mapped source name
  errors: string[]
}
```

### 8.3. Przechowywanie plików

- Uploadowane pliki → Vercel Blob (S3-compatible)
- URL przechowywany w `Invoice.sourceFileUrl`
- Pliki tymczasowe usuwane po przetworzeniu (lub retencja 30 dni dla audytu)
- Limit uploadu: 10 MB (ustawiony w `serverActions.bodySizeLimit`)

---

## 9. Raporty PDF/XLSX/CSV

### 9.1. Generowanie PDF (jsPDF + jspdf-autotable)

**Struktura raportu PDF:**

1. **Strona tytułowa:**
   - Nazwa firmy: "GO GLOBAL GROUP"
   - Tytuł: "Raport śladu węglowego"
   - Okres raportowania, data generacji, osoba generująca

2. **Podsumowanie wykonawcze:**
   - Tabela: Scope 1 [t], Scope 2 [t], Razem [t]
   - Porównanie do poprzedniego okresu (zmiana %)

3. **Tabela szczegółowa:**
   - `jspdf-autotable` z dynamicznymi kolumnami
   - Źródło → Ilość → Jednostka → Wskaźnik → CO₂e kg → CO₂e t
   - Sumy częściowe per kategoria

4. **Wykres kołowy:**
   - Scope 1 vs Scope 2 udział %
   - Renderowany jako SVG → embed w PDF

5. **Metodologia:**
   - Tekst o KOBIZE, GHG Protocol, location-based Scope 2

6. **Stopka:**
   - Numer strony, data, "Wygenerowano automatycznie..."

**Wyzwanie: Polskie znaki w jsPDF**
- jsPDF domyślnie nie obsługuje UTF-8
- Rozwiązanie: embed czcionki (np. `DejaVuSans` lub `Roboto` z subsetem Latin Extended-A)
- Alternatywa: użyć `@vercel/og` do generowania stron PNG → embed w PDF

### 9.2. XLSX

- SheetJS (`xlsx` package)
- Jeden arkusz = jeden widok raportu
- Auto-szerokość kolumn, formatowanie liczb

### 9.3. CSV

- Proste mapowanie wierszy do CSV z nagłówkami
- Separator: średnik (`;`) — standard dla polskiego Excela
- Kodowanie: UTF-8 BOM

---

## 10. Testy

### 10.1. Strategia testowania

| Poziom | Narzędzie | Zakres |
|--------|----------|--------|
| **Unit** | Vitest + React Testing Library | Walidacja Zod, utility functions, stan komponentów (client) |
| **Integration** | Vitest | Server Actions z testową bazą danych (oddzielna gałąź Neon) |
| **E2E** | Playwright | 4 scenariusze A–D z dokumentu wymagań |

### 10.2. Konfiguracja Vitest

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
  },
})
```

### 10.3. Scenariusze Playwright

| Scenariusz | Ścieżka |
|-----------|---------|
| **A** — Ręczne dodanie zużycia paliwa | Pracownik dodaje wpis → Manager weryfikuje → widoczny na dashboard |
| **B** — Import KSeF XML | Manager importuje XML → system parsuje → Manager koryguje mapowanie → zatwierdza |
| **C** — Aktualizacja KOBIZE | Manager importuje XML KOBIZE → nowa wersja wskaźnika → historia zachowana |
| **D** — Import WF-MAG CSV | Pracownik importuje CSV → mapuje kolumny → zapisuje szablon → importuje |

### 10.4. Testowa baza danych

Przy testach integracyjnych:
- Tworzenie tymczasowej gałęzi Neon DB (`neon branches create`)
- Migracje przed testami
- Usunięcie gałęzi po testach
- Alternatywnie: `pg-mem` dla prostszych testów

---

## 11. Deployment i CI/CD

### 11.1. Środowiska

| Środowisko | Platforma | Baza danych |
|-----------|----------|-------------|
| **Development** | `next dev` (lokalnie) | Neon Dev Branch |
| **Preview** | Vercel Preview Deploy (per PR) | Neon Preview Branch |
| **Production** | Vercel (Hobby plan) | Neon Production Branch |

### 11.2. Zmienne środowiskowe

```bash
# .env.local (development)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."          # Dla migracji Prisma (bez connection pooling)
SESSION_SECRET="openssl-rand-base64-32"
RESEND_API_KEY="re_..."
BLOB_READ_WRITE_TOKEN="vercel_blob_..."
```

### 11.3. GitHub Actions — pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx eslint .
      - run: npx tsc --noEmit

  test:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx prisma generate
      - run: npx vitest run
      - run: npx playwright test
        env:
          DATABASE_URL: ${{ secrets.NEON_PREVIEW_URL }}

  deploy:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      # Vercel auto-deploys on push to main via GitHub integration
      - run: echo "Vercel auto-deploys"
```

### 11.4. Migracje bazy danych

- **Development:** `npx prisma migrate dev` (automatyczne)
- **Preview/CI:** `npx prisma migrate deploy` (w pipeline)
- **Production:** `npx prisma migrate deploy` (uruchomione ręcznie lub przez Vercel build hook)

### 11.5. Seed danych

- `npx prisma db seed` — uruchamiane raz przy pierwszym deployu
- Seed zawiera 7 predefiniowanych wskaźników emisyjnych
- **Manager bootstrap:** Pierwsze konto Manager tworzone przez dedykowany endpoint `POST /api/setup` (chroniony kluczem), lub seed tworzy domyślnego admina

---

## 12. Harmonogram implementacji

### Faza 1: Fundament (Tydzień 1–2, do 07.08.2026)

| # | Zadanie | Szac. | Output |
|---|---------|-------|--------|
| 1.1 | Instalacja zależności: Prisma, jose, bcryptjs, Zod, shadcn/ui, Recharts, SheetJS, PapaParse, fast-xml-parser, jsPDF, Resend, Vercel Blob | 0.5d | `package.json` zaktualizowany |
| 1.2 | Konfiguracja Prisma + Neon DB + schema | 1d | `prisma/schema.prisma`, migracja |
| 1.3 | Seed danych — 7 wskaźników + default Manager | 0.5d | `prisma/seed.ts` |
| 1.4 | System auth: `session.ts`, `hash.ts`, login/logout Server Actions, proxy.ts | 2d | Pełny flow logowania |
| 1.5 | Layout aplikacji: sidebar + topbar + shadcn/ui dark/light theme | 2d | `(dashboard)/layout.tsx` |
| 1.6 | Komponenty UI shadcn — button, input, dialog, select, table, card, badge, tabs, toast, dropdown-menu, progress | 1d | `src/components/ui/` |
| 1.7 | Formularz rejestracji (invite flow) + formularz logowania | 1d | `(auth)/login`, `(auth)/zaproszenie` |

### Faza 2: Core — Scope 1 i 2 (Tydzień 3–5, do 28.08.2026)

| # | Zadanie | Szac. | Output |
|---|---------|-------|--------|
| 2.1 | DAL — `users.ts`, `sources.ts`, `factors.ts`, `entries.ts`, `invoices.ts`, `audit.ts` | 2d | Query layer |
| 2.2 | Emission Sources CRUD — page + form + table + actions | 2d | `/sources` |
| 2.3 | Emission Factors — page + table + form + history modal | 2d | `/factors` |
| 2.4 | Emission Factors — import XML KOBIZE parser | 1.5d | Parser + integracja z `/factors` |
| 2.5 | Emission Entries — ręczne dodawanie (form + actions + auto-przeliczanie) | 2d | `/entries/new` |
| 2.6 | Emission Entries — lista faktur i wpisów z filtrami + statusy | 2d | `/entries` |
| 2.7 | Emission Entries — import CSV/XLSX z kreatorem mapowania | 2d | `/entries/import` |
| 2.8 | Mechanizm wersjonowania wskaźników + snapshot w EmissionEntry | 1d | Logika w Actions |
| 2.9 | Schematy Zod dla wszystkich formularzy (źródła, wskaźniki, wpisy) | 0.5d | `src/schemas/` |
| 2.10 | Dziennik audytu — automatyczne logowanie CRUD | 1d | `src/lib/audit.ts` |

### Faza 3: Dashboard + Raporty + Admin (Tydzień 6–8, do 18.09.2026)

| # | Zadanie | Szac. | Output |
|---|---------|-------|--------|
| 3.1 | Dashboard — KPI cards (całkowite CO₂e, Scope 1, Scope 2, YoY) | 1d | `/dashboard` |
| 3.2 | Dashboard — wykres słupkowy miesięczny + Top 5 źródeł | 2d | Komponenty Recharts |
| 3.3 | Raporty — silnik generowania PDF (jsPDF + autotable + polskie znaki) | 2d | `pdf-generator.ts` |
| 3.4 | Raporty — szablon PDF (strona tytułowa, podsumowanie, tabela, metodologia) | 1.5d | Szablon PDF |
| 3.5 | Raporty — XLSX + CSV + archiwum raportów | 1.5d | `/reports` |
| 3.6 | Administracja — lista użytkowników + zapraszanie + dezaktywacja | 2d | `/admin` (tab 1) |
| 3.7 | Administracja — dziennik audytu (widok + filtry + eksport CSV) | 1d | `/admin` (tab 2) |

### Faza 4: Integracje i finalizacja (Tydzień 9–12, do 16.10.2026)

| # | Zadanie | Szac. | Output |
|---|---------|-------|--------|
| 4.1 | KSeF XML parser FA(3) — po dostarczeniu pliku | 2d | `ksef-parser.ts` |
| 4.2 | WF-MAG parser — po dostarczeniu pliku | 1.5d | `wfmag-parser.ts` |
| 4.3 | Powiadomienia e-mail: Resend + szablony zaproszenia/reset hasła | 1d | `email/send.ts` |
| 4.4 | Testy integracyjne — Vitest dla Server Actions z testową bazą | 2d | `test/integration/` |
| 4.5 | Testy E2E — Playwright scenariusze A–D | 2d | `test/e2e/` |
| 4.6 | Dokumentacja techniczna (README, schema DB, instrukcja deploy) | 2d | `README.md` |
| 4.7 | Dokumentacja użytkowa PL (podręcznik Manager + Pracownik) | 2d | `docs/` |
| 4.8 | Poprawki, edge cases, UX polishing | 2d | Bug fixes |

### Faza 5: Wdrożenie i UAT (Tydzień 13–14, do 03.11.2026)

| # | Zadanie | Szac. | Output |
|---|---------|-------|--------|
| 5.1 | Deploy produkcyjny Vercel + Neon DB production branch | 0.5d | Live URL |
| 5.2 | Konfiguracja domeny, SSL, env vars (production) | 0.5d | Domena |
| 5.3 | Testy akceptacyjne (UAT) z GO GLOBAL GROUP | 3d | Feedback |
| 5.4 | Poprawki po UAT | 2d | Bug fixes |
| 5.5 | Sesja szkoleniowa online (~2h) | 0.5d | Nagranie + dokumentacja |
| 5.6 | Przekazanie kodu źródłowego | 0.5d | GitHub repo transfer |

### Kamienie milowe

| Data | Kamień milowy | Definicja done |
|------|---------------|----------------|
| 07.08.2026 | Fundament | Działająca aplikacja: logowanie, rejestracja, pusty layout, seed wskaźników |
| 28.08.2026 | Core Scope 1 & 2 | Wszystkie zakładki funkcjonalne (bez PDF) |
| 18.09.2026 | Raporty + Admin | Dashboard, raporty PDF/XLSX/CSV, administracja |
| 16.10.2026 | Feature complete | Wszystkie funkcje, testy, dokumentacja |
| 03.11.2026 | **PRODUKCJA** | Wdrożone, przetestowane, odebrane |

---

## 13. Ryzyka i decyzje do potwierdzenia

| # | Ryzyko / Decyzja | Status | Rozwiązanie awaryjne |
|---|-----------------|--------|---------------------|
| 1 | **Polskie znaki w jsPDF** | 🔴 Do sprawdzenia | Jeśli jsPDF nie radzi sobie z UTF-8 → alternatywnie: generowanie PDF przez `@vercel/og` (React → PNG → PDF) lub Puppeteer |
| 2 | **Formaty KSeF/KOBIZE/WF-MAG nieznane** | 🟡 Czekamy na pliki | Parsery implementowane w Fazie 4; do tego czasu — ręczne wprowadzanie |
| 3 | **shadcn/ui kompatybilność z Tailwind v4** | 🟡 Do sprawdzenia | shadcn/ui `v2` (`npx shadcn@latest`) powinien wspierać Tailwind v4; jeśli nie — własne komponenty z Radix UI |
| 4 | **Vercel Hobby — limit 12 Serverless Functions** | 🟢 Ryzyko niskie | Aplikacja używa głównie Server Actions (nie liczą się osobno); Route Handlers tylko dla pobierania raportów |
| 5 | **Neon DB — connection pooling na Hobby** | 🟢 OK | `@prisma/adapter-neon` z `@neondatabase/serverless` — pooling wbudowany |
| 6 | **Brak plików testowych od klienta** | 🟡 Może opóźnić Fazę 4 | Priorytetyzacja importu po dostarczeniu; jeśli brak — MVP bez importu, tylko ręczne wpisy |

---

## 14. Checklist przed rozpoczęciem implementacji

- [ ] Potwierdzić dostęp do Neon DB (utworzyć konto, projekt)
- [ ] Potwierdzić dostęp do Resend (klucz API dla domeny GO GLOBAL GROUP)
- [ ] Utworzyć repozytorium GitHub (prywatne)
- [ ] Podłączyć repozytorium do Vercel
- [ ] Wygenerować `SESSION_SECRET` (`openssl rand -base64 32`)
- [ ] Potwierdzić, że `shadcn/ui` z `npx shadcn@latest init` działa z Tailwind v4
- [ ] Sprawdzić jsPDF + polskie znaki na proof-of-concept
- [ ] Ustalić z klientem harmonogram dostarczenia plików KSeF/KOBIZE/WF-MAG
- [ ] Ustalić domenę produkcyjną

---

*Dokument stworzony na podstawie `plan/opis-systemu-slad-weglowy.md`, odpowiedzi z sesji grillowania oraz analizy dokumentacji Next.js 16 w `node_modules/next/dist/docs/`.*
