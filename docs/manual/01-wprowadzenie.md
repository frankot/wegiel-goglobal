# Wprowadzenie

System służy do liczenia **śladu węglowego** firmy, czyli tego, ile CO₂ powstaje w związku z jej działalnością. Wgrywasz faktury za energię i paliwa, a system sam odczytuje zużycie, przelicza je na emisję CO₂e i przygotowuje raporty (np. do sprawozdawczości ESRS E1 / CSRD).

## Jak liczona jest emisja

Cały system opiera się na jednym prostym wzorze:

> **Emisja CO₂e = zużycie × wskaźnik emisji**

Przykład: faktura za prąd pokazuje zużycie **2852 kWh**, a wskaźnik dla prądu w Polsce wynosi **0,553 kg CO₂e/kWh**.
2852 × 0,553 = **1577,156 kg**, czyli ok. **1,58 t CO₂e**.

Cena i kwota na fakturze **nie mają wpływu** na emisję — liczy się wyłącznie ilość (kWh, m³, litry itd.).

## Najważniejsze pojęcia

| Pojęcie | Co oznacza |
|---|---|
| **Źródło emisji** | Konkretna „rzecz, która emituje": licznik prądu, kocioł gazowy, samochód służbowy. |
| **Wskaźnik emisji** (współczynnik) | Ile kg CO₂e daje jedna jednostka, np. 0,553 kg CO₂e na 1 kWh prądu. |
| **Zakres 1** | Emisje bezpośrednie — to, co firma sama spala: kotły, piece, agregaty, pojazdy firmowe. |
| **Zakres 2** | Emisje pośrednie — energia kupiona od dostawcy: prąd, ciepło sieciowe, chłodzenie. |
| **Wpis emisyjny** | Jedna pozycja faktury przeliczona na emisję (np. „Energia elektryczna — 2852 kWh"). |
| **CO₂e** | „Ekwiwalent CO₂" — wspólna miara dla wszystkich gazów cieplarnianych. |

Zakresu **nie wybiera się ręcznie** — system ustala go sam na podstawie typu źródła emisji. Dzięki temu nie da się np. przypisać samochodu do Zakresu 2.

## Statusy wpisów

Każdy wpis emisyjny ma jeden z trzech statusów:

| Status | Znaczenie |
|---|---|
| **Szkic** | Wpis roboczy, jeszcze niesprawdzony. Nie jest wliczany do dashboardu ani (domyślnie) do raportów. |
| **Zweryfikowany** | Wpis sprawdzony i zatwierdzony przez Analityka. Wliczany do dashboardu i raportów. |
| **Skorygowany** | Wpis zatwierdzony, który został później poprawiony. Również wliczany do raportów. |

Każdy wpis **zapamiętuje wartość wskaźnika z chwili zapisu**. Gdy wskaźnik zmieni się w przyszłości (np. KOBIZE opublikuje nową wartość), zapisane wcześniej wyniki pozostaną bez zmian. To ważne dla audytora — raport za dany rok zawsze da się odtworzyć.

## Role użytkowników

| Rola | Co może |
|---|---|
| **Użytkownik** | Przegląda dashboard, faktury, źródła i wskaźniki, pobiera raporty. Dodaje faktury — zapisują się jako **szkice** — i może poprawiać własne szkice, dopóki nie zostaną zweryfikowane. |
| **Analityk** | Wszystko, co Użytkownik, a dodatkowo: weryfikuje, koryguje i usuwa wpisy, zarządza źródłami emisji, wskaźnikami i danymi firmy oraz zaprasza nowe osoby i zarządza ich kontami w sekcji **Administracja**. |

W tej instrukcji czynności dostępne tylko dla Analityka są oznaczone etykietą **Tylko Analityk**.
