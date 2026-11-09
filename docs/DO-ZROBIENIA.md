# Do zrobienia: zebrane z planów i notatek

Stan na 2026-11-09. Lista zebrana z: `docs/STATUS.md`, `docs/sprzedaz.md`, `docs/pulpit-claude.md`,
`docs/audit/ADMIN_FRONTEND_AUDIT.md`, `apps/api/TODO.md`, `apps/api/README.md`, `apps/admin/NOTES.md`.
Ten plik to jedno miejsce do aktualizacji. Gdy coś zostanie zrobione, odhaczać tutaj i w pliku źródłowym.

## 1. Eksport zamówień i wysyłka plików (najbliżej)

- [ ] **Google Drive:** zapis eksportu (PDF/CSV) na Dysk Google w wybranym folderze. Wymaga konta usługi Google
      i udostępnienia folderu temu kontu. Osobny krok po zakomitowaniu eksportu.
- [ ] **Arkusze Google:** historia zamówień w arkuszu (wysyłka ręczna, nadpisuje zakładkę). Ten sam konto usługi.
- [ ] **iCloud:** brak publicznego API do zapisu z serwera. Do rozstrzygnięcia: pobranie pliku na telefon
      i zapis w aplikacji Pliki (iCloud Drive) jako wystarczające rozwiązanie.
- [ ] **Mail z eksportem:** ustawić `ORDERS_EXPORT_EMAIL` i dane SMTP Gmaila w `apps/api/.env` (hasło aplikacji
      z Google, wpisuje właściciel). Obecnie SMTP wskazuje na lokalny Mailpit.
- [ ] **Dokument pojedynczego zamówienia** (PDF z widoku zamówienia, np. do paczki). Odłożone.
- [ ] **Sprawdzić PDF wizualnie** (na tym Macu nie ma narzędzia do renderowania PDF).
- [ ] Zakomitować historię zamówień i eksport (zmiany niezakomitowane).

## 2. Pulpit (`docs/pulpit-claude.md`)

- [ ] Sprawdzić pulpit na szerokościach 390, 768 i 1024 px oraz w ciemnym motywie (sprawdzone tylko 320 i ok. 800).
- [ ] Sprawdzić na prawdziwych zamówieniach, nie na danych dev.
- [ ] Decyzja: czy szkic bez odsłuchu ma być wykluczony z „gotowe do publikacji” (obecnie tylko ostrzeżenie).
- [ ] Klikanie kafelka „Sprzedane sztuki” prowadzi do historii; sprawdzić w przeglądarce.

## 3. Paleta kolorów panelu (druga sesja, niezakomitowana)

- [ ] Zakomitować `apps/admin/src/lib/admin-palette.ts`, `theme.ts` i pliki `docs/admin-palette.*`.
      Commit pulpitu (`663de5c`) i historii używa nazw `danger`, `warning`, `success` z tej palety.

## 4. Sklep i API

- [ ] Sklep (`apps/shop`, port 3002) jeszcze nie jest zbudowany poza szkieletem.
- [ ] Koszyk, zamówienia i płatności Stripe (zamówienie zmienia status po webhooku, zwrot przy anulowaniu).
- [ ] Rezerwacja egzemplarza w koszyku: na jak długo, i blokada sprzedaży tego samego egzemplarza dwóm osobom.
- [ ] Kody rabatowe (tylko procentowe, na całe zamówienie, data ważności, limit użyć).
- [ ] Wysyłka InPost (paczkomat wybiera klient, etykieta z panelu, numer śledzenia). Koszt zależny od formatu
      i liczby płyt. Przewoźnik dla krajów poza InPost: do ustalenia.
- [ ] Wiadomości do klienta z szablonami i historią przy zamówieniu (mail przy zmianie statusu).
- [ ] Powiadomienie właściciela o nowym opłaconym zamówieniu.
- [ ] Czy klient może anulować sam przed wysyłką: do decyzji.
- [ ] VAT i sprzedaż za granicę (OSS): skonsultować z księgowym.
- [ ] Discogs: obowiązkowy dopisek „Data provided by Discogs.” z linkiem bez `nofollow`; notka w regulaminie.
- [ ] Ustawienia w panelu (klucze Claude/Discogs, test połączenia, ostrzeżenie o brakujących kluczach).
- [ ] Filtry wariantów na liście produktów (stan, cena, ilość, np. 0 sztuk), z endpointem listy wariantów w API.

## 5. Dane produktów i kreator

- [ ] Widok produktu: dodawanie wariantu bez kreatora, edycja notatki i tracklisty.
- [ ] Płyty sprzed migracji 021 nie mają głównego zdjęcia (panel pokazuje zdjęcie wariantu).
- [ ] Kreator: ostrzeżenie przed wyjściem, kroki w adresie, walidacja kroku 3.
- [ ] Duplikaty: podobne nazwy dla płyt bez danych z Discogs (`pg_trgm`); uzupełnić master i numery artystów
      w starych płytach.
