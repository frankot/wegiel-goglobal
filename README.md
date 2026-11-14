# Ślad węglowy — System IT GO GLOBAL GROUP

Aplikacja do obliczania, monitorowania i raportowania śladu węglowego przedsiębiorstwa GO GLOBAL GROUP, zgodnie z metodyką **GHG Protocol (Greenhouse Gas Protocol)**.

## Zakres systemu

- **Scope 1** — emisje bezpośrednie ze spalania paliw (instalacje stacjonarne, pojazdy firmowe)
- **Scope 2** — emisje pośrednie z zakupu energii (elektrycznej, cieplnej, chłodniczej)
- **Scope 3** — gotowość architektoniczna do rozbudowy o 15 kategorii łańcucha wartości

## Funkcjonalności

| Moduł | Opis |
|-------|------|
| **Dashboard** | KPI emisyjności: całkowite CO₂e, Scope 1, Scope 2, zmiana YoY, wykresy miesięczne |
| **Źródła emisji** | Katalog instalacji, pojazdów i punktów poboru energii z przypisanymi wskaźnikami |
| **Współczynniki emisji** | Centralny katalog wskaźników KOBIZE i GHG Protocol z wersjonowaniem datami |
| **Faktury i wpisy** | Ręczne wprowadzanie, import KSeF XML i WAPRO MAG (XLSX/XLS/ODS), auto-przeliczanie CO₂e |
| **Raporty** | Generowanie PDF/XLSX/CSV zgodnych z ESRS E1, archiwum raportów |
| **Administracja** | Zaproszenia e-mail (Resend), role Analityk/Użytkownik, dezaktywacja kont |

## Role użytkowników

| Rola | Uprawnienia |
|------|-------------|
| **Administrator** | Konto techniczne (deweloper) — wszystko, co Analityk, oraz zarządzanie kontami administratorów; niewidoczne dla klienta |
| **Analityk** | Pełny dostęp do danych: źródła, wskaźniki, faktury, weryfikacja i korekta wpisów, raporty; zapraszanie i zarządzanie użytkownikami |
| **Użytkownik** | Podgląd danych, pobieranie raportów, dodawanie faktur jako szkice i poprawianie własnych szkiców |

## Dokumentacja

- [Dokumentacja techniczna](docs/technical/) — architektura, baza danych, konfiguracja, wdrożenie, bezpieczeństwo, obliczenia, utrzymanie (w aplikacji: `/manual/techniczna`, rola Administrator)
- [Instrukcja obsługi](docs/manual/) — dla użytkowników (w aplikacji: `/manual`)
- [Opis systemu (wymagania funkcjonalne)](plan/opis-systemu-slad-weglowy.md)
- [Specyfikacja implementacyjna](plan/spec-implementacyjna.md)
- [Brief techniczny GO GLOBAL GROUP](plan/Brief_techniczny_GO_GLOBAL_GROUP%20(1).docx)
- [Załącznik nr 1 — Opis Przedmiotu Zamówienia](plan/Zalacznik_nr_1_OPZ_GO_GLOBAL_GROUP_system-IT.docx)

## Stack technologiczny

| Warstwa | Technologia |
|---------|-------------|
| Frontend | Next.js 16 + React 19 + TypeScript |
| UI | Tailwind CSS 4 + shadcn/ui |
| Backend | Next.js Server Actions |
| Baza danych | PostgreSQL (Neon DB) + Prisma ORM |
| Autoryzacja | JWT (jose) + bcryptjs |
| Walidacja | Zod |
| Wykresy | Recharts |
| Import plików | fast-xml-parser (KSeF XML) + SheetJS (WAPRO MAG: XLSX/XLS/ODS) |
| Raporty | jsPDF + jspdf-autotable (PDF), SheetJS (XLSX), PapaParse (CSV) |
| Pliki | Vercel Blob (prywatny) |
| E-mail | Resend |
| Deployment | Vercel + GitHub CI/CD |

## Metodologia

Obliczanie śladu węglowego opiera się na wzorze:

> **Emisja CO₂e [kg] = Zużycie [jednostka] × Wskaźnik emisyjny [kg CO₂e / jednostka]**

Wskaźniki emisyjne publikowane przez:
- **KOBIZE** (Krajowy Ośrodek Bilansowania i Zarządzania Emisjami) — energia elektryczna
- **GHG Protocol** — standardowe paliwa (ON, benzyna, gaz ziemny, LPG, węgiel)

System przygotowuje firmę do zgodności z:
- **CSRD** (Corporate Sustainability Reporting Directive)
- **ESRS E1** (European Sustainability Reporting Standards — Climate Change)

---

GO GLOBAL GROUP — 2026
