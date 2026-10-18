# Code review: backend & calculation logic

**Date:** 2026-10-13 · **Commit:** `a9a90eb` · **Scope:** auth, proxy, server actions, emissions math, KSeF import, dedupe, factors, sources, reports, schema.
UI components were only read where they call into the backend.

**Baseline:** `npm test` 99/99 pass · `tsc --noEmit` clean · `eslint` clean.

## Decisions taken during review

| Question | Decision | Effect on this report |
|---|---|---|
| Meaning of `CORRECTED` | **Verified after a fix**: counted in totals | Keep it in the default report statuses (§2.3). Make "correct" an actual edit flow. |
| Multi-month invoices | **Pro-rata split by days** | New requirement: see §3.1 |
| Correction / distribution / combined invoices | **Client decides** | See [`decyzje-klienta-faktury.md`](decyzje-klienta-faktury.md). Risks are listed in §2.1. |
| Scope 2 method | **Location-based only for now** | Low priority; label the report (§5.6) |

## Overall assessment

The calculation core is solid. Decimal-only arithmetic, server-side recompute, factor snapshots on entries, a unit allow-list (`mc` ≠ m³), per-invoice transactions and pure, tested functions are all the right calls. These are good foundations for an ESRS E1 tool.

The main risks are in four places:

1. **Deployment and security config:** a hard-coded JWT fallback secret, a proxy that never runs, and public blobs.
2. **Trust boundary on save:** the server recomputes CO₂e but does **not** re-check *which* factor or source the client picked.
3. **Audit promise (D10) is broken:** verified entries can be silently edited, and the report uses the *current* source scope instead of a snapshot.
4. **Domain gaps in the import:** correction invoices, kWh fee lines and multi-month periods.

Severity: 🔴 critical, fix before any production use · 🟠 high, wrong numbers or a real security hole · 🟡 medium · ⚪ low / hygiene.

---

## 1. Security & infrastructure

> **Status 2026-10-18: section implemented** (uncommitted). Corrections made while fixing:
> - §1.3 downgraded to 🟡. Blob URLs carry a random suffix, so the risk is leaked or retained links, not open listing. The chosen fix is the "middle ground": the store stays public, the browser never sees blob URLs, downloads go through `/api/attachments/[id]` (logged in + audited), and blobs are deleted with the invoice. **New finding during the fix:** the upload-time `mimeType` came from the browser. The route now serves content types by attachment kind, which prevents stored XSS through an HTML file renamed to `.pdf`.
> - §1.8: XLSX was **not** vulnerable (SheetJS writes strings as text cells). Only CSV text columns are escaped.
> - §1.5: rate limiting uses the `LoginAttempt` table (migration `20261018120000_add_login_attempt`). 5 failures per email+IP or 20 per IP within 15 min. Email alone never locks, to prevent lockout DoS against the manager.
> - §1.7: invites hash the token. The link is returned in the action result instead of being logged. E-mail sending and an admin screen are planned for later (worker accounts with stats preview and drafts).

### 1.1 🔴 Hard-coded fallback JWT secret
`lib/auth/session.ts:5-7`, `app/proxy.ts:4-6`

```ts
process.env.SESSION_SECRET || "dev-secret-change-in-production"
```
If `SESSION_SECRET` is missing on Vercel (typo, new environment, preview deploy), anyone can sign their own HS256 token with `{ userId, role }`. Combined with a known or guessable user id (cuid), that means full account takeover.

**Fix:** fail closed.
```ts
// lib/auth/secret.ts
const raw = process.env.SESSION_SECRET;
if (!raw || raw.length < 32) throw new Error("SESSION_SECRET missing or too short");
export const SESSION_SECRET = new TextEncoder().encode(raw);
```
Import it in both `session.ts` and the proxy. Also add an `env.ts` that validates all required env vars (`DATABASE_URL`, `SESSION_SECRET`, `BLOB_READ_WRITE_TOKEN`, `NEXT_PUBLIC_APP_URL`) with zod at startup.

### 1.2 🟠 `app/proxy.ts` is never executed
Next 16 only picks up `proxy.ts` at the **project root** (or `src/`), at the same level as `app/`. In `app/proxy.ts` it is an ordinary unused module. I checked this against `node_modules/next/dist/docs/.../proxy.md:23`.

Current impact is limited, because `(dashboard)/layout.tsx` and every action and route call `getCurrentUser()`. Still:
- Logged-in users visiting `/login` are not redirected.
- Anyone adding a page outside `(dashboard)`, or a route handler, will assume the proxy protects it.

