# Pulpit RasBass — zadanie dla Claude’a

Data: 9 listopada 2026. Status: makieta zaakceptowana przez właściciela; wdrożenie do wykonania.

## Cel i zaakceptowana referencja

Zaimplementuj pulpit sklepu zgodnie z [zaakceptowaną makietą](mockups/pulpit-rasbass.html), wykorzystując obecny panel admina. Właściciel zaakceptował tę makietę słowem „idealnie”. Rozbuduj stronę `/`; zachowaj istniejący styl, nawigację i obsługę zamówień.

Referencja jest fragmentem HTML z przykładowymi danymi, osadzonym logo oraz wzorem moro. To wzór wyglądu i hierarchii informacji. Docelowy panel ma korzystać z prawdziwych danych API oraz obecnych komponentów React/Mantine. Kontrolki podglądu `Tweak`, przykładowe dialogi i integracja `window.openai` służyły wyłącznie prezentacji makiety.

Ten dokument aktualizuje wcześniejszą decyzję „Pulpit = Do wysłania” z `docs/sprzedaz.md`: kolejka wysyłek pozostaje najważniejszą sekcją operacyjną, a teraz dochodzą podsumowanie, sygnały wymagające uwagi i wykres.

## Zakres

Wykonaj potrzebne zmiany panelu i API, aby wszystkie elementy pulpitu działały na rzeczywistych danych. Rozwiązuj zwykłe szczegóły implementacyjne zgodnie z konwencjami projektu. Nie zatrzymuj wdrożenia na samym widoku z danymi przykładowymi.

Nie rozbudowuj tego zadania o Stripe, InPost, historię korespondencji, analitykę ruchu, marżę, ranking bestsellerów, porównanie okresów ani nowe funkcje kreatora dodawania płyt. Nie zmieniaj reszty panelu poza zmianami niezbędnymi do działania pulpitu i jego linków.

## Wygląd i układ

Zachowaj elementy istniejącego panelu:

- Nagłówek o wysokości 56 px, aktualne moro `public/patterns/camo.svg`, białe logo `public/logo.png`, napis RASBASS i menu konta.
- Od 768 px: boczne menu o szerokości 240 px z pozycjami Pulpit, Produkty, Dodaj płytę, Szkice i Ustawienia.
- Treść wyśrodkowana w pojedynczej kolumnie o maksymalnej szerokości 640 px. Nie twórz szerokiego układu analitycznego z wieloma kolumnami.
- Na telefonie: obecne dolne menu o wysokości 72 px z uniesionym przyciskiem aparatu o średnicy 56 px.
- Figtree, bazowy tekst 18 px, nagłówki z obecnego motywu, bardzo jasne oliwkowe tło `#f8f8f6`.
- Niebieski dla akcji, żółty dla oczekiwania/szkiców, zielony dla gotowych pozycji, czerwony dla długiego oczekiwania na wysyłkę.
- Wiersze list rozdzielane cienką linią. Dodatkowe obramowane kafelki służą tylko czterem licznikom; nie otaczaj każdej sekcji osobną kartą.

Pulpit, od góry:

1. Tytuł „Pulpit”, pod nim bieżący dzień i data po polsku. Obok selektor okresu; na telefonie selektor pod tytułem, na całą szerokość.
2. Cztery kafelki podsumowania w siatce **2 × 2**, także na komputerze.
3. „Do wysłania”.
4. „Wymaga uwagi”.
5. „Sprzedaż” — pojedynczy wykres słupkowy.
6. Zwięzły pasek stanu magazynu.

W makiecie na telefonie kwota zamówienia przechodzi pod opis. Zachowaj czytelność i brak poziomego przewijania przy szerokości 320 px. Wykorzystuj istniejącą skalę typografii i wygodne cele dotykowe. Układ powinien respektować aktualny motyw aplikacji, również jeśli obsługuje ciemny wygląd.

## Zawartość i zachowanie

### Okres

