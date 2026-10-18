y# Rodzaje faktur: decyzje do podjęcia

System liczy emisję CO₂e z ilości (kWh, m³, litry…) odczytanej z pozycji faktury KSeF. Dziś obsługuje poprawnie zwykłą fakturę sprzedażową energii, np. Unimot: jedna pozycja „Energia elektryczna” w kWh oraz opłaty w „mc”, które są pomijane.

Inne rodzaje faktur mogą zawyżać albo zaniżać wynik. Prosimy o zaznaczenie, które z nich firma faktycznie otrzymuje, i o wybór sposobu obsługi.

---

### 1. Faktury korygujące (KOR)
**Problem:** korekta jest dziś traktowana jak nowa faktura. Jej ilość jest **doliczana** do oryginału zamiast go poprawiać.
**Czy firma otrzymuje korekty od dostawców energii/paliw?** ☐ tak ☐ nie ☐ nie wiem

Opcje:
- **A.** Korekta zastępuje oryginał: system odnajduje fakturę pierwotną i zapisuje różnicę (także ujemną).
- **B.** Korekta jest wstrzymywana do ręcznej decyzji: system jej nie liczy, tylko pokazuje ostrzeżenie.
- **C.** Korekt nie importujemy, użytkownik poprawia wpis ręcznie.

### 2. Osobne faktury za dystrybucję energii
**Problem:** faktura dystrybucyjna (np. PGE Dystrybucja, Tauron Dystrybucja) zawiera pozycje w kWh: opłata sieciowa zmienna, jakościowa, OZE, kogeneracyjna. To **opłaty liczone od tej samej energii**, a nie dodatkowe zużycie. Bez reguły system policzy tę samą energię kilka razy.
**Czy któryś punkt poboru ma osobne faktury za sprzedaż i za dystrybucję?** ☐ tak ☐ nie ☐ nie wiem

Opcje:
- **A.** Faktury dystrybucyjne nie tworzą emisji. Liczymy tylko fakturę sprzedażową (zalecane).
- **B.** Liczymy z faktury dystrybucyjnej, a sprzedażową pomijamy. Sensowne, gdy nie zawsze przychodzi.

### 3. Faktury kompleksowe (sprzedaż + dystrybucja na jednej fakturze)
**Problem:** ta sama ilość kWh występuje w kilku pozycjach: energia czynna i opłaty dystrybucyjne.
**Czy firma otrzymuje faktury kompleksowe?** ☐ tak ☐ nie ☐ nie wiem

Proponowane rozwiązanie: liczymy tylko pozycję „energia czynna/elektryczna”. Opłaty w kWh są widoczne na karcie faktury jako pominięte, z możliwością ręcznego włączenia.

### 4. Taryfy strefowe (np. G12, C12: dzień/noc)
Kilka pozycji energii w kWh na jednej fakturze **należy zsumować**. To już działa poprawnie. Pytamy tylko dla potwierdzenia:
**Czy któryś punkt ma taryfę wielostrefową?** ☐ tak ☐ nie ☐ nie wiem

### 5. Faktury zaliczkowe / prognozowe
**Problem:** zaliczka zawiera ilość prognozowaną, a potem przychodzi faktura rozliczeniowa z rzeczywistym zużyciem. Liczenie obu podwaja emisję.
**Czy firma otrzymuje faktury zaliczkowe lub prognozowe?** ☐ tak ☐ nie ☐ nie wiem

Opcje:
- **A.** Zaliczki nie tworzą emisji, liczymy tylko faktury rozliczeniowe (zalecane).
- **B.** Zaliczki liczymy, a rozliczenie zapisuje tylko różnicę.

### 6. Jedna faktura dla kilku punktów poboru
**Problem:** system przypisuje dziś całe zużycie do pierwszego punktu poboru z faktury.
**Czy dostawca wystawia jedną fakturę zbiorczą za kilka liczników/lokalizacji?** ☐ tak ☐ nie ☐ nie wiem

Opcje:
- **A.** Automatyczny podział pozycji na punkty poboru (więcej pracy po naszej stronie).
- **B.** Taka faktura zawsze wymaga ręcznego przypisania pozycji do źródeł.

### 7. Paliwa (karty flotowe, faktury za olej opałowy, gaz w butlach)
**Czy faktury za paliwo przychodzą przez KSeF jako XML?** ☐ tak ☐ nie (PDF/papier) ☐ nie wiem
**Czy faktura flotowa zawiera wiele tankowań różnych pojazdów?** ☐ tak ☐ nie ☐ nie wiem

---

**Do przekazania:** zaznaczone odpowiedzi oraz, jeśli to możliwe, **po jednym przykładowym pliku XML** każdego rodzaju faktury, który firma otrzymuje. Na tej podstawie przygotujemy i przetestujemy reguły importu.
