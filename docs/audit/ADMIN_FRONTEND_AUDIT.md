# Audyt panelu admina (apps/admin)

Data: 2026-11-09. Stan: `main` @ `cd1074a`. Zakres: cały kod `apps/admin` (ok. 2900 linii), build, zależności, przebieg
pracy. Ocena pisana tak, jakby to było zadanie rekrutacyjne na stanowisko frontend developera.

## Werdykt

**Nie do przyjęcia jako skończone zadanie.** Kod się buduje (`next build`, `tsc`, `eslint` czyste), wygląda porządnie
na telefonie, a kreator dodawania płyty działa na prawdziwym API. Ale panel nie spełnia podstawowej funkcji panelu
admina, a kilka ścieżek prowadzi do utraty danych albo zduplikowanych produktów. Nie ma ani jednego testu.

Najpoważniejsze w jednym zdaniu: **szkicu nie da się w panelu dokończyć ani opublikować, a kreator łatwo gubi pracę
i tworzy duplikaty.**

## Krytyczne

1. **Brak widoku produktu: szkiców nie da się dokończyć, niczego nie da się edytować.**
   Zakładka „Szkice” nazywa się „Dokończ dodawanie”, ale wiersze prowadzą donikąd (`/szkice#id`, `/produkty#id`,
   `components/ProductsList.tsx:74`). Brak edycji, publikacji szkicu, usuwania, zmiany ceny i ilości, zarządzania
   zdjęciami. „Zapisz jako szkic” w kreatorze tworzy więc rekord, którego z panelu nie da się ruszyć.

2. **Kreator gubi całą pracę.** Stan żyje tylko w pamięci komponentu:
   - wygaśnięcie tokenu (JWT ważny 1 h) robi `window.location.assign("/login?expired=1")` (`lib/api.ts:20`), czyli
     pełne przeładowanie i utratę zdjęć, danych, stanu i notatki z tłumaczeniem; notatki do panelu wprost wymagały
     zachowania niezapisanego formularza;
   - systemowe „wstecz” w przeglądarce albo gest wstecz na Androidzie wychodzi z kreatora (kroki nie są w adresie);
   - odświeżenie strony i brak ostrzeżenia `beforeunload`.
     Na telefonie, w sklepie przy skrzynce z płytami, to jest główny scenariusz, nie przypadek brzegowy.

3. **Duplikaty produktów przy zapisie.** `SummaryStep.save` (`components/wizard/SummaryStep.tsx:106`) robi po kolei:
   utworzenie produktu, wgrywanie zdjęć, publikację. Gdy coś padnie po utworzeniu (zdjęcie, publikacja, sieć), widać
   błąd i przycisk dalej działa: kolejne kliknięcie tworzy **drugi** produkt. Brak idempotencji i brak stanu „produkt
   już zapisany, dokończ publikację”.

4. **Wykryte duplikaty są ignorowane.** Krok 3 pokazuje „Ta płyta może już być w sklepie”
   (`components/wizard/DetailsStep.tsx:141`), ale zapis zawsze tworzy nowy produkt. Specyfikacja (`NOTES.md`, punkt 3)
   wymagała dodania wariantu do istniejącego produktu. Funkcja, która ostrzega i nic z tym nie pozwala zrobić.

5. **Brak walidacji kroku 3.** Pusty format, pusty artysta czy tytuł, rok „19x9” przechodzą dalej, a błąd wychodzi
   dopiero w podsumowaniu jako angielski komunikat API ze ścieżką typu `variants.0.attributes.format`
   (`SummaryStep.tsx:43`). Format jest w API wymagany, a w formularzu domyślnie pusty przy wpisywaniu ręcznym.

## Poważne

6. **Bezpieczeństwo: limit logowania w API trafia w serwer panelu.** Logowanie idzie przez serwer Next
   (`app/api/auth/login/route.ts`), a API liczy limit 10 prób na 15 minut po IP (`apps/api/src/routes/authentication.routes.ts:8`)
   bez `trust proxy` i bez przekazania `X-Forwarded-For`. Wszyscy logujący się przez panel dzielą jeden licznik:
   ktokolwiek z dostępem do strony logowania może zablokować właścicielowi wejście do panelu dziesięcioma próbami.