- Opcje: „Ostatnie 30 dni” (domyślnie) oraz „Ostatnie 7 dni”.
- Zmiana dotyczy wartości opłaconych produktów, sprzedanych sztuk i wykresu.
- Kolejka wysyłek, szkice, płatności oczekujące i magazyn zawsze pokazują bieżący stan, niezależnie od okresu.
- Okres licz w strefie `Europe/Warsaw`: od początku dnia sprzed N−1 dni do chwili wyliczenia. Uwzględnij dzisiejszą sprzedaż; nie używaj sztywnego przesunięcia UTC, bo obowiązuje zmiana czasu.

### Cztery kafelki

| Pozycja     | Etykieta              | Wartość i dopisek                                                                 | Działanie                       |
| ----------- | --------------------- | --------------------------------------------------------------------------------- | ------------------------------- |
| Lewy górny  | Do wysłania           | Pełna liczba zamówień `paid`; „Najstarsze czeka X dni” albo odpowiedni pusty stan | Przewinięcie do kolejki wysyłek |
| Prawy górny | Opłacone produkty     | Suma wartości produktów w EUR; liczba opłaconych zamówień i długość okresu        | Przewinięcie do wykresu         |
| Lewy dolny  | Sprzedane sztuki      | Suma ilości sprzedanych pozycji; „W ostatnich N dniach”                           | Przewinięcie do wykresu         |
| Prawy dolny | Szkice do dokończenia | Liczba wszystkich szkiców; liczba gotowych do publikacji                          | Przejście do `/szkice`          |

Stosuj polską odmianę liczebników. Dane przykładowe z makiety — 4 zamówienia, 1480 €, 41 sztuk i 8 szkiców — nie są wymaganymi wartościami ani danymi do zasiania w produkcji.

### Do wysłania

- Bierz wyłącznie zamówienia `paid`, od najdłużej czekających **od opłacenia**. Sprawdź implementację sortowania: obecne `sort=oldest` sortuje po `created_at`, więc samo użycie tego parametru nie gwarantuje właściwej kolejności. Dostosuj sortowanie kolejki świadomie, bez przypadkowej zmiany znaczenia sortowania pozostałych list. Remisy rozstrzygaj deterministycznie po ID.
- Wiersz: prawdziwa miniatura płyty, kupujący, artysta i tytuł pierwszej płyty, informacja o dalszych pozycjach, kwota, czas od zapłaty, strzałka.
- Zachowaj obecną logikę oznaczeń czasu: „opłacone dziś”, następnie liczba pełnych dni; od 1 dnia żółty, od 3 dni czerwony.
- Początkowo pokaż 2 zamówienia. Gdy jest ich więcej, udostępnij „Pokaż wszystkie N zamówień”; po rozwinięciu „Pokaż mniej”. Zapewnij doładowanie także przy liczbie przekraczającej limit API. Nie udawaj pełnej listy, pokazując tylko pierwsze 50 pozycji.
- Kliknięcie wiersza otwiera **istniejącą stronę** `/zamowienia/[id]`. Przykładowy dialog z makiety nie zastępuje działającego widoku zamówienia.
- Przy braku pozycji zachowaj obecny pusty stan „Nic do wysłania”.

### Wymaga uwagi

Warunkowo pokaż dwa rodzaje wierszy:

1. **Zamówienia czekające na płatność** — liczba `pending`, łączna wartość produktów i wiek najstarszego zamówienia liczony od `created_at`. Kliknięcie umożliwia przejrzenie tych zamówień i wejście w istniejące szczegóły. Możesz użyć rozwijanej listy pod wierszem.
2. **Szkice gotowe do publikacji** — liczba i link do odpowiednich szkiców. Jeżeli dodasz filtr `/szkice`, musi rzeczywiście działać; sam link z nieobsługiwanym parametrem nie wystarczy.

Wiersz bez pozycji znika. Jeśli nie ma żadnego, sekcja znika. Nie dodawaj licznika nieodpowiedzianych wiadomości — tej funkcji jeszcze nie ma.

Licznik szkiców musi być zgodny z ekranem `/szkice` i badge’em w menu. Obecny `useProductCount("draft")` uwzględnia produkty `draft` oraz zapisane szkice rozpoznania labelu. Sprawdź ich cykl życia, aby nie zliczyć tego samego szkicu dwukrotnie. Szkic rozpoznania, który nie jest jeszcze kompletnym produktem, nie jest gotowy do publikacji.