**Fix:** `git mv app/proxy.ts proxy.ts`. Keep it as an *optimistic* check only. The real check stays in `getCurrentUser()`. Also remove the empty `src/` directory tree so it can't confuse the root resolution.

### 1.3 🟠 Invoice files uploaded as **public** blobs
`lib/import/storage.ts:25`: `access: "public"`.
Invoices contain supplier/buyer data, PPE numbers, addresses and prices. Anyone with the URL can download them without logging in, and the URL is returned to the client and stored in the DB.

**Fix:** use `access: "private"` (Vercel Blob private stores). Serve files through an authenticated route like `/api/invoices/[id]/xml`, e.g. `/api/attachments/[id]`, which checks `getCurrentUser()` and streams the blob.

### 1.4 🟠 Deactivated user with a valid cookie → error page instead of logout
`lib/db/users.ts:17`: `deleteSession()` calls `cookies().delete()`. That is **not allowed during Server Component rendering**, and `getCurrentUser()` is called from the layout and pages. A deactivated user with a still-valid 7-day JWT gets a runtime error, not a redirect.

**Fix:** in `getCurrentUser()` just `redirect("/login?expired=1")` without touching cookies. Clear the cookie in the login page's action, or in the (fixed) proxy when the DB says inactive. Alternatively, catch only in actions and route handlers.

### 1.5 🟡 No brute-force protection on login and setup
`lib/auth/actions.ts:login` and `app/api/setup/route.ts` have no rate limit or lockout. `login` also does bcrypt only when the user exists, which leaks via timing whether an e-mail is registered.

**Fix:**
- Add a simple rate limit per IP + e-mail (Upstash/Vercel KV, or a `LoginAttempt` table).
- Always run `verifyPassword` against a dummy hash when the user doesn't exist.
- Use `crypto.timingSafeEqual` for the setup key.
- Validate the setup password with the same `signupSchema` rules.

### 1.6 🟡 Setup endpoint race
`app/api/setup/route.ts:9`: `count()` followed by `create()` is not atomic. Two concurrent calls can create two managers.
**Fix:** check the key **first** (before touching the DB), and wrap count + create in a `Serializable` transaction. Or disable the route entirely once `SETUP_KEY` is removed from env.

### 1.7 🟡 Invitations
`lib/auth/actions.ts:105-115`
- The token is stored in **plaintext** (`invitationToken @unique`). A DB read leak lets an attacker activate pending accounts. **Fix:** store `sha256(token)` and compare hashes.
- The link is only `console.log`-ged. On Vercel that means it sits in the runtime logs, which is a secret in the logs. The e-mail is never sent (Resend is a TODO).
- `inviteUser` and the admin page are not wired into any UI (`admin/page.tsx` is a stub). Today the only way to get a second user is a manual DB edit.

### 1.8 🟡 CSV/XLSX formula injection
`lib/reports/export.ts:71`: `Papa.unparse` without `escapeFormulae: true`.
`supplierName` comes straight from uploaded XML (`Podmiot1/Nazwa`), and source names and notes are user input. A value like `=HYPERLINK(...)` runs when the CSV is opened in Excel.
**Fix:** `Papa.unparse(data, { ..., escapeFormulae: true })`. For XLSX, prefix string cells that start with `= + - @ \t \r` with `'`.

### 1.9 ⚪ Other
- `lib/prisma.ts`: `process.env.DATABASE_URL!`. A missing value fails late with a confusing error, which the §1.1 env validation would cover.
- JWTs are not revocable. That is acceptable because `getCurrentUser()` re-reads `role` and `active` from the DB on every request, which is good. Consider shortening the lifetime from 7 days to 1 day with sliding renewal.

---

## 2. Calculation correctness & data integrity

### 2.1 🔴 Import counts lines that are not consumption (domain risk, needs client decision)
`lib/import/ksef-xml.ts`: `assessLine()` treats **every line whose unit is in the allow-list** as emission-relevant. `RodzajFaktury` is never read.

| Case | What happens today |
|---|---|
| Correction invoice (`KOR`, `KOR_ZAL`, `KOR_ROZ`) | Imported as a **new positive consumption** and added on top of the original. `StanPrzed` lines are not recognised. |
| Distribution invoice for the same PPE (`Opłata sieciowa zmienna`, `Opłata jakościowa`, `Opłata OZE`, `Opłata kogeneracyjna` – all in **kWh**) | Each fee line is counted as consumption, so electricity is double- to quintuple-counted. |
| Combined invoice (sprzedaż + dystrybucja) | Same as above, within a single invoice. |
| Tariff zones (G12: day + night lines) | Correctly summed. This is the case that must keep working. |
| Advance invoice (`ZAL`) | Counted as consumption, then counted again on the settlement invoice. |