7. **Bezpieczeństwo: brak nagłówków ochronnych.** Panel nie ustawia `X-Frame-Options`/`frame-ancestors` ani CSP
   (`next.config.ts` bez `headers()`), więc da się go osadzić w ramce na obcej stronie (clickjacking przycisków
   „Opublikuj”, „Anuluj zamówienie”). Pośrednik `/api/proxy` przyjmuje POST bez sprawdzenia nagłówka `Origin`;
   chroni go tylko `SameSite=Lax`, co nie obejmuje subdomen tej samej domeny.

8. **Komunikaty błędów po angielsku i surowe.** `api()` rzuca `message` z API wprost („Order not found”,
   „Cannot cancel an order that is shipped”, „Invalid query parameters”). Panel jest po polsku, a błędy walidacji z
   `errors[]` nie są mapowane na pola formularzy, choć notatki to zalecały.

9. **Typy pisane ręcznie** (`lib/types.ts`, 170 linii) zamiast wygenerowanych z `/api-docs.json`, jak zalecały notatki.
   Odpowiedzi API są rzutowane bez sprawdzenia (`return body as T`). Rozjazd z API wyjdzie dopiero w działaniu.

10. **Wydajność na telefonie: miniatury to oryginały.** Listy pokazują pliki z `/uploads` w pełnym rozmiarze
    (do 2000 px, setki KB) jako awatary 91 px (`components/records.tsx:28`, `orders/OrdersDashboard.tsx`).
    Lista 20 płyt na mobilnym łączu to kilka MB. `next/image` albo miniatury w API rozwiązałyby to od ręki.

11. **Obcięte listy.** Pulpit pobiera `limit=50` bez stronicowania (`orders/OrdersDashboard.tsx:14`): licznik pokazuje
    prawdziwą liczbę zamówień, a lista po cichu kończy się na 50.

12. **Błędy zdjęć połykane.** `shrinkPhoto` w `add()` (`PhotoStep.tsx:70`, `PhotosStep.tsx:71`) nie ma obsługi błędu.
    Plik, którego przeglądarka nie zdekoduje (np. HEIC na Androidzie albo w Chrome na komputerze), kończy się
    nieobsłużonym odrzuceniem obietnicy: nic się nie dzieje i nie ma komunikatu.

13. **Martwe i niedokończone miejsca w nawigacji.** „Ustawienia” to pusta strona, a ostrzeżenie o brakujących
    kluczach Claude/Discogs zniknęło razem z pulpitem: nie ma dziś w panelu żadnego miejsca, które powie, że
    integracje nie działają. „Zamówienia (wkrótce)” w menu bocznym (`components/nav.ts:12`), choć zamówienia już są na
    pulpicie. „Wyślij” otwiera okno „powstanie w kolejnym etapie”, więc opłacone zamówienia nie mają jak opuścić listy.

## Architektura: brak warstwy danych

**Nie ma serwisów API ani hooków do danych.** Jedynym wspólnym elementem jest `api()` w `lib/api.ts`. Reszta
siedzi w komponentach:

- adresy endpointów i parametry sklejane w JSX-owych plikach: `ProductsList.tsx`, `OrdersDashboard.tsx`,
  `OrderDetail.tsx`, `SummaryStep.tsx`, `ConditionStep.tsx`, `AddRecordWizard.tsx`, `PanelShell.tsx`;
- `PhotoStep.tsx:80` omija nawet `api()` i woła `fetch("/api/proxy/...")` z własną obsługą 401;
- klucze zapytań TanStack Query wpisywane ręcznie i niespójnie (`["products","list",…]`,
  `["products","count","draft"]`, `["orders",status,sort]`, `["order",id]`, `["me"]`), a unieważnianie po zapisie
  trafia „na oko” (`["products"]`, `["orders"]`);
- wieloetapowy zapis płyty (utworzenie, zdjęcia, publikacja) jest w komponencie podsumowania zamiast w jednej
  operacji `createRecord()`;
- hooki `useMe` i `useDraftCount` są zdefiniowane w pliku komponentu `PanelShell.tsx`.

