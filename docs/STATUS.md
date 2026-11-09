# Stan projektu i co dalej

Podsumowanie sesji z 2026-11-08 i 2026-11-09 (dwie sesje tego dnia). Punkt startowy dla kolejnych sesji: najpierw ten plik, potem
`docs/sprzedaz.md` (plan etapu sprzedaży) i `docs/audit/ADMIN_FRONTEND_AUDIT.md` (audyt panelu i lista poprawek).

## Co zrobiliśmy

### Repozytorium

- Nowe repo `umatik/record-shop` (lokalnie `/Volumes/Storage/Documents/Code/RecordShop`) z historią brancha `rassba`
  starego `ecommerce-api`. Stare repo zostaje jako projekt do nauki.
- Monorepo na pnpm workspaces: `apps/api` (API), `apps/admin` (panel), `docs/` (plany, audyty).
- Commity tylko po zgodzie, podpisane jako Mac Umatik, bez atrybucji Claude.

### API (`apps/api`)

- Wyszukiwanie na Discogs: tytuł z każdym odczytanym artystą osobno, potem tytuł z wytwórnią i sam tytuł;
  „none” z Discogs to brak numeru katalogowego. `GET /products/lookup` przyjmuje też artystę i tytuł (ponowne
  wyszukanie po poprawionym odczycie, bez płatnego odczytu zdjęcia).
- Zamówienia w panelu: statusy `pending → paid → shipped → delivered`, `cancelled` (migracja 018, czasy zmian,
  powód anulowania), uprawnienie `orders:manage`, endpointy `GET /orders/manage`, `GET /orders/manage/{id}`,
  `POST /orders/{id}/mark-paid`, `POST /orders/{id}/cancel`.
- Testy: 473 (stan po zmianach zamówień).

### Panel admina (`apps/admin`)

Next.js 16, Mantine 9, TanStack Query; mobile first; konwencje według wzorca `coalition-technologies-test`
(opisane w `apps/admin/README.md`).

- Logowanie przez serwer panelu (token w ciasteczku `httpOnly`, pośrednik `/api/proxy`).
- **Pulpit „Do wysłania”**: opłacone zamówienia od najstarszych z czasem oczekiwania, „Czeka na płatność”.
- **Widok zamówienia**: kupujący, płyty, Oznacz jako opłacone, Anuluj z powodem, Napisz (mail), Wyślij (zaślepka).
- **Produkty i Szkice**: listy z wyszukiwaniem i „Pokaż więcej”.
- **Widok produktu** (`/produkty/{id}`): publikacja i wycofanie, dane płyty, linki do odsłuchu, warianty (zdjęcia,
  stan, cena, ilość, usuwanie), usuwanie produktu.
- **Kreator „Dodaj płytę”** (6 kroków): zdjęcie labelu z aparatu albo pliku → odczyt Claude + Discogs (z poprawą
  odczytu i ponownym wyszukaniem) → dane → stan i cena (z tłumaczeniem notatki) → zdjęcia → zapis szkicu albo
  publikacja; Wstecz/Dalej bez gubienia wpisanych danych.
- Warstwa danych: `services/` (jedyny kod rozmawiający z API), `hooks/` (TanStack Query, klucze w
  `hooks/queryKeys.ts`), `types/`. Jeden komponent na plik, semantyczny HTML z ARIA, tokeny w motywie, Prettier.
- Wygląd: geometryczne moro (`public/patterns/camo.svg` z `scripts/generate-camo.mjs`) na logowaniu i w nagłówku;
  „nasz biały” `#eff1e9` jako `white` w motywie (`src/lib/theme.ts`); akcje niebieskie, szkice i braki żółte.

### Sesja 2026-11-09 (po południu): szkice kreatora, duplikaty, widok produktu

Zaczęło się od przeglądu zmian zrobionych z GPT (trwałe szkice kreatora, dodawanie wariantu do istniejącej płyty)
i ich poprawek. Pierwsza część jest w commicie `48acc3c`, reszta czeka na commit (zob. „Stan na koniec sesji”).

**API**

- **Szkice kreatora** (migracje 019, 020): zdjęcia labelu z odczytu są oczekujące i same znikają po 24 h. Szkic
  powstaje dopiero przy kroku „Sprawdź dane”: `PUT /products/lookup/drafts/{id}` z `{ photoUploadIds, state }`
  zabiera oczekujące zdjęcia i zapisuje stan kreatora (`wizard_state`). Lista i wznowienie: `GET …/drafts`,
  `GET …/drafts/{id}`; usuwanie: `DELETE …/drafts/{id}`. Szkic nieruszany 30 dni usuwa się sam
  (`draft_saved_at`). Zdjęcia szkicu zabiera zapis płyty. Kod: `LabelDraftService` + `LabelDraftRepository`.
- **Główne zdjęcie produktu** (migracja 021, `products.primary_photo_url`): przy tworzeniu z kreatora kopia
  pierwszego zdjęcia labelu (osobny plik). Dodanie wariantu go nie zmienia, chyba że płyta nie ma żadnego.
  Podmiana: `PUT /products/{id}/photo` (pole `image`). `Storage` ma `copy()`.
- **Wykrywanie duplikatów** (`findMatchingProducts`): oprócz tego samego wydania i numeru katalogowego także
  master release z Discogs (`discogs_master`) oraz tytuł (tylko strona A, przed „/”, bez znaków) z artystą po
  nazwie (bez „*”, „(2)”, spacji) albo po numerze artysty z Discogs. Master i numery artystów zapisują się w
  atrybutach produktu (`discogsMasterId`, `discogsArtistIds`). Sprawdzone na 6 wydaniach Ijahman Levi „Moulding”
  (dwa różne mastery, wspólny numer artysty). Płyty sprzed zmiany mają tylko porównanie nazw.