The Polish list for the client is in [`decyzje-klienta-faktury.md`](decyzje-klienta-faktury.md).
**Minimum fix regardless of the decision:**
- Read `Fa/RodzajFaktury`. For anything other than `VAT`, set the card to `NEEDS_ATTENTION` (or `ERROR`) with a clear message. Never `OK`.
- Add a description deny-list: `/opłata\s+(sieciowa|jakościowa|oze|kogeneracyjna|mocowa|przejściowa|abonamentowa)/i` → `emissionRelevant: false` with a visible `skipReason`. The user keeps the "Użyj mimo to" override.
- Add a cross-check: when there is more than one emission-relevant line with the same canonical unit, warn and compare with the readings table, which already exists.
- Add a per-PPE + overlapping-period check in `enrichInvoices`. If an entry already exists for the same source with an overlapping `[periodStart, periodEnd]`, show a warning ("possible double counting with invoice X").

### 2.2 🟠 Server does not validate the factor/source **choice** on save
`lib/entries/actions.ts:212-232`
The server correctly recomputes CO₂e and ignores client numbers. But it accepts **any** `factorId` and `sourceId` the client sends, as long as the units convert. Nothing checks that:
- the factor is **valid for the entry date** (`validFrom ≤ ref ≤ validTo`), so an expired 2024 factor can be used for 2026;
- the factor's **scope matches the source's scope**, so a SCOPE_1 diesel factor can be attached to an electricity source as long as the units fit;
- the client's `quantity`/`unit` still match the stored XML. An employee can change 2852 → 285.2 between preview and save. The XML in `rawPayload` will then disagree with the entry, and the audit log doesn't record the difference.

`resolveFactor` only runs in the **preview**, which is the client's suggestion.

**Fix** (in `saveSingleInvoice`, before computing):
```ts
const ref = factorRefDate(periodEnd, entryDate);
if (!(factor.validFrom <= ref && ref <= factor.validTo)) throw new Error(`Pozycja ${n}: wskaźnik nie obowiązuje w dniu ${pl(ref)}`);
if (factor.scope !== source.scope) throw new Error(`Pozycja ${n}: zakres wskaźnika ≠ zakres źródła`);
```
For `KSEF_XML`, re-parse `rawPayload` on the server and either (a) reject quantity/unit that differ from the parsed line, or (b) allow them but store `parsedQuantity` next to `originalQuantity` and add an `edited: true` diff to the audit details. Pick (b) if users are expected to fix OCR-like errors. For XML they rarely should.

### 2.3 🟠 The "VERIFIED/CORRECTED are untouchable" promise (D10) is broken
- `lib/auth/permissions.ts:12`: `canEditEntry` returns `true` for a MANAGER **regardless of status**.
- `updateEntryQuantity` (`lib/entries/actions.ts:520`) therefore rewrites quantity and CO₂e on a VERIFIED entry. The status stays `VERIFIED` and `verifierId` is still the original verifier.
- `correctEntry` (`:438`) flips the status to `CORRECTED` **without changing anything**. `verifyEntry` (`:411`) accepts any source status (CORRECTED → VERIFIED, VERIFIED → VERIFIED). There is no state machine.

With the decision "CORRECTED = verified after a fix", the consistent model is:

```
DRAFT ──verify──▶ VERIFIED ──edit (manager, reason required)──▶ CORRECTED
  ▲                                                       │
  └──────────── edit (author/manager) ────────────────────┘ (DRAFT stays DRAFT)
```
- Delete `correctEntry` as a standalone action. `CORRECTED` is only reachable through an edit of a VERIFIED/CORRECTED entry.
- That edit requires a `reason` (note), and writes the before/after (quantity, factor, co2e) into the audit **in the same transaction** as the update.
- `verifyEntry` accepts only `DRAFT`. Make the update conditional to avoid races: `updateMany({ where: { id, status: "DRAFT" } })` and check `count === 1`.
- `canEditEntry` stays as is for DRAFT. For VERIFIED/CORRECTED, add `canCorrectEntry` (manager only), which is the function that already exists but isn't used.