Skutki: tej samej rzeczy (np. listy produktów) nie da się pobrać w drugim miejscu bez kopiowania adresu i klucza,
zmiana endpointu w API wymaga szukania po komponentach, a komponentów nie da się testować bez prawdziwego `fetch`.

Oczekiwany układ (np. per funkcja):

```
src/features/products/api.ts      // listManaged, getManaged, create, publish, uploadMedia: czyste funkcje, typowane
src/features/products/queries.ts  // productKeys + useProducts, useProduct, useCreateRecord, usePublishProduct
src/features/orders/{api,queries}.ts
src/features/lookup/{api,queries}.ts   // odczyt zdjęcia, szukanie na Discogs, tłumaczenie notatki
src/features/session/{api,queries}.ts  // useMe, logout
```

Komponenty wołają tylko hooki; klucze z jednej fabryki (`productKeys.list(filters)`, `productKeys.all`) dają
spójne unieważnianie.

## Porównanie ze wzorcem (coalition-technologies-test)

Wzorzec dostarczony przez właściciela (Next 16, React 19, TypeScript, Tailwind 4) pokazuje oczekiwany styl TS i HTML.

| Obszar         | Wzorzec                                                                                                                                                                                                                                      | Panel                                                                                                                                                                                                             |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Warstwa danych | `services/patient.services.ts` (fetch, mapowanie odpowiedzi), `hooks/usePatients.ts` (stan ładowania i błędu), `context/ContentProvider.tsx` (szkielet, błąd, pusty stan)                                                                    | brak: zapytania w komponentach                                                                                                                                                                                    |
| Typy           | `types/patient.ts` z typami domeny; każdy komponent ma nazwany `type XProps` nad sobą                                                                                                                                                        | typy w jednym `lib/types.ts`; **0** nazwanych typów `…Props`, propsy opisane w sygnaturze funkcji                                                                                                                 |
| Komponenty     | jeden komponent na plik (`PatientItem`, `MenuItem`, `Title`, `LevelIndicator`), małe podkomponenty obok (`DetailItem`)                                                                                                                       | pliki po 200–300 linii z kilkoma komponentami i logiką (`ConditionStep`, `SummaryStep`, `OrderDetail`)                                                                                                            |
| HTML           | `header`, `main`, `section aria-labelledby` + `h2 id`, `aside`, `dl/dt/dd` dla par etykieta–wartość, `ul/li` dla list, `table` z `th scope`, `button type="button"`, `aria-current`, `aria-label` na przyciskach z ikoną, `alt=""` dla ozdób | w treści stron **0** elementów semantycznych: listy płyt i zamówień to `div` w `Stack`, dane kupującego to luźne `Text`, brak `section`/`aria-labelledby` (landmarki `header`/`nav`/`main` daje tylko `AppShell`) |
| Stany          | szkielet z `role="status"` + `aria-live` i tekstem `sr-only`, błąd z `role="alert"`, pusty stan z `role="status"`                                                                                                                            | `Skeleton` bez roli i bez tekstu dla czytnika; puste stany jako zwykły tekst                                                                                                                                      |
| Wygląd         | tokeny z projektu w CSS (`layout-variables.css`, `@theme`), nazwane style tekstu (`card-title-24pt`, `body-emphasized-14pt`)                                                                                                                 | liczby wpisane w propsach (`fz={24}`, `size={91}`), brak nazwanych stylów tekstu                                                                                                                                  |
| Narzędzia      | Prettier + `eslint-config-prettier`, README z uruchomieniem, strukturą katalogów i zachowaniem na szerokościach                                                                                                                              | brak Prettiera i README panelu                                                                                                                                                                                    |

**Decyzja (2026-11-09):** panel zostaje przy Mantine. Ze wzorca bierzemy konwencje TS i HTML, nie Tailwinda:
semantyczne elementy przez `component=` i `ul/li`/`dl`/`table`, tokeny i nazwane style tekstu w motywie Mantine.

Czego **nie** przenosić ze wzorca: dane logowania w zmiennych `NEXT_PUBLIC_*` (trafiają do przeglądarki; w panelu
token zostaje na serwerze), ręczne `useEffect` do pobierania (panel ma TanStack Query, hooki powinny go owijać),
cała strona jako komponent kliencki, wybór pacjenta po indeksie w tablicy.