- Linki do odsłuchu z Discogs bez powtórzeń (duplikat powodował błąd kluczy w panelu).
- Testy: 497.

**Panel**

- **Kreator:** szkic zapisuje się na kroku 3 i po kroku 4, wznowienie przez `/dodaj?szkic={id}` (otwiera się na
  kroku 3). Krok 3 to tylko artysta i tytuł; tłoczenie (wytwórnia, numer, rok, format, prędkość) jest w kroku 4
  „Wariant”. Przy duplikacie: ramka z tekstem i przyciskiem „Nowy produkt” / „Dodaj jako wariant” (bez radia),
  dane płyty jako tekst w wierszach z linią. Krok 2: przycisk ponownego odczytu labelu obok tytułu. Krok 5:
  „Dalej: podsumowanie”. Po zapisie: „Zobacz produkt”.
- **Szkice:** lista łączy szkice kreatora i produkty-szkice, każdy wiersz z przyciskami edytuj i usuń
  (z potwierdzeniem).
- **Produkty:** po prawej liczba sztuk (`3 szt.`), na miniaturze plakietka z liczbą wariantów.
- **Widok produktu:** status obok „← Produkty” (link podkreślany przy najechaniu), główne zdjęcie w nagłówku
  (dotknięcie je podmienia), sekcje w akordeonie (Płyta, Odsłuch, Warianty otwarte domyślnie, Ustawienia z
  wycofaniem i usuwaniem), bez wcięć z boków. Warianty jako wiersze z linią (tłoczenie, stan, cena, sztuki);
  kliknięcie otwiera edycję, w której są też zdjęcia (zapis od razu) i usuwanie wariantu.
- **Wygląd:** kolory moro jako zmienne CSS (`--camo-charcoal`, `--camo-dark-olive`, `--camo-olive`,
  `--camo-khaki`) z `src/lib/camo-colors.json`; miniatury z obrysem `--camo-charcoal` z odstępem.

### Dokumenty

- `docs/sprzedaz.md`: plan etapu sprzedaży (pulpit, zamówienia, Stripe, InPost, kolejność prac).
- `docs/audit/ADMIN_FRONTEND_AUDIT.md`: audyt panelu (jak zadanie rekrutacyjne), porównanie ze wzorcem, lista
  poprawek i postęp.
- `apps/admin/README.md`, `apps/admin/NOTES.md` (zaktualizowane notatki z budowy API).

## Stan na koniec sesji

- `main` lokalnie: `48acc3c feat: keep wizard label photos as resumable drafts` (jeden commit przed GitHubem,
  niewypchnięty). **Reszta zmian z popołudnia nie jest zacommitowana** (API i panel, migracje 020 i 021 dodane do
  gita); przed commitem warto przejrzeć diff.
- Baza deweloperska: produkty i szkice wyczyszczone w trakcie sesji, teraz 1 produkt (Misty In Roots, 3 warianty).
  Migracje do 021 zastosowane w bazie dev i testowej. Zamówienia z demo zostały.

## Do zrobienia (według audytu i planu sprzedaży)

1. **Commit zmian z popołudnia** (po przejrzeniu) i push.
2. **Kreator:** szkic działa od kroku 3; zostaje ostrzeżenie przed wyjściem, kroki w adresie i walidacja kroku 3.
   Stare szkice z wersji GPT (bez stanu) otwierają się na kroku ze zdjęciem.
3. **Duplikaty:** podobne nazwy dla płyt bez danych z Discogs (`pg_trgm`, tylko podpowiedź); uzupełnienie
   mastera i numerów artystów w starych płytach. Bez radia kreator bierze zawsze najlepsze dopasowanie.
4. **Bezpieczeństwo:** `trust proxy` i przekazywanie IP do API (limit logowania), nagłówki ochronne, sprawdzanie
   `Origin` w pośredniku.
5. **Testy panelu:** Vitest + Testing Library, Playwright dla ścieżki „zdjęcie → publikacja”.
6. Widok produktu: dodawanie wariantu bez kreatora, edycja notatki i tracklisty. Płyty sprzed migracji 021 nie
   mają głównego zdjęcia (panel pokazuje zdjęcie wariantu).
7. Etap sprzedaży: wiadomości z szablonami, Stripe, InPost, powiadomienia (`docs/sprzedaz.md`).
8. Ustawienia w panelu (klucze Claude/Discogs, test połączenia) i ostrzeżenie o brakujących kluczach.

## Uwagi praktyczne

- Uruchomienie: `docker compose up -d`, `pnpm dev:api` (:3000), `pnpm dev:admin` (:3001); logowanie
  `bob@example.com` / `alamakota` (dane startowe).
- Kontenery Dockera należą do projektu Compose ze starego katalogu (`ecommerce-api`); `docker compose up` w
  `RecordShop` zgłasza konflikt nazw i założył pusty wolumen `recordshop_postgres_data`. Dane są w starym wolumenie.
  Do naprawy: nazwa projektu w `docker-compose.yml` albo przeniesienie danych.
- API (`tsx` bez obserwowania plików) trzeba restartować po zmianach w kodzie API.
- Panel pokazuje komunikaty błędów z API wprost, a API odpowiada po angielsku.
- Ostrzeżenie `eslint` w `apps/admin/src/app/login/page.tsx` (nieużywany `Text`) po ręcznym usunięciu podpisu.
- Nowe sesje otwierać w folderze `RecordShop`, po jednej na zadanie (krótsza rozmowa = mniej tokenów).