Note: `verifyEntry`, `correctEntry`, `updateEntryQuantity` and `inviteUser` are **not called from any UI**. Today the only way an entry reaches VERIFIED is a manager saving the import as VERIFIED. Employee imports stay DRAFT forever and never reach the dashboard, which defaults to VERIFIED + CORRECTED. That gap matters for the client demo.

### 2.4 🟠 Reports use the **current** source type/scope, not a snapshot
`lib/reports/query.ts:52-53` reads `e.source.type` and `e.source.scope`, and `updateSource` allows changing `type` (and therefore `scope`) on a source that already has entries. Re-typing a source silently moves last year's verified tonnes between Scope 1 and Scope 2 in **historical** reports. This is the same class of problem the factor snapshot was designed to prevent.

**Fix (pick one):**
- Snapshot `scope` (and `sourceType`) on `EmissionEntry` at save time and report from it. This is preferred and mirrors `factorSnapshot*`.
- Or block changing `type` in `updateSource` when `_count.entries > 0`.

Also block `unit` changes that are incompatible with existing entries' units.

### 2.5 🟡 Factor edits can break sources and drafts
`lib/factors/actions.ts:177` `updateFactor` allows changing `unit`, `scope` and `category` of a factor that:
- is a `defaultFactor` of sources (the unit/scope compatibility enforced in `sources/actions.ts` is bypassed);
- is used by DRAFT entries. `recalculateDrafts` then converts with the new unit, and if the units don't match it fails silently (`console.error` only).

**Fix:**
- If the factor has entries or sources, allow only `name`, `value` (with the drafts-recalc prompt) and dates. Changing unit, scope or category should mean "create a new factor".
- `recalculateDrafts` should run in one `$transaction`, return failures to the UI and not just log them, and write the audit inside the transaction.

### 2.6 🟡 Rounding: stored row doesn't reproduce its own result
`prisma/schema.prisma:160-175`, `lib/entries/actions.ts`
- `quantity` is computed at full precision (e.g. GJ → kWh with ×277.777778), then **Postgres** rounds it to 4 dp on insert. `co2eKg` is computed from the *unrounded* quantity, so `quantity × factorSnapshotValue ≠ co2eKg` for stored rows. An auditor recomputing from the export gets a different number.
- `co2eKg` keeps 4 dp, while `co2eTon = co2eKg / 1000` needs **7** dp but the column has 6. Example: 2852.5 kWh × 0.553 = 1577.4325 kg → 1.5774325 t is stored as 1.577433. The schema comment claims (16,6) fixes this, but it only does for ≤3 dp kg. `listInvoices` sums `co2eTon`, while reports sum `co2eKg`, so the two screens can disagree in the last digit.
- `GJ` multiplier `277.777778` is an approximation. That is fine for GJ→kWh, but kWh→GJ is a division by an inexact number. The client preview (`convertQuantityLite`) can't divide by a non-power-of-ten and returns `null`, so there is **no preview while the server still computes a value**.

**Fix:**
```ts
const quantity = convertQuantity(...).toDecimalPlaces(4, ROUND_HALF_UP);
const co2eKg   = quantity.mul(factorValue).toDecimalPlaces(4, ROUND_HALF_UP);
```
- Drop the `co2eTon` column, or make it `Decimal(16,7)` and always derive it from the stored kg. Never sum tons.
- Represent GJ as an exact rational (`1 GJ = 1000/3.6 kWh`), i.e. multiply by 1000 and divide by 3.6. Or restrict factors for heat to `kg/GJ` so no conversion happens.

### 2.7 🟡 Dedupe gaps
- `NumerKSeF` is **not part of the FA(3) XML**. It is assigned by KSeF and appears in the UPO and API metadata. None of the examples contain it. `ksefNumber` is therefore always `null`, and dedupe relies only on `(supplierNip, invoiceNumber)`. This is fine, but don't present KSeF-number dedupe as active.
- The `@@unique([supplierNip, invoiceNumber])` doesn't protect **manual** invoices without a NIP, because Postgres treats NULLs as distinct. A double-clicked save creates two invoices.
  **Fix:** require `supplierNip` for MANUAL, or add a partial unique index on `(invoiceNumber, issueDate) WHERE supplierNip IS NULL`.
- `findExistingInvoice` → `create` is not atomic. The DB constraint catches the race, but the user sees a raw Prisma `P2002` message. **Fix:** catch `P2002` in `saveSingleInvoice` and map it to the "Duplikat — …" message.