## Jakość kodu

14. **Brak testów.** Zero testów jednostkowych, komponentów i e2e. Scenariusze end-to-end w repo dotyczą tylko API
    (`apps/api/e2e`, Jest + supertest). Kreator z sześcioma krokami i logiką „wstecz/dalej” bez jednego testu to dla rekrutera
    czerwona flaga.
15. **Stan kreatora rozproszony w kilkunastu `useState`** (`AddRecordWizard.tsx`), a `reset()` (linia 81) ręcznie
    wylicza każdy setter: dodanie pola bez dopisania go do `reset` zostawi dane poprzedniej płyty. To jest przypadek
    na `useReducer` (albo maszynę stanów) z jednym obiektem stanu.
16. **Brak tokenów projektu.** Rozmiary i odstępy są wpisane na sztywno w wielu plikach (`fz={24}`, `fz={20}`,
    `size={91}`, `py={24}`). Zmiany typu „+20% miniatur” czy „większy font” robione były zamianą tekstu w plikach.
    Powinny być w motywie (`theme.ts`) albo w jednym komponencie wiersza.
17. **Duplikacja.** Dwa podglądy zdjęć (`Thumb` w `PhotoStep.tsx` i `PhotoTile`/`usePreview` w `PhotosStep.tsx`), dwa
    prawie identyczne wiersze listy (`RecordRow` i `OrderRow`), stała ciasteczka w dwóch miejscach (`proxy.ts:3` i
    `lib/server/session.ts`).
18. **Martwy kod:** `ColorSchemeToggle.tsx` nieużywany, reguły ciemnego motywu w `globals.css`, `upcomingItems`.
19. **Drobne błędy logiki:** `daysSince` liczy pełne 24 godziny, nie dni kalendarzowe („opłacone dziś” dla wpłaty
    sprzed 23 h z wczoraj); logowanie zamienia każdy błąd API (także 500 i awarię) na „Nieprawidłowy e-mail lub hasło”
    (`login/route.ts:19`); niepoprawny JSON w żądaniu logowania kończy się 500 (`login/route.ts:5`).
20. **Dokumentacja rozjechana z kodem.** `apps/admin/NOTES.md` nadal opisuje Vite i token w `sessionStorage`.
    Brak README panelu (jak uruchomić, `API_URL`, logowanie). `AGENTS.md` wygenerowany przez `next dev` trafił do repo.
21. **Formatowanie niespójne.** Brak Prettiera w panelu (jeden plik został raz sformatowany ręcznie), linie po
    150+ znaków obok krótkich.

## Przebieg pracy (to, co rekruter zobaczyłby w historii)

- **Projekt UI oddany walkowerem.** Pierwszy pulpit był generycznym „dashboardem z kafelkami”, wariant B był po prostu
  zły (ukryty gest przesunięcia do publikacji, brak nawigacji). Dobry kierunek przyszedł od Ciebie (makieta z GPT).
- **Błędy wyłapywał użytkownik, nie ja.** Ucięte napisy, licznik kroków nie na środku, za mały tekst, plakietki
  łamiące się w wąskiej kolumnie, brak „dalej” po „wstecz”: wszystko było widoczne na moich własnych zrzutach, a
  zgłoszone dopiero przez Ciebie.
- **Testy w przeglądarce przez wstrzykiwanie JS** (ustawianie plików i wartości pól skryptem) zamiast prawdziwych
  kliknięć. Klawiatura numeryczna, aparat i gesty nie zostały sprawdzone na żadnym urządzeniu.
- **Edycje przez `perl`/`sed` na kodzie** kilka razy uszkodziły pliki (wklejony fragment w pierwszej linii, rozbita
  funkcja), naprawiane w kolejnych krokach.
- **Decyzje w biegu bez zapisania ich na początku:** Vite → Next, ciemny → tylko jasny, cena z centami → pełne euro →
  z centami. Zapis decyzji przed kodem oszczędziłby te zawrotki.
