# Stan projektu i co dalej

Podsumowanie sesji z 2026-11-08 i 2026-11-09. Punkt startowy dla kolejnych sesji: najpierw ten plik, potem
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

### Dokumenty

- `docs/sprzedaz.md`: plan etapu sprzedaży (pulpit, zamówienia, Stripe, InPost, kolejność prac).
- `docs/audit/ADMIN_FRONTEND_AUDIT.md`: audyt panelu (jak zadanie rekrutacyjne), porównanie ze wzorcem, lista
  poprawek i postęp.
- `apps/admin/README.md`, `apps/admin/NOTES.md` (zaktualizowane notatki z budowy API).

## Stan na koniec sesji

- `main` na GitHubie: `04448ee feat(admin): add product view`.
- **Niezacommitowane (dodane do gita):** wzór moro na logowaniu i w nagłówku, „nasz biały” w motywie, linki
  zewnętrzne zawsze w nowej karcie (`components/ui/ExternalLink.tsx`), strażnik sesji przepuszcza pliki statyczne,
  bez gwiazdek przy polach logowania. Do zacommitowania na początku następnej sesji.
- Baza deweloperska ma dane demo: 20 okładek z Facebooka RasBass (podpięte do produktów 32–50 i 6), zamówienia 1–4
  Alice (opłacone, czekające, anulowane), szkice z testów kreatora. Po resecie bazy wróci sam seed.

## Do zrobienia (według audytu i planu sprzedaży)

1. **Kreator: zachowanie pracy** przy wygaśnięciu sesji, geście wstecz i odświeżeniu (stan w reducerze, szkic w
   `sessionStorage`, kroki w adresie, ostrzeżenie przed wyjściem).
2. **Zapis bez duplikatów** (po utworzeniu produktu dalsze kroki tylko go uzupełniają).
3. **Dodanie jako wariant istniejącej płyty** (kreator wykrywa duplikaty, ale tworzy nowy produkt) i **walidacja
   kroku 3**.
4. **Bezpieczeństwo:** `trust proxy` i przekazywanie IP do API (limit logowania), nagłówki ochronne, sprawdzanie
   `Origin` w pośredniku.
5. **Testy panelu:** Vitest + Testing Library, Playwright dla ścieżki „zdjęcie → publikacja”.
6. Widok produktu: dodawanie wariantu, zdjęcie główne (API nie odznacza poprzedniego), edycja notatki i tracklisty.
7. Etap sprzedaży: wiadomości z szablonami, Stripe, InPost, powiadomienia (`docs/sprzedaz.md`).
8. Ustawienia w panelu (klucze Claude/Discogs, test połączenia) i ostrzeżenie o brakujących kluczach.

## Uwagi praktyczne

- Uruchomienie: `docker compose up -d`, `pnpm dev:api` (:3000), `pnpm dev:admin` (:3001); logowanie
  `bob@example.com` / `alamakota` (dane startowe).
- Kontenery Dockera należą do projektu Compose ze starego katalogu (`ecommerce-api`); `docker compose up` w
  `RecordShop` zgłasza konflikt nazw i założył pusty wolumen `recordshop_postgres_data`. Dane są w starym wolumenie.
  Do naprawy: nazwa projektu w `docker-compose.yml` albo przeniesienie danych.
- Nowe sesje otwierać w folderze `RecordShop`, po jednej na zadanie (krótsza rozmowa = mniej tokenów).