### 2.8 🟡 Multi-PPE invoices
`lib/import/ksef-xml.ts:177`: `readMeta` returns the **first** PPE and assigns it to every emission line. An invoice covering 3 meters, which the code comments explicitly anticipate (`BlokDanych` repeated), will put all consumption on one source.
**Fix:** when more than one distinct PPE appears in the attachment, mark the invoice `NEEDS_ATTENTION` ("faktura dotyczy N punktów poboru — przypisz pozycje ręcznie") until per-line PPE mapping is implemented.

### 2.9 ⚪ Smaller correctness items
- `match-source.ts:51`: `\bon\b` (case-insensitive) matches the Polish word "on". It is only a GUESS-level match, but use `/\bON\b/` (case-sensitive) or `/olej\s+nap/`.
- `unit-table.ts`: `mg` → tonne (megagram). That is correct for "Mg" but wrong if anyone types milligrams. Fine, but document it.
- The `-` sign is accepted in `schemas/invoice.ts` (`decimalString` regex) but rejected in `updateEntryQuantity`. Decide explicitly: until corrections are designed (§2.1), **reject negatives** on save.
- `resolveFactor` compares `refDate <= validTo`, where `validTo` is stored as `YYYY-MM-DDT00:00Z`. Any ref date with a time component on the last day falls outside. The fallback `new Date()` in `resolveRefDate` / `entryDate` is the only path that produces this. Normalise all ref dates to UTC midnight, or store `validTo` as an exclusive upper bound.
- `quantity Decimal(12,4)` / `co2eKg Decimal(12,4)` overflow at about 100 M. That is OK for an SME, but an overflow currently surfaces as a raw DB error. Validate the magnitude in zod.

---

## 3. New requirement: pro-rata allocation (decision: split by days)

### 3.1 Design proposal
Today `entryDate = periodEnd ?? issueDate` (`lib/entries/actions.ts:234`), and `aggregate.ts:212` buckets by `entryDate.slice(0,7)`. A 15.12.2026–14.01.2027 invoice lands 100% in 2027.

**Recommended: allocate at report time, store nothing new.**
- Each entry already has `periodStart`/`periodEnd`. In `loadRows`, select entries whose **period overlaps** the report range, not entries whose `entryDate` falls inside it:
  `where: { OR: [{ periodStart: { lte: to }, periodEnd: { gte: from } }, { periodStart: null, entryDate: range }] }`.
- In `buildReport`, split each row into day-weighted pieces per calendar month: `share = overlapDays / totalDays`, computed in `Decimal`. Use the **largest-remainder method** at 4 dp so the pieces sum exactly to the stored `co2eKg`. The tests already have a golden-number culture, so add one: `1577.156 kg over 31 days split 17/14`.
- Quantity (`usage`) is split the same way.
- Entries without a period stay 100% on `entryDate` (manual fuel receipts).
- The XLSX/CSV export should show the **allocated** kg per row plus the full entry kg, so an auditor can reconcile.
- Comparisons (`previous`, `lastYear`) use the same allocator. Pass the period-overlap query to all three loads.

**Factor version vs split:** D9 says one entry = one factor (resolved at `periodEnd`). Under pro-rata, the December part of a Dec–Jan invoice is still priced with the January factor. This is acceptable and auditable, but state it in the report's methodology note. Alternatively, split the entry into two entries at save time when the period crosses a factor-version boundary, which is the more precise option.

Alternative: create an `EmissionAllocation(entryId, month, kg, quantity)` table at save time. It is faster to query, but has to be kept in sync with every edit and recalc. Not worth it at this data volume.

---

## 4. Transactions & audit consistency

### 4.1 🟡 Audit written outside the transaction in most actions
`writeAuditTx` exists and is used for import and invoice delete. `verifyEntry`, `correctEntry`, `deleteEntry`, `updateEntryQuantity`, all factor actions, sources, company and login write the entity first and the audit **afterwards** in a separate call. A failure in between leaves a change with no audit trail, which goes against the stated principle in `audit.ts:42`.
**Fix:** use `prisma.$transaction(async tx => { update; writeAuditTx(tx, …) })` everywhere. Resolve `clientIp()` **before** the transaction. It is awaited *inside* the transaction callback in `deleteInvoice`.