- **Nigdy nie uruchomiony `next build`** aż do tego audytu (przechodzi, ale to szczęście, a nie proces).

## Co jest dobre

- Architektura logowania: token w ciasteczku `httpOnly`, przeglądarka nie zna tokenu ani adresu API, brak CORS.
- Mobile first jest realny: duże cele dotyku, dolne menu, czytelny tekst, jedna kolumna.
- Kreator rozwiązuje prawdziwy problem (zdjęcie → Claude → Discogs) i ma przemyślane ścieżki awaryjne: brak
  wyników, awaria integracji, poprawienie odczytu bez ponownego płatnego wywołania, zdjęcie zmniejszane w przeglądarce.
- TanStack Query użyte sensownie (unieważnianie list po zapisie i anulowaniu).
- Zmiany po stronie API szły z testami (testy jednostkowe i API dla wyszukiwania i zamówień).

## Co poprawić, w kolejności

1. Widok produktu: edycja, publikacja szkicu, warianty, zdjęcia, usuwanie (krytyczne 1).
2. Warstwa danych i konwencje jak we wzorcu: `services/*.services.ts`, `hooks/use*.ts` (na TanStack Query),
   `types/` per domena, nazwane `type XProps`, jeden komponent na plik, semantyczny HTML z ARIA, Prettier.
3. Kreator: stan w jednym reducerze, zapis szkicu formularza (np. `sessionStorage` + zdjęcia jako `photoUploadIds`),
   kroki w adresie, ostrzeżenie przed wyjściem, odnowienie sesji bez przeładowania (krytyczne 2, jakość 15).
4. Zapis idempotentny: po utworzeniu produktu dalsze kroki tylko go uzupełniają (krytyczne 3).
5. „Dodaj jako wariant istniejącej płyty” (krytyczne 4) i walidacja kroku 3 (krytyczne 5).
6. Bezpieczeństwo: `trust proxy` i przekazywanie IP do API, nagłówki ochronne, sprawdzanie `Origin` (6, 7).
7. Testy: Vitest + Testing Library dla kroków kreatora, Playwright dla ścieżki „zdjęcie → publikacja” z atrapą API.
8. Komunikaty po polsku i mapowanie `errors[]` na pola; typy z OpenAPI; miniatury; stronicowanie pulpitu.
9. Porządki: tokeny w motywie, wspólne komponenty wiersza i podglądu, martwy kod, Prettier, README panelu, aktualne
   `NOTES.md`.

## Postęp poprawek

**2026-11-09: warstwa danych i konwencje (punkt 2).**

- `services/*.services.ts` (jedyny kod rozmawiający z API, przez `services/http.ts`), `hooks/` na TanStack Query z
  fabryką kluczy `hooks/queryKeys.ts`, typy domeny w `types/`. Komponenty nie wołają `fetch` ani nie sklejają
  adresów; zapis płyty to jeden hook `useCreateRecord`.
- Jeden komponent na plik z nazwanym `type XProps`; logika kreatora wydzielona do `details.ts`, `condition.ts`,
  `recordInput.ts`.
- Semantyczny HTML: sekcje z `aria-labelledby`, listy `ul/li`, dane kupującego i podsumowanie jako `dl`, grupy
  wyboru jako `fieldset/legend`, formularze kroków jako `form`; szkielety z `role="status"`, błędy z `role="alert"`;
  menu z `aria-current` i osobnymi nazwami („Menu boczne”, „Menu dolne”).
- Rozmiary tekstu i nagłówków jako tokeny w motywie; jeden komponent miniatury.
- Prettier + `eslint-config-prettier`, README panelu, poprawione `NOTES.md`; usunięty martwy kod.
- Przy okazji: wybór zdjęcia, którego przeglądarka nie odczyta, pokazuje komunikat (punkt 12).
- **Błąd znaleziony przy sprawdzaniu:** cena z groszami (np. 18,50) blokowała krok 4 („Wpisz cenę”), bo Mantine
  oddaje ułamki jako tekst. Poprawione w `condition.ts` (`toCents`).

Pozostałe punkty listy (widok produktu, kreator, zapis idempotentny, duplikaty, walidacja, bezpieczeństwo, testy)
nadal otwarte.