- [ ] Discogs nie zawsze podaje prędkość; panel może uzupełnić ją z odczytu zdjęcia (przykład ZV-7-006).
- [ ] Sprawdzić w przeglądarce: powiększenie zdjęcia i „Ustaw jako główne”, powrót na to samo miejsce listy,
      link do Discogs. Okładki bez `alt` dalej pokazują przycisk pobierania.
- [ ] Gatunki, SKU, artyści per utwór, wyszukiwanie w API YouTube.
- [ ] Odsłuch z własnych nagrań: konwersja ffmpeg (MP3 128 kbps, fragment 30–60 s, wyciszenie, normalizacja
      głośności), osobny wyższy limit rozmiaru dla audio, test konwersji (`test-audio.wav`).
- [ ] Panel z kreatorem jako osobne repo po API (do rozważenia).

## 6. Bezpieczeństwo, jakość i produkcja

- [ ] Panel: `trust proxy` i przekazywanie IP do API (limit logowania), nagłówki ochronne (CSP, `X-Frame-Options`),
      sprawdzanie `Origin` w pośredniku.
- [ ] Panel: komunikaty błędów po polsku (API odpowiada po angielsku, panel pokazuje je wprost).
- [ ] Panel: typy generowane z `/api-docs.json` zamiast pisanych ręcznie (audyt 9).
- [ ] Panel: miniatury zdjęć zamiast oryginałów na listach (audyt 10).
- [ ] Panel: testy (Vitest + Testing Library, Playwright dla ścieżki „zdjęcie → publikacja”). Audyt 14: brak testów.
- [ ] Panel: `NOTES.md` nadal opisuje Vite i token w `sessionStorage` (audyt 20).
- [ ] Panel: Prettier w całym panelu i sprzątanie martwego kodu (`ColorSchemeToggle.tsx`, `upcomingItems`).
- [ ] Ostrzeżenie `eslint` w `apps/admin/src/app/login/page.tsx` (nieużywany `Text`).
- [ ] API: `deepmerge`, `glob`/`minimatch` w `swagger-jsdoc` (poprawka wymaga zmiany głównej wersji `glob`).
- [ ] API: zmiany głównych wersji `dotenv` 18 i TypeScript 7, osobno z przeczytaniem listy zmian.
- [ ] API: przejść na `toLoggableError` we wszystkich `console.error` (Redis, NBP, ustawienia, migracje).
- [ ] API: testy obciążeniowe (k6 lub autocannon) przed produkcją.
- [ ] Przygotowanie do produkcji: build, Docker, health check, logi.
- [ ] Pliki: przejście z `LocalStorage` na R2 lub S3; `url` mediów jako pełny adres; nazwy plików jako UUID.
- [ ] Docker: konflikt nazw kontenerów ze starym projektem `ecommerce-api` (dane w starym wolumenie).

## 7. Audyt panelu (`docs/audit/ADMIN_FRONTEND_AUDIT.md`)

Zrobione według postępu w pliku: widok produktu (punkt 1), warstwa danych i konwencje (punkt 2).
Pozostałe punkty listy są oznaczone w pliku audytu jako otwarte, poza tym częściowo zrobione przy kreatorze:

- [ ] 2. Kreator gubi pracę (częściowo: szkic zapisuje się od kroku 3, ostrzeżenie przed wyjściem otwarte).
- [ ] 3–4. Duplikaty przy zapisie i ignorowane wykrycie (zrobione w większości, sprawdzić).
- [ ] 5. Walidacja kroku 3.
- [ ] 6–7. Limit logowania i nagłówki ochronne (patrz sekcja 6).
- [ ] 8. Komunikaty po polsku.
- [ ] 11. Obcięte listy: pulpit już stronicuje; sprawdzić resztę.
- [ ] 12. Błędy zdjęć połykane (`shrinkPhoto` w kreatorze).
- [ ] 13. Martwe miejsca w nawigacji: „Ustawienia” nadal bez treści.
- [ ] 15–18. Stan kreatora w jednym obiekcie, tokeny motywu, duplikacja podglądów zdjęć.
- [ ] 19. `daysSince` liczy pełne 24 godziny, nie dni kalendarzowe (wpływa na „opłacone dziś”).
- [ ] 21. Formatowanie panelu (patrz sekcja 6).

## 8. Zasady, które obowiązują przy tych zadaniach

- Commity tylko na wyraźną prośbę, podpisane jako Mac Umatik, bez atrybucji Claude.
- Nic nie zmieniać bez wyraźnego polecenia w etapie planowania.
- Nowe pliki w repo od razu `git add`.
- Panel: mobile first, rozmiary tekstu z motywu, komponenty przez hooki i serwisy, bez `fetch` w komponentach.
