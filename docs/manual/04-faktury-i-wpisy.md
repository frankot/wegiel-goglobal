# Faktury i wpisy

W tej sekcji przeglądasz zapisane faktury i dodajesz nowe. Każda faktura składa się z jednego lub kilku **wpisów emisyjnych** — po jednym na każdą pozycję zużycia.

## Lista faktur

Tabela pokazuje wszystkie faktury w systemie, a nad nią łączną liczbę faktur i sumę emisji.

| Kolumna | Znaczenie |
|---|---|
| **Numer** | Numer faktury. Kliknij go, aby otworzyć szczegóły. Ikona spinacza oznacza dołączony plik PDF. |
| **Data / Okres** | Data wystawienia i okres rozliczeniowy, którego dotyczy faktura. |
| **Dostawca** | Nazwa (lub NIP) sprzedawcy. |
| **Poz.** | Liczba wpisów emisyjnych z tej faktury. |
| **CO₂e [t]** | Łączna emisja z faktury w tonach. |
| **Status** | Statusy wpisów: Szkic, Zweryfikowany, Skorygowany. |
| **Źródło** | „KSeF XML" — faktura wgrana z pliku XML, „WAPRO MAG" — dokument z zestawienia XLSX, „Ręczna" — wpisana ręcznie. |

Strzałka na początku wiersza rozwija listę wpisów z tej faktury: źródło emisji, zużycie, użyty wskaźnik, wynik, status i autora wpisu. Jeśli jednostka na fakturze była inna niż we wskaźniku (np. MWh zamiast kWh), zobaczysz też oryginalną wartość „z faktury".

## Weryfikacja, korekta i usuwanie wpisów

Po rozwinięciu faktury strzałką przy każdym wpisie pojawiają się przyciski:

- **Zweryfikuj** — **Tylko Manager**. Zatwierdza wpis w statusie Szkic; od tej chwili jest wliczany do dashboardu i raportów.
- **Ołówek** — poprawia ilość. Pracownik może poprawiać tylko własne szkice. Manager może poprawić każdy wpis — jeśli wpis był już zweryfikowany, zmieni status na **Skorygowany**, a zmiana trafi do dziennika audytu.
- **Kosz** — **Tylko Manager**. Usuwa wpis po potwierdzeniu. Jeśli to jedyny wpis faktury, usuwana jest cała faktura.

Nad listą wpisów Manager ma też przyciski dla całej faktury:

- **Zweryfikuj szkice (N)** — zatwierdza naraz wszystkie szkice tej faktury.
- **Usuń fakturę** — usuwa fakturę razem z wpisami i załącznikami, po potwierdzeniu.

Emisja jest zawsze przeliczana według wskaźnika zapisanego przy wpisie — korekta ilości nie zmienia użytego wskaźnika.

## Szczegóły faktury

Po kliknięciu numeru faktury otwiera się okno ze wszystkimi informacjami:

