# Stan sklepu (shop + konta klientów)

Notatka do wznowienia pracy w nowym czacie. Stan na 2026-11-10.

## Gdzie jesteśmy

- Gałąź: `storefront-accounts-cart` (wypchnięta do `origin`), ostatni commit `d622ade`.
  Pull request jeszcze nie otwarty: https://github.com/umatik/record-shop/pull/new/storefront-accounts-cart
- `main` nie był ruszany. Nic nie jest niezacommitowane.
- Commity na gałęzi (od najstarszego): `b95bca3` (konta, koszyk, rejestracja), `d622ade` (strona konta,
  historia zamówień, menu konta, odstępy między przyciskami).

## Co działa

**Rejestracja** (`/[lang]/register`): react-hook-form + zod. Dane kontaktowe jak w koszyku (imię i nazwisko
osobno, e-mail, telefon, ulica, kod i miejscowość w jednym wierszu, kraj z listy), hasło i potwierdzenie.
Sprawdzanie zajętego e-maila po wyjściu z pola. Po rejestracji ekran „Dziękujemy”. Formularz wypełnia się
danymi z zamówienia, jeśli klient przeszedł z koszyka (przez `sessionStorage`, nie przez URL).

**Logowanie** (`/[lang]/login`): e-mail, Google, Apple ID (Google i Apple wymagają kluczy w `apps/api/.env`,
których jeszcze nie ma, przyciski pokazują komunikat o niedostępności). Błędy na górze karty, link
„Nie pamiętam hasła”. X wraca w historii przeglądarki. Po zalogowaniu klient trafia na stronę główną.

**Reset hasła**: `/[lang]/forgot-password` i `/[lang]/reset-password?token=…`. API: `/customer/password-reset/request`
i `/confirm`. Token jednorazowy, ważny godzinę, zapisany jako skrót SHA-256. Mail idzie przez kolejkę
`customer_mail`, którą `server.ts` opróżnia co 3 s. Odpowiedź jest taka sama, czy konto istnieje, czy nie.

**Koszyk** (karta, styl jak logowanie): ilość przyciskami − i + oraz polem tylko z cyframi, limit to stan
magazynowy. Miniatury okładek (56 px w koszyku, 80 px na podsumowaniu), płyta bez zdjęcia dostaje ikonę zastępczą.
Dostawa z listy rozwijanej. Krok „Dane do wysyłki” wypełnia się danymi konta po zalogowaniu. Podsumowanie
z danymi wysyłki w dwóch kolumnach. „Usuń koszyk” czyści koszyk i wraca na stronę główną.

**Konto** (`/[lang]/account`, menu w nagłówku z „Moje dane” i „Wyloguj się”): edytowalne dane wysyłki,
historia zamówień, usuwanie konta z potwierdzeniem. Usunięcie jest miękkie: `is_deleted`, e-mail zmieniany
na `deleted-<id>@deleted.invalid`, dane kontaktowe i tokeny usuwane, zamówienia zostają. Logowanie zablokowane.

**Odstępy**: dwa przyciski lub linki pod sobą mają 16 px (reguły na końcu `globals.css`).

## Ważne decyzje

- Zmiana danych nie wysyła maila. Pole e-mail jest tylko do odczytu, a endpoint przyjmuje tylko pola danych
  wysyłki. Sprawdzone: podrobione żądanie z innym e-mailem i polami `isAdmin`/`userId` nic nie zmieniło.
- Stan magazynowy: zamówienie zmniejsza stan przy składaniu, anulowanie i usunięcie go przywracają
  (`restoreStock` w `order-postgres.repository.ts`).
- Zamówienia nie zostały zaciągane do historii konta gościa. Historia pokazuje tylko zamówienia z `user_id`.

## Otwarte

- Google i Apple: brak `GOOGLE_*`, `APPLE_*` i `SHOP_ORIGIN` w `apps/api/.env`.
- Testy API dla `/customer/*` (rejestracja, reset, dane, zamówienia, usuwanie konta). Dotąd tylko ręczne curl.
- Podział `customer-account.routes.ts` na kontroler, serwis i repozytorium oraz opis OpenAPI (wbrew
  `apps/api/CLAUDE.md`).
- Dwie ścieżki rejestracji: stara `POST /users/register` i nowa `/customer/register`. Do decyzji, czy stara zostaje.
- Reset hasła: limit 60 zapytań na 15 minut z IP. Można wysłać mail na cudzy adres, więc warto limit na adres.
- Token JWT działa do wygaśnięcia po usunięciu konta (logowanie już zablokowane).
- Dane osobowe w zamówieniach (`shipping` JSON) zostają po usunięciu konta.
- Okładki: zdjęcie w koszyku zapisuje się przy dodawaniu. Stare pozycje w koszyku w przeglądarce mogą
  nie mieć okładki, dopóki nie zostaną dodane ponownie.
- Przy zmianie danych nie wysyłamy maila (świadoma decyzja, na razie).
- Wcześniejsza lista z `docs/rejestracja-stan.md` nadal aktualna w punktach o testach i strukturze routes.

## Dev

- API: `pnpm dev:api` (port 3000), bez trybu watch: po zmianie kodu trzeba zrestartować.
- Sklep: `pnpm --filter @record-shop/shop dev` (port 3002).
- Baza dev zawiera konta testowe `reg-test-…@example.test`, `tamper-…@example.test` i `reg-test-del-…`.
  Można je usunąć. Zamówienia w bazie dev zostały wyczyszczone (2026-11-10), stany przywrócone.
- Lint i typy: `pnpm --filter @record-shop/shop lint`, `npx tsc --noEmit` w `apps/shop` i `apps/api`.