„Gotowe” wyliczaj spójnie z obecną logiką podpowiedzi szkicu (`draftHints` i ekran szkiców). Brak odsłuchu jest ostrzeżeniem, a nie nowym zakazem publikacji. Nie dodawaj obowiązkowych pól ani nowych reguł publikacji przy okazji tego zadania.

### Sprzedaż

- Nad wykresem: wartość opłaconych produktów i krótka etykieta; obok nagłówka aktualny okres.
- Pojedyncza seria niebieskich słupków. Osie: czas i EUR. Tooltip lub dostępny podgląd pokazuje datę/zakres i kwotę.
- Dla 7 dni pokaż dni; dla 30 dni możesz agregować w czytelne, opisane przedziały jak w makiecie. Pokryj dokładnie cały wybrany okres, bez nakładania przedziałów. Brak sprzedaży w przedziale to zero.
- Pod wykresem zwięzła informacja „Łącznie X sztuk w Y zamówieniach”.
- Suma słupków musi zgadzać się z kafelkiem. Kwoty przechowuj i sumuj w eurocentach; formatuj istniejącym `formatEur`.
- Przy pustym okresie pokaż prawdziwe zera i czytelny stan bez sprzedaży.

### Magazyn

Zwięzły pasek: „X sztuk na stanie”, „Y wydań”, link „Produkty” do `/produkty`.

W tym pasku „sztuki” oznaczają sumę `quantity` dostępnych, nieusuniętych wariantów opublikowanych, nieusuniętych produktów, a „wydania” liczbę takich wariantów z `quantity > 0` (tłoczeń, nie produktów). Nie wliczaj szkiców, zerowych stanów i usuniętych pozycji. Obecne API udostępnia `copies` i `presses`, ale `presses` może obejmować także zerowe stany, a podsumowanie wariantów nie zawsze respektuje szczegółowe filtry. Nie przepisuj tych wartości bez sprawdzenia. Link powinien otwierać katalog z działającym filtrem dostępności; jego podsumowanie ma wtedy opisywać ten sam zbiór co pasek. W razie potrzeby dodaj obsługę filtra w panelu i skoryguj agregację filtrowanej listy, bez zmiany znaczenia innych widoków katalogu.

## Reguły danych i API

- Statystyki sprzedaży obejmują zamówienia w stanach `paid`, `shipped`, `delivered`, z `paid_at` w wybranym okresie. Nie licz `pending` i `cancelled`. Zamówienie wysłane nadal należy do opłaconej sprzedaży.
- Datą sprzedaży jest `paid_at`, nie `created_at` i nie data wysłania. Nie zastępuj po cichu brakującego `paid_at` datą utworzenia; sprawdź ewentualne historyczne dane i jawnie obsłuż niespójności.
- Wartości bierz ze snapshotu pozycji zamówienia: historyczna cena × ilość. Zmiana aktualnej ceny produktu nie może zmienić historii sprzedaży.
- Liczba zamówień to unikalne zamówienia; liczba sztuk to suma `quantity`. Uważaj na wielokrotne sumowanie kwoty zamówienia po połączeniu z jego pozycjami.
- „Opłacone produkty” oznaczają wartość produktów, bez dorabiania rozliczenia transportu, podatków i zwrotów. Nie nazywaj jej zyskiem ani marżą.
- Agregacje wykonuj po stronie API/bazy, po całym właściwym zbiorze. Nie obliczaj statystyk z pierwszej strony listy ani przez pobranie całego katalogu do przeglądarki.
- W razie potrzeby dodaj dedykowane endpointy podsumowania i udokumentuj je w istniejący sposób. Nazwy i DTO dopasuj do architektury projektu.
- Zachowaj uprawnienia domen: dane zamówień wymagają `orders:manage`, zarządzany katalog `products:update`, szkice kreatora `products:create`. Samo wejście do panelu z dowolnym `products:*` nie daje wszystkich tych uprawnień. Sprawdzaj je w API, nie tylko w interfejsie. Użytkownik bez dostępu do jednej domeny nie powinien otrzymywać jej statystyk; pozostała dostępna część panelu ma działać.
- Po opłaceniu, anulowaniu i innych istniejących zmianach statusów odśwież odpowiednie liczniki, kolejkę i wykres. Po zmianach produktów/szkiców odśwież ich podsumowanie. Uwzględnij osobne klucze zapytań nowych agregacji.
- Pokaż ładowanie, błąd i możliwość ponowienia. Błędu zapytania nie przedstawiaj jako wartości zero. Awaria wykresu nie powinna blokować kolejki wysyłek.