- dane dostawcy i nabywcy, numer KSeF, okres rozliczeniowy, numer PPE i licznika, grupa taryfowa, kwota brutto,
- **Wpisy emisyjne** — jak obliczono emisję dla każdej pozycji i suma dla faktury,
- **Pozycje na dokumencie** — wszystkie pozycje z oryginalnej faktury, z informacją, które zostały **liczone**, a które **pominięte** (najedź na „pominięta", aby zobaczyć powód),
- **Pliki** — przyciski do pobrania oryginalnego pliku XML i dołączonych PDF-ów.

## Dodawanie faktur

Kliknij **Dodaj faktury** na górnym pasku. Faktury możesz dodać na cztery sposoby.

### 1. Import plików XML z KSeF (zalecane)

1. Przeciągnij pliki XML na pole importu albo kliknij **Wybierz pliki**.
2. System odczyta każdą fakturę i przygotuje jej **kartę** z wypełnionymi danymi.
3. Sprawdź karty, popraw to, co wymaga uwagi, i zapisz.

Ograniczenia: **do 20 plików naraz** i **do 10 MB łącznie**. Większą liczbę faktur podziel na kilka paczek. Każdy plik XML to jedna faktura.

### 2. Zestawienie z WAPRO MAG (XLSX, XLS, ODS)

Możesz wgrać arkusz (Excel .xlsx/.xls lub OpenDocument .ods) z zestawieniem przyjęć wyeksportowanym z **WAPRO MAG** (kolumny: Nazwa dostawcy, Dok. magazynowy, Dok. handlowy, Data, Cena netto, Ilość pierwotna z dostawy, J.M). Jeden plik może zawierać wiele dostaw:

- każdy **dokument magazynowy** (np. „PZ /ŚW/001/0826") staje się osobną kartą faktury,
- jako numer używany jest numer dokumentu handlowego, a gdy go brak — numer dokumentu magazynowego,
- **data** z zestawienia trafia do daty wystawienia; **okres rozliczeniowy** nie występuje w pliku — trzeba go uzupełnić („Okres od / do") przed zapisem,
- zestawienie nie zawiera NIP-u ani numeru PPE, więc system rozpoznaje dostawcę po **nazwie** i uzupełnia NIP oraz źródło emisji na podstawie wcześniejszych faktur tego dostawcy — sprawdź przypisanie przed zapisem.

Jedna paczka może zawierać maksymalnie **100 dokumentów** łącznie ze wszystkich plików.

### 3. Faktura PDF

Pliku PDF system nie odczytuje automatycznie. Gdy go wgrasz, otworzy się **pusty formularz** do ręcznego wypełnienia, a PDF zostanie dołączony do faktury jako dowód (np. dla audytora).

### 4. Wpis ręczny bez pliku

Kliknij **Dodaj fakturę ręcznie** pod polem importu. Wypełnij:

- **Numer faktury**, **Datę wystawienia** i okres rozliczeniowy (**Okres od / Okres do**) — pola obowiązkowe,
- **Dostawcę**, **NIP dostawcy**, **NIP odbiorcy** i **Numer KSeF** — pola opcjonalne,
- pozycje — dla każdej opis, źródło emisji, wskaźnik i ilość. Kolejne pozycje dodasz przyciskiem **Dodaj pozycję**, a zbędne usuniesz ikoną kosza.

Po wybraniu źródła emisji system sam podpowie jednostkę i domyślny wskaźnik.

## Karta faktury — co oznaczają kolory

| Kolor i etykieta | Znaczenie |
|---|---|
| Zielona — **Gotowa** | Wszystko się zgadza. Karta jest zwinięta, można ją zapisać bez zmian. |
| Żółta — **Wymaga uwagi** | Coś wymaga Twojej decyzji (np. niepewne przypisanie źródła albo ostrzeżenie). Karta jest rozwinięta. |
| Czerwona — **Błąd** | Duplikat lub błąd odczytu. Takiej faktury nie da się zapisać. |

Pod nagłówkiem karty widać listę problemów (na czerwono) i ostrzeżeń (na żółto). Kliknij nagłówek, aby rozwinąć lub zwinąć kartę. Ikona po prawej usuwa fakturę z paczki.

## Praca z pozycjami faktury

Dla każdej pozycji faktury widzisz cztery pola:

- **Źródło emisji** — którego licznika, kotła lub pojazdu dotyczy pozycja,
- **Wskaźnik emisji** — wraz z okresem ważności wybranej wersji,
- **Ilość** i jednostka,
- **Wyliczona emisja** — wynik liczony na bieżąco przy każdej zmianie.

### Automatyczne przypisanie źródła

System próbuje sam dopasować pozycję do źródła emisji, w tej kolejności:

| Na podstawie | Pewność |
|---|---|
| Numeru PPE (punktu poboru energii) | ✓ dopasowano automatycznie |
| Numeru licznika | ✓ dopasowano automatycznie |
| NIP dostawcy | ⚠ prawdopodobne |
| Wcześniejszych faktur tego samego dostawcy (zestawienia WAPRO MAG) | ⚠ prawdopodobne |
| Słów w opisie pozycji (np. „olej napędowy") | ⚠ zgadywane |
| Jedynego aktywnego źródła w danej jednostce (zestawienia WAPRO MAG) | ⚠ zgadywane |
| Nic nie pasuje | ✗ brak dopasowania — wybierz źródło ręcznie |

Pod polem źródła zawsze widać, na jakiej podstawie dokonano dopasowania. Gdy jest ono niepewne, sprawdź je i w razie potrzeby zmień.

### Zapamiętywanie numeru PPE

Jeśli faktura ma numer PPE, którego system jeszcze nie zna, po ręcznym wybraniu źródła pojawi się pole **„Zapamiętaj PPE … dla tego źródła"**. Zaznacz je, a kolejne faktury z tego punktu przypiszą się same. Z czasem import faktur od stałych dostawców staje się niemal całkowicie automatyczny.

### Pozycje pominięte

Pozycje, które nie są zużyciem (np. „opłata handlowa 1 mc" czy abonament), system **pomija** i wyświetla je na szaro z podanym powodem. Jeśli uważasz, że pozycję trzeba policzyć, kliknij **Użyj mimo to**. Taką pozycję można później ponownie wyłączyć przyciskiem **Pomiń**.

### Dane faktury

Na każdej karcie — niezależnie od tego, czy faktura pochodzi z XML, z WAPRO MAG czy jest wpisywana ręcznie — można edytować:

- **Okres od / Okres do** — **obowiązkowe**. Bez okresu rozliczeniowego faktury nie da się zapisać.
- **Dostawca**, **NIP dostawcy**, **NIP odbiorcy**, **Numer KSeF** — opcjonalne. Gdy pole jest puste (albo NIP nie ma 10 cyfr), pod nim pojawi się pomarańczowa podpowiedź, ale zapis jest możliwy.

### Poprawianie wartości

Każde pole odczytane z faktury można zmienić. Obok zmienionego pola pojawia się ikona strzałki — kliknij ją, aby **przywrócić wartość z faktury**.

Jednostki przeliczają się same: jeśli faktura jest w MWh, a wskaźnik w kWh, system zamieni 1 MWh na 1000 kWh. Tak samo GJ → kWh i tony → kg. O każdym takim przeliczeniu informuje niebieska podpowiedź pod polem ilości, np. „↻ przeliczono 2,852 MWh → 2 852 kWh (jednostka wskaźnika)".

### Tworzenie źródła lub wskaźnika w trakcie importu

**Tylko Manager** — przy polach **Źródło emisji** i **Wskaźnik emisji** jest przycisk **+ nowe**. Otwiera on formularz nowego źródła lub wskaźnika, wstępnie wypełniony danymi z faktury (typ, jednostka, numer PPE, NIP dostawcy, rok). Po zapisaniu nowe źródło lub wskaźnik od razu zostaje przypisane do pozycji.

## Kontrole wykonywane przez system

- **Duplikaty** — system sprawdza, czy taka faktura nie jest już zapisana oraz czy ten sam plik nie został wybrany dwa razy w jednej paczce. Duplikatu nie da się zapisać.
- **Możliwy duplikat z innego źródła** — jeśli inna faktura tego samego dostawcy z tego samego dnia ma identyczną ilość (np. ta sama dostawa wgrana raz z KSeF, a raz z WAPRO MAG), pojawi się żółte ostrzeżenie. Zapis nie jest blokowany — sprawdź, czy to nie ta sama dostawa, i w razie potrzeby usuń kartę z paczki.
- **Nabywca** — jeśli NIP nabywcy na fakturze różni się od NIP-u Twojej firmy, pojawi się ostrzeżenie. Sprawdź, czy faktura na pewno dotyczy Twojej firmy.
- **Odczyty licznika** — jeśli tabela odczytów na fakturze pokazuje inne zużycie niż pozycja, pojawi się żółte ostrzeżenie. Nie blokuje ono zapisu — decyzja należy do Ciebie.
- **Ważność wskaźnika** — system dobiera wersję wskaźnika obowiązującą w okresie, którego dotyczy faktura. Przy okresie na przełomie lat decyduje **koniec okresu**.

## Zapisywanie

Na dole strony widać, ile faktur jest gotowych do zapisu i jaka jest łączna emisja paczki. Dostępne są dwa przyciski:

- **Zapisz jako szkice** — faktury trafiają do systemu ze statusem **Szkic**. Tak zapisuje Pracownik.
- **Zapisz i zweryfikuj** — **Tylko Manager**. Faktury zapisują się od razu jako **Zweryfikowane** i są wliczane do dashboardu i raportów.

Każda faktura zapisuje się **osobno**. Jeśli 1 z 10 faktur ma błąd, pozostałe 9 i tak zostanie zapisanych — zobaczysz komunikat „Zapisano 9 z 10". Faktury, których nie udało się zapisać, zostają w podglądzie razem z opisem błędu — popraw je i zapisz ponownie.

Przycisk **Wyczyść paczkę** usuwa z podglądu wszystkie karty (niczego nie usuwa z systemu).
