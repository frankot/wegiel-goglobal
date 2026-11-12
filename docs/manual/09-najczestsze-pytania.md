# Najczęstsze pytania

## Dlaczego moja faktura nie jest widoczna na dashboardzie?

Dashboard pokazuje tylko wpisy **zweryfikowane i skorygowane**. Faktury zapisane jako szkice czekają na weryfikację przez Analityka — w sekcji [Faktury i wpisy](#faktury-i-wpisy) po rozwinięciu faktury (przycisk **Zweryfikuj** lub **Zweryfikuj szkice**). Szkice możesz zobaczyć w [Raportach](#raporty), włączając status **Szkic** w filtrach.

## Nie mogę zapisać faktury — „Podaj okres rozliczeniowy (od–do)"

Każda faktura musi mieć okres, którego dotyczy zużycie. Uzupełnij pola **Okres od** i **Okres do** na karcie faktury — w zestawieniach WAPRO MAG zawsze trzeba je wpisać ręcznie.

## Ostrzeżenie „Możliwy duplikat: faktura … ma tę samą ilość"

Ta sama dostawa mogła zostać wgrana dwa razy z różnych źródeł — np. jako XML z KSeF i jako wiersz zestawienia WAPRO MAG. Numery dokumentów się różnią, więc system tylko ostrzega. Jeśli to ta sama dostawa, usuń kartę z paczki przed zapisem.

## Arkusz (XLSX, XLS, ODS) nie jest rozpoznawany

Obsługiwane jest zestawienie przyjęć z WAPRO MAG z nagłówkami: Nazwa dostawcy, Dok. magazynowy, Data, Ilość pierwotna z dostawy, J.M. Sprawdź, czy plik nie ma zmienionych nazw kolumn.

## Pomyliłem się w ilości po zapisaniu faktury

Rozwiń fakturę na liście i kliknij ikonę ołówka przy wpisie. Użytkownik może poprawić własny szkic; wpisy zweryfikowane poprawia Analityk — dostaną wtedy status **Skorygowany**.

## System pominął pozycję, która powinna być liczona

Kliknij **Użyj mimo to** przy pominiętej pozycji. Pod pozycją widać powód pominięcia — np. jednostka „mc" oznacza miesiąc (opłatę abonamentową), a nie metr sześcienny gazu.

## Komunikat „Duplikat — faktura … jest już w systemie"

Ta faktura została już wcześniej zapisana. Nie trzeba jej dodawać ponownie — usuń ją z paczki. Komunikat „Duplikat w tej paczce" oznacza, że ten sam plik wybrano dwa razy.

## Komunikat „Brak wskaźnika obowiązującego dla daty…"

W systemie nie ma wersji wskaźnika ważnej w okresie, którego dotyczy faktura (np. faktura za 2027 rok, a wskaźnik kończy się w 2026). Analityk powinien dodać nową wersję wskaźnika w sekcji [Współczynniki emisji](#wspolczynniki-emisji).

## Komunikat „jednostka … nie jest jednostką zużycia"

W polu jednostki wpisano coś, czego system nie rozpoznaje jako ilości (np. „szt." czy „mc"). Wpisz poprawną jednostkę, np. kWh, MWh, m³, litr, kg, t, GJ.

## Faktura nie przypisuje się sama do licznika

Sprawdź w [Źródłach emisji](#zrodla-emisji), czy źródło ma uzupełniony **numer PPE** lub **numer licznika** taki jak na fakturze. Możesz też przy imporcie zaznaczyć **Zapamiętaj PPE** — kolejne faktury przypiszą się automatycznie.

## Ostrzeżenie „Nabywca na fakturze to nie Twoja firma"

NIP nabywcy na fakturze różni się od NIP-u w sekcji [O firmie](#o-firmie). Upewnij się, że faktura dotyczy Twojej firmy, oraz że NIP firmy jest wpisany poprawnie.

## Nie mogę dezaktywować źródła emisji

Do źródła są przypisane wpisy w statusie **Szkic**. Najpierw muszą zostać zweryfikowane — Analityk zrobi to w sekcji [Faktury i wpisy](#faktury-i-wpisy) przyciskiem **Zweryfikuj** przy wpisie albo **Zweryfikuj szkice** dla całej faktury.

## Nie widzę przycisku „Zapisz i zweryfikuj" ani „+ nowe"

Te funkcje są dostępne tylko dla roli **Analityk**. Jako Użytkownik zapisujesz faktury jako szkice.

## Czy zmiana wskaźnika zmieni moje stare raporty?

Nie. Każdy wpis zapamiętuje wartość wskaźnika z chwili zapisu. Zmiana lub nowa wersja wskaźnika nie wpływa na wpisy zweryfikowane — co najwyżej, po potwierdzeniu, na szkice.

## Nie pamiętam hasła / konto jest zablokowane

Po kilku nieudanych próbach logowanie jest czasowo blokowane — odczekaj podaną liczbę minut. Jeśli nie pamiętasz hasła, skontaktuj się z administratorem systemu.
