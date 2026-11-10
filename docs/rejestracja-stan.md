# Rejestracja w sklepie: stan na 2026-11-10

Notatka do wznowienia pracy w nowej sesji. Koszyk i konta klientów powstały w sesji z GPT, potem Claude
przetestował rejestrację i poprawił trzy braki. **Nic z tego nie jest zacommitowane.**

## Jak to jest zbudowane

**Sklep (`apps/shop`)**

- Strony `/[lang]/login` i `/[lang]/register` korzystają z jednego `src/components/LoginForm.tsx`
  (e-mail i hasło, przyciski Google i Apple ID).
- `src/app/api/account/[action]/route.ts`: `register`, `login`, `logout`, `session` oraz start logowania przez
  dostawcę; `[action]/callback/route.ts` kończy logowanie przez dostawcę.
- Token JWT z API siedzi w ciasteczku httpOnly `rasbass-shop-session` (`src/lib/shop-session.ts`).
- Stan sesji trzyma `CartProvider` w `src/components/CartPreview.tsx` (`SessionContext`: e-mail i `signOut`).
- Do rejestracji prowadzi ikona osoby w nagłówku albo koszyk → „Sign in” → „Register”. Po rejestracji wraca się
  do koszyka, od razu na dane wysyłki.

**API (`apps/api`)**

- `src/routes/customer-account.routes.ts`: `POST /customer/register`, `/customer/{google|apple}/start` i
  `/finish` (OIDC, `openid-client`). Logowanie hasłem idzie przez stare `POST /login`.
- Migracja 022: zamówienie bez konta (`orders.user_id` może być puste). Migracja 023: `customer_identities`,
  `customer_auth_attempts`, `customer_mail`. Obie są wgrane do bazy deweloperskiej.
- Maile klienta (powitalny, potwierdzenie zamówienia) idą przez kolejkę `customer_mail`
  (`src/services/customer-mail.ts`), którą `src/server.ts` opróżnia co 3 s.

## Co sprawdzone

Rejestracja e-mailem działa od formularza po mail w Mailpit (widok telefonu, `/en`):

- API: złe dane 400, poprawna rejestracja 201 z tokenem, zajęty adres 409 (także wielkimi literami), logowanie
  200, złe hasło 401, mail powitalny po polsku, angielsku i hiszpańsku.
- Sklep: rejestracja z koszyka, sesja po przeładowaniu strony, logowanie, wylogowanie, koszyk zalogowanego.

## Poprawki z 2026-11-10 (Claude)

- **Komunikaty błędów** w `LoginForm.tsx`: osobno zajęty adres (409), złe dane (400) i niedostępna usługa.
- **E-mail konta w danych wysyłki**: pole „Email” wypełnia się adresem konta, da się go zmienić.
- **Konto w nagłówku** (`HeaderCart` w `CartPreview.tsx`, style w `globals.css`): ikona osoby prowadzi do
  logowania, po zalogowaniu ikona wylogowuje jednym dotknięciem (sklep nie ma jeszcze strony konta).
- **Koszyk w nagłówku poniżej 420 px** to sama ikona z liczbą, bo z ikoną konta nagłówek nie mieścił się na
  ekranie 375 px.

`tsc` w sklepie przechodzi.

## Otwarte

- [x] `pnpm shop lint`: błąd w `src/app/Storefront.tsx` (zapis `document.cookie`, `react-hooks/immutability`)
      naprawiony przez przeniesienie zapisu do `saveViewCookie` poza komponent. Lint przechodzi.
- [x] `pnpm shop build` przechodzi (2026-11-10).
- [ ] Zamówienie złożone jako zalogowany klient nie było testowane.
- [ ] Google i Apple: brak `GOOGLE_*`, `APPLE_*` i `SHOP_ORIGIN` w `apps/api/.env`, przyciski kończą się
      komunikatem o niedostępności.
- [ ] Brak testów API dla `/customer/*`.
- [ ] `customer-account.routes.ts` ma SQL, bcrypt i JWT w jednym pliku, bez podziału na kontroler, serwis i
      repozytorium oraz bez opisu OpenAPI (wbrew konwencjom z `apps/api/CLAUDE.md`).
- [ ] Dwie ścieżki rejestracji: stare `POST /users/register` (wymaga danych kontaktowych, mail zawsze po polsku)
      i nowe `/customer/register`. Do decyzji, czy stara zostaje.
- [ ] Nikt nie potwierdza adresu e-mail przy rejestracji hasłem; nie ma resetu hasła.
- [ ] Ciasteczko sesji nie ma `maxAge`, więc sesja ginie po zamknięciu przeglądarki.
- [ ] `/customer/register` bez `locale` przyjmuje polski, choć sklep ma domyślnie angielski.
- [ ] Logo na stronie rejestracji: na jednym zrzucie z telefonu nie było go widać, niesprawdzone.
- [ ] Brak strony konta (dane, historia zamówień).
- [ ] `docs/STATUS.md` nie obejmuje koszyka ani kont.

## Uwagi do uruchamiania

- `pnpm dev:api` nie ma trybu watch: po zmianie kodu API trzeba je zatrzymać i uruchomić ponownie. Stary proces
  na porcie 3000 dawał 404 na `/customer/register` i mylący błąd w formularzu.
- W bazie deweloperskiej jest pięć kont testowych `reg-test-…@example.test` (id 15, 18, 19, 20 i jedno późniejsze)
  oraz ich maile w Mailpit. Można je usunąć.