### 4.2 🟡 Orphaned files
- `deleteInvoice` deletes DB rows; `InvoiceAttachment` rows cascade, but the **blobs stay forever** (public, see §1.3).
- `attachSourceFiles` runs after commit. If it fails, the invoice exists without attachments and only `console.error` records it. That is acceptable by design (D-comment), but surface it in `SaveBatchResult` as a warning so the user knows.
**Fix:** `del(blobUrls)` after the delete transaction commits, plus a periodic cleanup job for unreferenced blobs.

### 4.3 ⚪ `rememberPpeForSource` race
Check-then-update without a transaction. The `ppeNumber @unique` constraint catches it, but the resulting error is only logged. Fine.

---

## 5. Reporting & performance

### 5.1 🟡 Unbounded queries
`getReport` loads **all** entries for the range three times (current, previous, last year) with four relations each. `listInvoices` loads every invoice with every entry and has no pagination. This is fine for hundreds of rows. Before thousands, move totals to `groupBy`/`aggregate`, and paginate `/entries`.

### 5.2 ⚪ "Previous period" for the YTD preset
For `currentYear` (Jan 1 → today), `previousPeriod` returns the same-length window **ending Dec 31 last year**, e.g. 21 Mar – 31 Dec 2025. That is a strange comparison for a YTD view. Show only the YoY (`lastYear`) comparison for year presets, or define previous = the previous full calendar period.

### 5.3 ⚪ Dashboard silently hides employee work
The default statuses are VERIFIED + CORRECTED, and there is no verify UI (§2.3), so employee imports never appear on the dashboard. The "N wpisów czeka" hint helps. Add a verify action to the invoice list as the next UI task.

### 5.4 ⚪ `getCompany` / `getCurrentUser` use `react.cache`
That is correct per request. No issue. Noted because it is easy to break later by moving these into `unstable_cache`.

### 5.5 ⚪ Report file name and headers
OK. `Cache-Control: private, no-store` is set, which is good.

### 5.6 ⚪ Scope 2 method (decision: location-based only)
Label it explicitly in the PDF and XLSX, e.g. "Zakres 2 – metoda lokalizacyjna (location-based), wskaźniki KOBiZE", so the report is not read as market-based. To keep the door open, add a `scope2Method` field to the factor later (`LOCATION | MARKET`). This needs no model change now.

---

## 6. Hygiene

- `src/` contains only empty directories. Delete them.
- `getCurrentUser` is cached, but some actions still call `findUnique` on the same entity twice. Fine.
- `lib/generated/prisma` is git-ignored and generated on `postinstall`. Good. Make sure `prisma migrate deploy` runs in the Vercel build (`"build": "prisma migrate deploy && next build"`), or in a separate release step.
- `seed.ts` creates demo invoices and entries. Guard it with `if (process.env.NODE_ENV === "production") throw` so it can never run against the client DB.
- Tests cover the pure functions well. Missing: an integration test for `saveSingleInvoice` (factor/source validation, P2002 mapping), state-machine tests for verify/correct, and allocation tests once §3 lands.

---

## Suggested order of work

| # | Item | Severity | Effort |
|---|---|---|---|
| 1 | Fail-closed `SESSION_SECRET` + env validation (§1.1) | 🔴 | XS |
| 2 | Move `proxy.ts` to root, fix deactivated-user cookie bug (§1.2, §1.4) | 🟠 | XS |
| 3 | `RodzajFaktury` guard + fee-line deny-list + overlap warning (§2.1) | 🔴 | S |
| 4 | Server-side factor validity/scope check on save (§2.2) | 🟠 | S |
| 5 | Entry state machine, CORRECTED via reasoned edit, audit in tx (§2.3, §4.1) | 🟠 | M |
| 6 | Snapshot scope/type on entry (§2.4) + migration backfill | 🟠 | S |
| 7 | Private blobs + authenticated download + delete cleanup (§1.3, §4.2) | 🟠 | S |
| 8 | Rounding fix, `co2eTon` removal/derivation, GJ exact (§2.6) | 🟡 | S |
| 9 | Pro-rata allocation in reports (§3) | 🟡 (requirement) | M |
| 10 | Formula-injection escape, login rate limit, hashed invite tokens (§1.5, §1.7, §1.8) | 🟡 | S |
| 11 | Factor edit restrictions + transactional recalc (§2.5) | 🟡 | S |
| 12 | Dedupe for manual invoices, P2002 mapping, multi-PPE warning (§2.7, §2.8) | 🟡 | S |
| 13 | Remaining ⚪ items | ⚪ | — |

Open client decisions: [`decyzje-klienta-faktury.md`](decyzje-klienta-faktury.md).