## Punkty wejścia w projekcie

Przed zmianami przeczytaj właściwe `AGENTS.md`, README panelu i lokalną dokumentację Next.js wskazaną przez `apps/admin/AGENTS.md`.

- `apps/admin/src/app/(panel)/page.tsx` — strona główna.
- `apps/admin/src/components/orders/OrdersDashboard.tsx` — obecny pulpit.
- `apps/admin/src/components/orders/OrderSection.tsx`, `OrderRow.tsx` — listy i wiersze zamówień.
- `apps/admin/src/components/records/ListRow.tsx`, `RowList.tsx` — wspólny wygląd list.
- `apps/admin/src/components/layout/PanelShell.tsx`, `SideNav.tsx`, `BottomNav.tsx` — istniejący szkielet.
- `apps/admin/src/lib/theme.ts`, `lib/format.ts` — motyw i formatowanie.
- `apps/admin/src/hooks/useOrders.ts`, `useProducts.ts`, `queryKeys.ts` — pobieranie danych i unieważnianie cache.
- `apps/admin/src/services/orders.services.ts`, `products.services.ts`, `labelDrafts.services.ts` — komunikacja z API.
- `apps/api/src/routes/order.routes.ts`, `services/order.service.ts` i repozytoria PostgreSQL — zamówienia i ich agregacje.
- `docs/sprzedaz.md` — kontekst obsługi sprzedaży; zaktualizuj opis pulpitu po wdrożeniu.

Zachowaj przepływ **komponent → hook TanStack Query → serwis → pośrednik panelu → API**. Komponenty nie wywołują bezpośrednio `fetch`. Używaj Mantine i obecnych ikon Tabler; nie przenoś do aplikacji osobnego systemu stylów i ikon z fragmentu demonstracyjnego.

## Kryteria gotowości

- [ ] Pulpit wizualnie odpowiada referencji, z obecnym nagłówkiem, menu i kolumną 640 px.
- [ ] Układ jest czytelny przy 320, 390, 768 i 1024 px; treść nie chowa się pod dolnym menu.
- [ ] Wszystkie liczby i zdjęcia pochodzą z rzeczywistych danych, bez treści demonstracyjnej w produkcji.
- [ ] Okres 7/30 dni zmienia oba kafelki sprzedaży i wykres; nie zmienia liczników bieżącej pracy.
- [ ] Opłacone i następnie wysłane zamówienie nadal jest liczone w sprzedaży; anulowane znika z niej.
- [ ] Kolejka ma właściwą kolejność po czasie zapłaty, niezależnie od daty złożenia zamówienia.
- [ ] Liczniki oraz agregacje są poprawne przy wielu pozycjach zamówienia i ponad jednej stronie wyników.
- [ ] Szkice zgadzają się z menu i ekranem szkiców, a link „gotowe” otwiera odpowiedni zbiór.
- [ ] Kliknięcia prowadzą do działających widoków albo rozwijają właściwą listę.
- [ ] Działają stany pusty, ładowania i błędu oraz wymagane ograniczenia dostępu.
- [ ] Nowa logika agregacji ma istotne testy API: statusy, historyczne ceny, ilości, granice czasu, brak podwójnego sumowania i uprawnienia. Uruchom właściwe testy API w skonfigurowanym środowisku testowym.
- [ ] Przechodzą `pnpm --filter @record-shop/admin lint` i `pnpm --filter @record-shop/admin build`; sprawdź formatowanie zmienionych plików.
- [ ] Po wdrożeniu krótko opisz zmiany, wykonane sprawdzenia i ewentualne pozostałe ograniczenia.
